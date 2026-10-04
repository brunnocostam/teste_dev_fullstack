import type { VitalSign } from './api/types';

/** Como exibir cada sinal vital (rótulo, unidade e casas decimais). */
export const VITAL_META: Record<VitalSign, { label: string; short: string; unit: string; decimals: number }> = {
  heartRate: { label: 'Frequência cardíaca', short: 'FC', unit: 'bpm', decimals: 0 },
  systolicPressure: { label: 'Pressão arterial', short: 'PA', unit: 'mmHg', decimals: 0 },
  temperature: { label: 'Temperatura', short: 'Temp', unit: '°C', decimals: 1 },
  oxygenSaturation: { label: 'Saturação de O₂', short: 'SpO₂', unit: '%', decimals: 0 },
};

export const VITAL_ORDER: VitalSign[] = ['heartRate', 'systolicPressure', 'temperature', 'oxygenSaturation'];

export function formatVital(sign: VitalSign, value: number): string {
  const { unit, decimals } = VITAL_META[sign];
  const number = value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return unit === '%' ? `${number}%` : `${number} ${unit}`;
}
