import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import styles from './Breadcrumb.module.css';

interface BreadcrumbProps {
  parent: { label: string; to: string };
  current: string;
}

/**
 * Trilha + botão voltar. "Voltar" usa o histórico quando existe (preserva filtros
 * da lista ou a tela de departamento de onde veio); senão vai para o pai.
 */
export function Breadcrumb({ parent, current }: BreadcrumbProps) {
  const navigate = useNavigate();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.back}
        onClick={() => (canGoBack ? navigate(-1) : navigate(parent.to))}
      >
        <ArrowLeft className={styles.icon} aria-hidden="true" />
        Voltar
      </button>
      <nav aria-label="Trilha de navegação">
        <ol className={styles.trail}>
          <li>
            <Link to={parent.to}>{parent.label}</Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className={styles.separator} />
          </li>
          <li aria-current="page">{current}</li>
        </ol>
      </nav>
    </div>
  );
}
