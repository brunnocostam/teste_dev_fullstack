import type { ReactNode } from 'react';
import styles from './KpiCard.module.css';

interface KpiCardProps {
  label: string;
  value: string;
  /** Contexto abaixo do valor (ex.: "3 de 100 leitos"). */
  hint?: ReactNode;
  /** Destaca o card quando o valor pede atenção. */
  tone?: 'default' | 'alert';
}

export function KpiCard({ label, value, hint, tone = 'default' }: KpiCardProps) {
  return (
    <div className={`${styles.card} ${tone === 'alert' ? styles.alert : ''}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
