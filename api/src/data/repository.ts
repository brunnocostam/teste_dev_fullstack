import type { Db } from '../db';

export interface DepartmentCapacityRow {
  id: number;
  name: string;
  totalBeds: number;
  occupiedBeds: number;
  doctors: number;
  nurses: number;
}

/** Internação ativa com os indicadores que o farol precisa. */
export interface ActiveAdmissionRow {
  id: number;
  departmentId: number;
  patientName: string;
  bed: number;
  admittedAt: Date;
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

export interface HospitalRepository {
  departmentCapacity(departmentId?: number): Promise<DepartmentCapacityRow[]>;
  activeAdmissions(departmentId?: number): Promise<ActiveAdmissionRow[]>;
  examFunnel(lateAfterHours: number, departmentId?: number): Promise<ExamFunnelRow>;
  avgLengthOfStayDays(): Promise<number | null>;
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

// Para cada internação ativa: a última medição de sinais vitais e as horas
// desde a solicitação de cada exame ainda não concluído (LATERAL = subconsulta
// por linha, aproveitando os índices por admission_id).
const ACTIVE_ADMISSIONS_SQL = `
  SELECT a.id,
         a.department_id                 AS "departmentId",
         p.name                          AS "patientName",
         a.bed_number                    AS bed,
         a.admission_date                AS "admittedAt",
         v.heart_rate                    AS "heartRate",
         v.oxygen_saturation             AS "oxygenSaturation",
         v.temperature::float8           AS temperature,
         v.systolic_pressure             AS "systolicPressure",
         coalesce(e.hours, '{}')         AS "pendingExamHours"
  FROM admissions a
  JOIN patients p ON p.id = a.patient_id
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
  WHERE a.status = 'internado'
    AND ($1::int IS NULL OR a.department_id = $1)
  ORDER BY a.id`;

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

export function createHospitalRepository(db: Db): HospitalRepository {
  return {
    async departmentCapacity(departmentId) {
      const { rows } = await db.query<DepartmentCapacityRow>(DEPARTMENT_CAPACITY_SQL, [departmentId ?? null]);
      return rows;
    },
    async activeAdmissions(departmentId) {
      const { rows } = await db.query<ActiveAdmissionRow>(ACTIVE_ADMISSIONS_SQL, [departmentId ?? null]);
      return rows;
    },
    async examFunnel(lateAfterHours, departmentId) {
      const { rows } = await db.query<ExamFunnelRow>(EXAM_FUNNEL_SQL, [lateAfterHours, departmentId ?? null]);
      return rows[0];
    },
    async avgLengthOfStayDays() {
      const { rows } = await db.query<{ days: number | null }>(AVG_LENGTH_OF_STAY_SQL);
      return rows[0]?.days ?? null;
    },
  };
}
