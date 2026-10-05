import { combine, formatNumber, plural, type FarolResult } from './color';
import { EXAM_THRESHOLDS, VITAL_THRESHOLDS, type Band, type VitalSign } from './thresholds';

export type AdmissionSituation = 'internado' | 'alta' | 'obito';

export type LatestVitals = Partial<Record<VitalSign, number | null>>;

/** Extrai só os sinais que o farol avalia de uma linha com mais campos (ex.: linha do banco). */
export function pickVitals(row: Record<VitalSign, number | null>): LatestVitals {
  return {
    heartRate: row.heartRate,
    oxygenSaturation: row.oxygenSaturation,
    temperature: row.temperature,
    systolicPressure: row.systolicPressure,
  };
}

export interface AdmissionIndicators {
  situation: AdmissionSituation;
  /** Última medição de sinais vitais (null se nunca medido). */
  latestVitals: LatestVitals | null;
  /** Horas desde a solicitação de cada exame ainda não concluído. */
  pendingExamHours: number[];
}

function within(value: number, band: Band): boolean {
  return value >= band.min && value <= band.max;
}

export function classifyVital(sign: VitalSign, value: number): FarolResult {
  const t = VITAL_THRESHOLDS[sign];
  if (within(value, t.green)) return { color: 'green', reason: null };

  const reason = `${t.label} ${formatNumber(value)}${t.unit === '%' ? '%' : ` ${t.unit}`}`;
  return { color: within(value, t.yellow) ? 'yellow' : 'red', reason };
}

export function classifyVitals(vitals: LatestVitals | null): FarolResult {
  if (!vitals) return { color: 'green', reason: null };

  const results = (Object.keys(VITAL_THRESHOLDS) as VitalSign[])
    .filter((sign) => vitals[sign] != null)
    .map((sign) => classifyVital(sign, vitals[sign] as number));
  return combine(results);
}

export function classifyPendingExam(hoursPending: number): FarolResult['color'] {
  if (hoursPending > EXAM_THRESHOLDS.redAboveHours) return 'red';
  if (hoursPending >= EXAM_THRESHOLDS.yellowFromHours) return 'yellow';
  return 'green';
}

export function classifyPendingExams(pendingExamHours: number[]): FarolResult {
  const late = pendingExamHours.filter((h) => classifyPendingExam(h) === 'red').length;
  if (late > 0) return { color: 'red', reason: plural(late, 'exame atrasado', 'exames atrasados') };

  const waiting = pendingExamHours.filter((h) => classifyPendingExam(h) === 'yellow').length;
  if (waiting > 0) {
    const what = plural(waiting, 'exame pendente', 'exames pendentes');
    return { color: 'yellow', reason: `${what} há mais de ${EXAM_THRESHOLDS.yellowFromHours}h` };
  }

  return { color: 'green', reason: null };
}

/** Farol da internação: pior entre sinais vitais e exames; neutro se encerrada. */
export function classifyAdmission(indicators: AdmissionIndicators): FarolResult {
  if (indicators.situation !== 'internado') return { color: 'neutral', reason: null };

  return combine([
    classifyVitals(indicators.latestVitals),
    classifyPendingExams(indicators.pendingExamHours),
  ]);
}
