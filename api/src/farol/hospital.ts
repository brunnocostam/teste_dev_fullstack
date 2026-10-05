import { plural, worstColor, type FarolColor, type FarolResult } from './color';

/** Farol do hospital: pior caso entre os departamentos, com resumo da contagem. */
export function classifyHospital(departmentColors: FarolColor[]): FarolResult & { reason: string } {
  const color = worstColor(departmentColors);
  const critical = departmentColors.filter((c) => c === 'red').length;
  const attention = departmentColors.filter((c) => c === 'yellow').length;

  const parts = [];
  if (critical > 0) parts.push(plural(critical, 'departamento crítico', 'departamentos críticos'));
  if (attention > 0) {
    // Com críticos antes, "departamentos" já foi dito: "2 departamentos críticos e 1 em alerta".
    parts.push(critical > 0 ? `${attention} em alerta` : plural(attention, 'departamento em alerta', 'departamentos em alerta'));
  }

  return { color, reason: parts.length > 0 ? parts.join(' e ') : 'Todos os departamentos em ordem' };
}
