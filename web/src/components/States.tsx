import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './States.module.css';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.state}>
      <Inbox className={styles.icon} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {children && <p className={styles.text}>{children}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`${styles.state} ${styles.error}`} role="alert">
      <AlertTriangle className={styles.icon} aria-hidden="true" />
      <p className={styles.title}>Não foi possível carregar</p>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/** Bloco cinza no formato do conteúdo que está carregando. */
export function Skeleton({ height = 16, width = '100%' }: { height?: number | string; width?: number | string }) {
  return <span className={styles.skeleton} style={{ height, width }} aria-hidden="true" />;
}
