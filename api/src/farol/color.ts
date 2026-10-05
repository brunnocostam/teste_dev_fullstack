export type FarolColor = 'green' | 'yellow' | 'red' | 'neutral';

/** Cor e o motivo em uma frase curta (null quando não há o que explicar). */
export interface FarolResult {
  color: FarolColor;
  reason: string | null;
}

const SEVERITY: Record<FarolColor, number> = { neutral: 0, green: 1, yellow: 2, red: 3 };

export function severity(color: FarolColor): number {
  return SEVERITY[color];
}

/** Pior cor da lista; lista vazia é verde (nada a sinalizar). */
export function worstColor(colors: FarolColor[]): FarolColor {
  return colors.reduce<FarolColor>((worst, c) => (SEVERITY[c] > SEVERITY[worst] ? c : worst), 'green');
}

/** Combina indicadores: a cor é a pior, e o motivo junta os indicadores com essa cor. */
export function combine(results: FarolResult[]): FarolResult {
  const color = worstColor(results.map((r) => r.color));
  if (color === 'green') return { color, reason: null };

  const reasons = results.filter((r) => r.color === color && r.reason).map((r) => r.reason as string);
  return { color, reason: reasons.map((r, i) => (i === 0 ? r : continueSentence(r))).join(', ') };
}

/** "Ocupação 93%" vira "ocupação 93%" no meio da frase; siglas (FC, PA) ficam como estão. */
function continueSentence(text: string): string {
  const isAcronym = text.length > 1 && text[1] === text[1].toUpperCase() && text[1] !== text[1].toLowerCase();
  return isAcronym ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
