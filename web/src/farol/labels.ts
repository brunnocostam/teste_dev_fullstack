import type { FarolColor } from '../api/types';

/** Rótulo textual de cada cor: a cor nunca aparece sozinha (acessibilidade). */
export const FAROL_LABEL: Record<FarolColor, string> = {
  red: 'Crítico',
  yellow: 'Atenção',
  green: 'Tudo OK',
  neutral: 'Encerrada',
};
