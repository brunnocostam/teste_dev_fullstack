import type {
  ActiveAdmissionRow,
  AdmissionFilters,
  AdmissionHeaderRow,
  AdmissionSituation,
  ClosedAdmissionRow,
  ExamRow,
  HospitalRepository,
  VitalSignsRow,
} from '../data/repository';
import {
  classifyAdmission,
  classifyPendingExam,
  classifyVital,
  classifyVitals,
  severity,
  VITAL_THRESHOLDS,
  type FarolColor,
  type LatestVitals,
  type VitalSign,
} from '../farol';

export interface AdmissionListQuery extends AdmissionFilters {
  status?: AdmissionSituation;
  page: number;
  pageSize: number;
}

export interface AdmissionListItem {
  id: number;
  patientName: string;
  departmentId: number;
  departmentName: string;
  bed: number;
  status: AdmissionSituation;
  farol: FarolColor;
  farolReason: string | null;
  admittedAt: Date;
  dischargedAt: Date | null;
  daysAdmitted: number;
}

function toVitals(row: Pick<VitalSignsRow, VitalSign>): LatestVitals {
  return {
    heartRate: row.heartRate,
    oxygenSaturation: row.oxygenSaturation,
    temperature: row.temperature,
    systolicPressure: row.systolicPressure,
  };
}

function activeItem(row: ActiveAdmissionRow): AdmissionListItem {
  const { color, reason } = classifyAdmission({
    situation: 'internado',
    latestVitals: toVitals(row),
    pendingExamHours: row.pendingExamHours,
  });
  return {
    id: row.id,
    patientName: row.patientName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    bed: row.bed,
    status: 'internado',
    farol: color,
    farolReason: reason,
    admittedAt: row.admittedAt,
    dischargedAt: null,
    daysAdmitted: row.daysAdmitted,
  };
}

function closedItem(row: ClosedAdmissionRow): AdmissionListItem {
  return { ...row, farol: 'neutral', farolReason: null };
}

/** Mais grave primeiro; empate por mais dias internado. */
function byGravity(a: AdmissionListItem, b: AdmissionListItem): number {
  return severity(b.farol) - severity(a.farol) || b.daysAdmitted - a.daysAdmitted || a.id - b.id;
}

/**
 * Lista paginada e ordenada por gravidade. Só internações ativas têm cor, e elas
 * são limitadas pelo número de leitos: vêm todas, são classificadas e ordenadas
 * aqui; as encerradas (neutras, sempre no fim) são paginadas pelo banco.
 * Ver docs/adr/0002-paginacao-por-gravidade.md.
 */
export async function listAdmissions(repo: HospitalRepository, query: AdmissionListQuery) {
  const { status, page, pageSize, ...filters } = query;
  const offset = (page - 1) * pageSize;

  const active =
    status === undefined || status === 'internado'
      ? (await repo.activeAdmissions(filters)).map(activeItem).sort(byGravity)
      : [];
  const activePage = active.slice(offset, offset + pageSize);

  let closed = { rows: [] as ClosedAdmissionRow[], total: 0 };
  if (status !== 'internado') {
    closed = await repo.closedAdmissions(
      { ...filters, status },
      pageSize - activePage.length,
      Math.max(0, offset - active.length),
    );
  }

  return {
    items: [...activePage, ...closed.rows.map(closedItem)],
    page,
    pageSize,
    total: active.length + closed.total,
  };
}

type ExamStatus = 'requested' | 'in_progress' | 'completed' | 'late';

const EXAM_STATUS: Record<ExamRow['status'], ExamStatus> = {
  solicitado: 'requested',
  em_andamento: 'in_progress',
  concluido: 'completed',
};

const EXAM_ORDER: ExamStatus[] = ['late', 'requested', 'in_progress', 'completed'];

function examStatus(exam: ExamRow): ExamStatus {
  if (exam.hoursPending !== null && classifyPendingExam(exam.hoursPending) === 'red') return 'late';
  return EXAM_STATUS[exam.status];
}

function referenceRanges() {
  const signs = Object.keys(VITAL_THRESHOLDS) as VitalSign[];
  return Object.fromEntries(signs.map((sign) => [sign, VITAL_THRESHOLDS[sign].green])) as Record<
    VitalSign,
    { min: number; max: number }
  >;
}

/** Cor de cada sinal da medição, para o front destacar só o que está fora da faixa. */
function assessVitals(row: VitalSignsRow): Partial<Record<VitalSign, FarolColor>> {
  const signs = Object.keys(VITAL_THRESHOLDS) as VitalSign[];
  return Object.fromEntries(
    signs.filter((sign) => row[sign] !== null).map((sign) => [sign, classifyVital(sign, row[sign] as number).color]),
  );
}

type TimelineType = 'admission' | 'exam' | 'alert' | 'discharge' | 'death';

interface TimelineEvent {
  at: Date;
  type: TimelineType;
  label: string;
  severity: FarolColor | null;
}

function buildTimeline(header: AdmissionHeaderRow, vitals: VitalSignsRow[], exams: ExamRow[]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { at: header.admittedAt, type: 'admission', label: `Entrada em ${header.departmentName}`, severity: null },
  ];

  for (const exam of exams) {
    events.push({ at: exam.requestedAt, type: 'exam', label: `${exam.name} solicitado`, severity: null });
    if (exam.resultAt) {
      const result = exam.result ? `: ${exam.result}` : ' concluído';
      events.push({ at: exam.resultAt, type: 'exam', label: `${exam.name}${result}`, severity: null });
    }
  }

  for (const measurement of vitals) {
    const { color, reason } = classifyVitals(toVitals(measurement));
    if (color !== 'green' && reason) events.push({ at: measurement.recordedAt, type: 'alert', label: reason, severity: color });
  }

  if (header.dischargedAt) {
    const death = header.status === 'obito';
    events.push({
      at: header.dischargedAt,
      type: death ? 'death' : 'discharge',
      label: death ? 'Óbito' : 'Alta',
      severity: null,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function toAdmissionDetail(header: AdmissionHeaderRow, vitals: VitalSignsRow[], exams: ExamRow[]) {
  const latest = vitals.at(-1) ?? null;
  const pendingExamHours = exams.flatMap((e) => (e.hoursPending === null ? [] : [e.hoursPending]));
  const farol = classifyAdmission({
    situation: header.status,
    latestVitals: latest && toVitals(latest),
    pendingExamHours,
  });

  return {
    id: header.id,
    status: header.status,
    farol: farol.color,
    farolReason: farol.reason,
    bed: header.bed,
    diagnosis: header.diagnosis,
    admittedAt: header.admittedAt,
    dischargedAt: header.dischargedAt,
    daysAdmitted: header.daysAdmitted,
    patient: { id: header.patientId, name: header.patientName, age: header.patientAge, gender: header.patientGender },
    department: { id: header.departmentId, name: header.departmentName },
    attendingStaff:
      header.staffId === null ? null : { id: header.staffId, name: header.staffName, role: header.staffRole },
    latestVitals: latest && { ...latest, farol: assessVitals(latest) },
    vitals,
    referenceRanges: referenceRanges(),
    exams: exams
      .map((exam) => ({
        id: exam.id,
        name: exam.name,
        status: examStatus(exam),
        requestedAt: exam.requestedAt,
        resultAt: exam.resultAt,
        result: exam.result,
        hoursPending: exam.hoursPending === null ? null : Math.floor(exam.hoursPending),
      }))
      .sort(
        (a, b) =>
          EXAM_ORDER.indexOf(a.status) - EXAM_ORDER.indexOf(b.status) ||
          b.requestedAt.getTime() - a.requestedAt.getTime(),
      ),
    timeline: buildTimeline(header, vitals, exams),
  };
}
