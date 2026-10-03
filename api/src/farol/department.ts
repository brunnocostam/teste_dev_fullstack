import { combine, formatNumber, plural, type FarolColor, type FarolResult } from './color';
import { OCCUPANCY_THRESHOLDS, STAFF_LOAD_THRESHOLDS } from './thresholds';

export interface DepartmentIndicators {
  totalBeds: number;
  occupiedBeds: number;
  nurses: number;
  /** Cor do farol de cada internação ativa do departamento. */
  admissionColors: FarolColor[];
}

export function classifyOccupancy(occupiedBeds: number, totalBeds: number): FarolResult {
  const pct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
  const reason = `Ocupação ${Math.round(pct)}%`;

  if (pct > OCCUPANCY_THRESHOLDS.redAbovePct) return { color: 'red', reason };
  if (pct >= OCCUPANCY_THRESHOLDS.yellowFromPct) return { color: 'yellow', reason };
  return { color: 'green', reason: null };
}

export function classifyStaffLoad(activeAdmissions: number, nurses: number): FarolResult {
  if (activeAdmissions === 0) return { color: 'green', reason: null };
  if (nurses === 0) return { color: 'red', reason: 'Sem enfermeiro no quadro' };

  const load = activeAdmissions / nurses;
  const reason = `${formatNumber(load)} pacientes por enfermeiro`;

  if (load > STAFF_LOAD_THRESHOLDS.yellowMax) return { color: 'red', reason };
  if (load > STAFF_LOAD_THRESHOLDS.greenMax) return { color: 'yellow', reason };
  return { color: 'green', reason: null };
}

export function classifyAdmissionsMix(admissionColors: FarolColor[]): FarolResult {
  const critical = admissionColors.filter((c) => c === 'red').length;
  if (critical > 0) return { color: 'red', reason: plural(critical, 'paciente crítico', 'pacientes críticos') };

  const attention = admissionColors.filter((c) => c === 'yellow').length;
  if (attention > 0) return { color: 'yellow', reason: plural(attention, 'paciente em atenção', 'pacientes em atenção') };

  return { color: 'green', reason: null };
}

/** Farol do departamento: pior entre ocupação, carga da equipe e internações ativas. */
export function classifyDepartment(indicators: DepartmentIndicators): FarolResult {
  return combine([
    classifyAdmissionsMix(indicators.admissionColors),
    classifyOccupancy(indicators.occupiedBeds, indicators.totalBeds),
    classifyStaffLoad(indicators.admissionColors.length, indicators.nurses),
  ]);
}
