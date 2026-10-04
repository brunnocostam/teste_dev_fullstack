import type { ReactNode } from 'react';
import type { FarolColor } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import styles from './StatusBanner.module.css';
import { TrafficLight } from './TrafficLight';

interface StatusBannerProps {
  farol: FarolColor;
  reason: string | null;
  /** Linha pequena abaixo do motivo (ex.: "Atualizado às 14:32"). */
  footnote?: ReactNode;
  showTrafficLight?: boolean;
}

/** Faixa grande com o status, o rótulo textual e o motivo em uma frase. */
export function StatusBanner({ farol, reason, footnote, showTrafficLight = false }: StatusBannerProps) {
  return (
    <section className={`${styles.banner} ${styles[farol]}`} aria-live="polite">
      {showTrafficLight && <TrafficLight farol={farol} />}
      <div>
        <p className={styles.label}>{FAROL_LABEL[farol]}</p>
        {reason && <p className={styles.reason}>{reason}</p>}
        {footnote && <p className={styles.footnote}>{footnote}</p>}
      </div>
    </section>
  );
}
