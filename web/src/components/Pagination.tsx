import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <button type="button" className={styles.button} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className={styles.icon} aria-hidden="true" />
        Anterior
      </button>
      <span className={styles.status} aria-current="page">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
        <ChevronRight className={styles.icon} aria-hidden="true" />
      </button>
    </nav>
  );
}
