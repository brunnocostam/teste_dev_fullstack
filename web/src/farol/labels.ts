import type { AdmissionSituation, FarolColor } from '../api/types';

/** Rótulo textual de cada cor: a cor nunca aparece sozinha (acessibilidade). */
export const FAROL_LABEL: Record<FarolColor, string> = {
  red: 'Crítico',
  yellow: 'Atenção',
  green: 'Normal',
  neutral: 'Encerrada',
};

export const SITUATION_LABEL: Record<AdmissionSituation, string> = {
  internado: 'Internado',
  alta: 'Alta',
  obito: 'Óbito',
};
