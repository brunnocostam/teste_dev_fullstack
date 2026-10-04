import type { FarolColor } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  farol: FarolColor;
  /** Texto no lugar do rótulo padrão ("Crítico", "Atenção"...). */
  label?: string;
  size?: 'sm' | 'md';
}

/** Selo com bolinha + texto: a cor nunca aparece sozinha. */
export function StatusBadge({ farol, label = FAROL_LABEL[farol], size = 'sm' }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[farol]} ${styles[size]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}

/** Só a bolinha, com o rótulo disponível para leitores de tela. */
export function StatusDot({ farol }: { farol: FarolColor }) {
  return (
    <span className={`${styles.dotOnly} ${styles[farol]}`} role="img" aria-label={FAROL_LABEL[farol]} />
  );
}
