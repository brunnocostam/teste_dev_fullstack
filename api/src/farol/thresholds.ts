/**
 * Limites do Farol. Único lugar para ajustar as regras de cor.
 *
 * Faixas de sinais vitais inspiradas no NEWS2 (National Early Warning Score 2):
 * dentro de `green` é verde; fora de `green` mas dentro de `yellow` é amarelo;
 * fora de `yellow` é vermelho. Os limites são inclusivos.
 */
export interface Band {
  min: number;
  max: number;
}

export interface VitalThreshold {
  label: string;
  unit: string;
  green: Band;
  yellow: Band;
}

export const VITAL_THRESHOLDS = {
  heartRate: { label: 'FC', unit: 'bpm', green: { min: 51, max: 100 }, yellow: { min: 41, max: 130 } },
  oxygenSaturation: { label: 'Saturação', unit: '%', green: { min: 96, max: 100 }, yellow: { min: 92, max: 100 } },
  temperature: { label: 'Temperatura', unit: '°C', green: { min: 36.1, max: 38.0 }, yellow: { min: 35.1, max: 39.0 } },
  systolicPressure: { label: 'PA sistólica', unit: 'mmHg', green: { min: 111, max: 219 }, yellow: { min: 91, max: 219 } },
} as const satisfies Record<string, VitalThreshold>;

export type VitalSign = keyof typeof VITAL_THRESHOLDS;

/** Exame pendente: verde abaixo de `yellowFromHours`, vermelho acima de `redAboveHours`. */
export const EXAM_THRESHOLDS = {
  yellowFromHours: 12,
  redAboveHours: 24,
} as const;

/** Ocupação do departamento em %: verde abaixo de `yellowFromPct`, vermelho acima de `redAbovePct`. */
export const OCCUPANCY_THRESHOLDS = {
  yellowFromPct: 80,
  redAbovePct: 90,
} as const;

/** Carga da equipe (internações ativas por enfermeiro): verde até `greenMax`, amarelo até `yellowMax`. */
export const STAFF_LOAD_THRESHOLDS = {
  greenMax: 4,
  yellowMax: 6,
} as const;
