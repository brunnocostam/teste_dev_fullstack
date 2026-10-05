import type { Db } from '../db';
import type { AdmissionSituation } from '../farol';

export interface DepartmentCapacityRow {
  id: number;
  name: string;
  totalBeds: number;
  occupiedBeds: number;
  doctors: number;
  nurses: number;
}

/** Filtros da listagem de internações (todos opcionais). from/to filtram a data de entrada (AAAA-MM-DD). */
export interface AdmissionFilters {
  departmentId?: number;
  search?: string;
  from?: string;
  to?: string;
}

/** Internação ativa com os indicadores que o farol precisa. */
export interface ActiveAdmissionRow {
  id: number;
  departmentId: number;
  departmentName: string;
  patientName: string;
  bed: number;
  admittedAt: Date;
  daysAdmitted: number;
  heartRate: number | null;
  oxygenSaturation: number | null;
  temperature: number | null;
  systolicPressure: number | null;
  pendingExamHours: number[];
}

export interface ExamFunnelRow {
  requested: number;
  inProgress: number;
  completed: number;
  late: number;
}

/** Internação encerrada (alta ou óbito): farol neutro, então não precisa de indicadores. */
export interface ClosedAdmissionRow {
  id: number;
  departmentId: number;
  departmentName: string;
  patientName: string;
  bed: number;
  status: 'alta' | 'obito';
  admittedAt: Date;
  dischargedAt: Date | null;
  daysAdmitted: number;
}

export interface AdmissionHeaderRow {
  id: number;
  status: AdmissionSituation;
  bed: number;
  diagnosis: string | null;
  admittedAt: Date;
  dischargedAt: Date | null;
  daysAdmitted: number;
  patientId: number;
  patientName: string;
  patientAge: number;
  patientGender: 'M' | 'F';
  departmentId: number;
  departmentName: string;
  staffId: number | null;
  staffName: string | null;
  staffRole: string | null;
}

export interface VitalSignsRow {
  recordedAt: Date;
  heartRate: number | null;
  systolicPressure: number | null;
  diastolicPressure: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
}

export interface ExamRow {
  id: number;
  name: string;
  status: 'solicitado' | 'em_andamento' | 'concluido';
  requestedAt: Date;
  resultAt: Date | null;
  result: string | null;
  /** Horas desde a solicitação; null quando concluído. */
  hoursPending: number | null;
}

export interface HospitalRepository {
  departmentCapacity(departmentId?: number): Promise<DepartmentCapacityRow[]>;
  activeAdmissions(filters?: AdmissionFilters): Promise<ActiveAdmissionRow[]>;
  closedAdmissions(
    filters: AdmissionFilters & { status?: 'alta' | 'obito' },
    limit: number,
    offset: number,
  ): Promise<{ rows: ClosedAdmissionRow[]; total: number }>;
  examFunnel(lateAfterHours: number, departmentId?: number): Promise<ExamFunnelRow>;
  avgLengthOfStayDays(): Promise<number | null>;
  admissionHeader(id: number): Promise<AdmissionHeaderRow | null>;
  admissionVitals(id: number): Promise<VitalSignsRow[]>;
  admissionExams(id: number): Promise<ExamRow[]>;
}

// Leitos ocupados e equipe são agregados em CTEs separadas antes do JOIN,
// para que um não multiplique as linhas do outro.
const DEPARTMENT_CAPACITY_SQL = `
  WITH occupancy AS (
    SELECT department_id, count(DISTINCT bed_number) AS occupied
    FROM admissions
    WHERE status = 'internado'
    GROUP BY department_id
  ),
  team AS (
    SELECT department_id,
           count(*) FILTER (WHERE role = 'médico')     AS doctors,
           count(*) FILTER (WHERE role = 'enfermeiro') AS nurses
    FROM staff
    GROUP BY department_id
  )
  SELECT d.id,
         d.name,
         d.total_beds                     AS "totalBeds",
         coalesce(o.occupied, 0)::int     AS "occupiedBeds",
         coalesce(t.doctors, 0)::int      AS doctors,
         coalesce(t.nurses, 0)::int       AS nurses
  FROM departments d
  LEFT JOIN occupancy o ON o.department_id = d.id
  LEFT JOIN team t      ON t.department_id = d.id
  WHERE $1::int IS NULL OR d.id = $1
  ORDER BY d.id`;

const DAYS_ADMITTED = `floor(extract(epoch FROM coalesce(a.discharge_date, now()) - a.admission_date) / 86400)::int`;

/**
 * Fuso em que o gestor pensa os dias. O banco guarda horários em UTC (TIMESTAMP
 * sem fuso, gravado com NOW() de um servidor em UTC), então o dia escolhido no
 * filtro é convertido para o intervalo UTC correspondente. Ver docs/adr/0003.
 */
const HOSPITAL_TIME_ZONE = 'America/Sao_Paulo';

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Monta as condições dos filtros, acrescentando os valores em `params` (SQL sempre parametrizado). */
function filterConditions(filters: AdmissionFilters, params: unknown[]): string[] {
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const conditions: string[] = [];

  if (filters.departmentId !== undefined) conditions.push(`a.department_id = ${param(filters.departmentId)}`);
  if (filters.search) conditions.push(`p.name ILIKE ${param(`%${escapeLike(filters.search)}%`)}`);
  // Período pela data de entrada, em dias de Brasília, com o dia final inteiro incluído
  // (ver docs/adr/0003). A conversão é feita no parâmetro, não na coluna, para não
  // impedir o uso de índice em admission_date.
  if (filters.from || filters.to) {
    const zone = param(HOSPITAL_TIME_ZONE);
    // Meia-noite do dia em Brasília, expressa em UTC (o mesmo formato da coluna).
    const midnightUtc = (dayExpr: string) => `(${dayExpr}::timestamp AT TIME ZONE ${zone}) AT TIME ZONE 'UTC'`;
    if (filters.from) conditions.push(`a.admission_date >= ${midnightUtc(`${param(filters.from)}::date`)}`);
    if (filters.to) conditions.push(`a.admission_date < ${midnightUtc(`(${param(filters.to)}::date + 1)`)}`);
  }

  return conditions;
}

// Para cada internação ativa: a última medição de sinais vitais e as horas
// desde a solicitação de cada exame ainda não concluído (LATERAL = subconsulta
// por linha, aproveitando os índices por admission_id).
function activeAdmissionsSql(where: string[]): string {
  return `
  SELECT a.id,
         a.department_id                 AS "departmentId",
         d.name                          AS "departmentName",
         p.name                          AS "patientName",
         a.bed_number                    AS bed,
         a.admission_date                AS "admittedAt",
         ${DAYS_ADMITTED}                AS "daysAdmitted",
         v.heart_rate                    AS "heartRate",
         v.oxygen_saturation             AS "oxygenSaturation",
         v.temperature::float8           AS temperature,
         v.systolic_pressure             AS "systolicPressure",
         coalesce(e.hours, '{}')         AS "pendingExamHours"
  FROM admissions a
  JOIN patients p    ON p.id = a.patient_id
  JOIN departments d ON d.id = a.department_id
  LEFT JOIN LATERAL (
    SELECT heart_rate, oxygen_saturation, temperature, systolic_pressure
    FROM vital_signs
    WHERE admission_id = a.id
    ORDER BY measured_at DESC
    LIMIT 1
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT array_agg((extract(epoch FROM now() - requested_at) / 3600)::float8) AS hours
    FROM exams
    WHERE admission_id = a.id
      AND status IN ('solicitado', 'em_andamento')
  ) e ON true
  WHERE ${['a.status = \'internado\'', ...where].join('\n    AND ')}
  ORDER BY a.id`;
}

// Encerradas (farol neutro): mais recentes primeiro.
function closedAdmissionsSql(where: string[], limitParam: string, offsetParam: string): string {
  return `
  SELECT a.id,
         a.department_id      AS "departmentId",
         d.name               AS "departmentName",
         p.name               AS "patientName",
         a.bed_number         AS bed,
         a.status,
         a.admission_date     AS "admittedAt",
         a.discharge_date     AS "dischargedAt",
         ${DAYS_ADMITTED}     AS "daysAdmitted"
  FROM admissions a
  JOIN patients p    ON p.id = a.patient_id
  JOIN departments d ON d.id = a.department_id
  WHERE ${where.join('\n    AND ')}
  ORDER BY a.discharge_date DESC NULLS LAST, a.id DESC
  LIMIT ${limitParam} OFFSET ${offsetParam}`;
}

function closedCountSql(where: string[]): string {
  return `
  SELECT count(*)::int AS total
  FROM admissions a
  JOIN patients p ON p.id = a.patient_id
  WHERE ${where.join('\n    AND ')}`;
}

// Exames das internações ativas, por etapa. "late" é subconjunto dos pendentes.
const EXAM_FUNNEL_SQL = `
  SELECT count(*) FILTER (WHERE e.status = 'solicitado')::int   AS requested,
         count(*) FILTER (WHERE e.status = 'em_andamento')::int AS "inProgress",
         count(*) FILTER (WHERE e.status = 'concluido')::int    AS completed,
         count(*) FILTER (
           WHERE e.status <> 'concluido'
             AND e.requested_at < now() - make_interval(hours => $1::int)
         )::int                                                 AS late
  FROM exams e
  JOIN admissions a ON a.id = e.admission_id
  WHERE a.status = 'internado'
    AND ($2::int IS NULL OR a.department_id = $2)`;

// Tempo médio só das internações encerradas (as ativas ainda não têm duração final).
const AVG_LENGTH_OF_STAY_SQL = `
  SELECT round((avg(extract(epoch FROM discharge_date - admission_date)) / 86400)::numeric, 1)::float8 AS days
  FROM admissions
  WHERE status IN ('alta', 'obito')
    AND discharge_date IS NOT NULL`;

const ADMISSION_HEADER_SQL = `
  SELECT a.id,
         a.status,
         a.bed_number                              AS bed,
         a.diagnosis,
         a.admission_date                          AS "admittedAt",
         a.discharge_date                          AS "dischargedAt",
         ${DAYS_ADMITTED}                          AS "daysAdmitted",
         p.id                                      AS "patientId",
         p.name                                    AS "patientName",
         date_part('year', age(p.birth_date))::int AS "patientAge",
         p.gender                                  AS "patientGender",
         d.id                                      AS "departmentId",
         d.name                                    AS "departmentName",
         s.id                                      AS "staffId",
         s.name                                    AS "staffName",
         s.role                                    AS "staffRole"
  FROM admissions a
  JOIN patients p    ON p.id = a.patient_id
  JOIN departments d ON d.id = a.department_id
  LEFT JOIN staff s  ON s.id = a.attending_staff_id
  WHERE a.id = $1`;

const ADMISSION_VITALS_SQL = `
  SELECT measured_at          AS "recordedAt",
         heart_rate           AS "heartRate",
         systolic_pressure    AS "systolicPressure",
         diastolic_pressure   AS "diastolicPressure",
         temperature::float8  AS temperature,
         oxygen_saturation    AS "oxygenSaturation"
  FROM vital_signs
  WHERE admission_id = $1
  ORDER BY measured_at`;

const ADMISSION_EXAMS_SQL = `
  SELECT id,
         exam_type     AS name,
         status,
         requested_at  AS "requestedAt",
         result_at     AS "resultAt",
         result_value  AS result,
         CASE WHEN status <> 'concluido'
              THEN (extract(epoch FROM now() - requested_at) / 3600)::float8
         END           AS "hoursPending"
  FROM exams
  WHERE admission_id = $1
  ORDER BY requested_at`;

export function createHospitalRepository(db: Db): HospitalRepository {
  return {
    async departmentCapacity(departmentId) {
      const { rows } = await db.query<DepartmentCapacityRow>(DEPARTMENT_CAPACITY_SQL, [departmentId ?? null]);
      return rows;
    },
    async activeAdmissions(filters = {}) {
      const params: unknown[] = [];
      const where = filterConditions(filters, params);
      const { rows } = await db.query<ActiveAdmissionRow>(activeAdmissionsSql(where), params);
      return rows;
    },
    async closedAdmissions(filters, limit, offset) {
      const params: unknown[] = [filters.status ? [filters.status] : ['alta', 'obito']];
      const where = ['a.status = ANY($1::text[])', ...filterConditions(filters, params)];

      const count = await db.query<{ total: number }>(closedCountSql(where), params);
      const total = count.rows[0].total;
      if (limit === 0 || offset >= total) return { rows: [], total };

      const page = await db.query<ClosedAdmissionRow>(
        closedAdmissionsSql(where, `$${params.length + 1}`, `$${params.length + 2}`),
        [...params, limit, offset],
      );
      return { rows: page.rows, total };
    },
    async examFunnel(lateAfterHours, departmentId) {
      const { rows } = await db.query<ExamFunnelRow>(EXAM_FUNNEL_SQL, [lateAfterHours, departmentId ?? null]);
      return rows[0];
    },
    async avgLengthOfStayDays() {
      const { rows } = await db.query<{ days: number | null }>(AVG_LENGTH_OF_STAY_SQL);
      return rows[0]?.days ?? null;
    },
    async admissionHeader(id) {
      const { rows } = await db.query<AdmissionHeaderRow>(ADMISSION_HEADER_SQL, [id]);
      return rows[0] ?? null;
    },
    async admissionVitals(id) {
      const { rows } = await db.query<VitalSignsRow>(ADMISSION_VITALS_SQL, [id]);
      return rows;
    },
    async admissionExams(id) {
      const { rows } = await db.query<ExamRow>(ADMISSION_EXAMS_SQL, [id]);
      return rows;
    },
  };
}
