import { Check } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import styles from './PeriodFilter.module.css';

interface PeriodFilterProps {
  from?: string;
  to?: string;
  onApply: (from: string | undefined, to: string | undefined) => void;
}

/** Data de hoje no fuso local, no formato do input (AAAA-MM-DD). */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Período De/Até como rascunho: o calendário nativo dispara mudança a cada ajuste
 * (trocar o mês, o dia...), então só aplicamos ao sair do campo, no Enter ou no botão.
 */
export function PeriodFilter({ from, to, onApply }: PeriodFilterProps) {
  const [draftFrom, setDraftFrom] = useState(from ?? '');
  const [draftTo, setDraftTo] = useState(to ?? '');
  const [applied, setApplied] = useState({ from, to });

  // A URL é a fonte da verdade: se ela mudar (voltar, limpar), o rascunho acompanha.
  if (from !== applied.from || to !== applied.to) {
    setApplied({ from, to });
    setDraftFrom(from ?? '');
    setDraftTo(to ?? '');
  }

  const pending = draftFrom !== (from ?? '') || draftTo !== (to ?? '');
  const invalid = draftFrom !== '' && draftTo !== '' && draftFrom > draftTo;
  const todayValue = today();

  function apply() {
    if (!pending || invalid) return;
    onApply(draftFrom || undefined, draftTo || undefined);
  }

  function applyOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') apply();
  }

  return (
    <fieldset className={styles.period}>
      <legend className="sr-only">Período</legend>

      <div className={styles.field}>
        <span className={styles.labelRow}>
          <label htmlFor="period-from" className={styles.label}>
            De
          </label>
          <button
            type="button"
            className={styles.today}
            disabled={draftTo !== '' && todayValue > draftTo}
            onClick={() => setDraftFrom(todayValue)}
          >
            Hoje
          </button>
        </span>
        <input
          id="period-from"
          type="date"
          className={styles.input}
          value={draftFrom}
          max={draftTo || undefined}
          onChange={(event) => setDraftFrom(event.target.value)}
          onBlur={apply}
          onKeyDown={applyOnEnter}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.labelRow}>
          <label htmlFor="period-to" className={styles.label}>
            Até
          </label>
          <button
            type="button"
            className={styles.today}
            disabled={draftFrom !== '' && todayValue < draftFrom}
            onClick={() => setDraftTo(todayValue)}
          >
            Hoje
          </button>
        </span>
        <input
          id="period-to"
          type="date"
          className={styles.input}
          value={draftTo}
          min={draftFrom || undefined}
          onChange={(event) => setDraftTo(event.target.value)}
          onBlur={apply}
          onKeyDown={applyOnEnter}
        />
      </div>

      <button
        type="button"
        className={`${styles.apply} ${pending && !invalid ? styles.applyPending : ''}`}
        disabled={!pending || invalid}
        onClick={apply}
      >
        <Check className={styles.applyIcon} aria-hidden="true" />
        Aplicar período
      </button>

      {invalid && (
        <p className={styles.error} role="alert">
          A data inicial deve ser anterior ou igual à final.
        </p>
      )}
    </fieldset>
  );
}
