import { plural, worstColor, type FarolColor, type FarolResult } from './color';

/** Farol do hospital: pior caso entre os departamentos, com resumo da contagem. */
export function classifyHospital(departmentColors: FarolColor[]): FarolResult & { reason: string } {
  const color = worstColor(departmentColors);
  const critical = departmentColors.filter((c) => c === 'red').length;
  const attention = departmentColors.filter((c) => c === 'yellow').length;

  const parts = [];
  if (critical > 0) parts.push(plural(critical, 'departamento crítico', 'departamentos críticos'));
  if (attention > 0) parts.push(`${attention} em alerta`);

  return { color, reason: parts.length > 0 ? parts.join(' · ') : 'Todos os departamentos em ordem' };
}
