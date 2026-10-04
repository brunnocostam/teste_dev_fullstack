const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatTime(date: Date | number): string {
  return timeFormat.format(date);
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** "04/09, 08:15" */
export function formatDateTime(iso: string | number): string {
  return dateTimeFormat.format(new Date(iso));
}
