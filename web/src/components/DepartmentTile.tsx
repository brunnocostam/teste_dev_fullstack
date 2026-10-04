import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { DepartmentSummary } from '../api/types';
import styles from './DepartmentTile.module.css';
import { StatusBadge } from './StatusBadge';

/** Tile clicável de departamento: cor + rótulo, ocupação e motivo curto. */
export function DepartmentTile({ department }: { department: DepartmentSummary }) {
  const { id, name, farol, farolReason, occupancyPct, occupiedBeds, totalBeds } = department;

  return (
    <Link to={`/departamentos/${id}`} className={`${styles.tile} ${styles[farol]}`}>
      <div className={styles.top}>
        <StatusBadge farol={farol} />
        <ChevronRight className={styles.chevron} aria-hidden="true" />
      </div>
      <p className={styles.name}>{name}</p>
      <p className={styles.occupancy}>
        <strong>{occupancyPct}%</strong> ocupado · {occupiedBeds}/{totalBeds} leitos
      </p>
      <p className={styles.reason}>{farolReason ?? 'Sem alertas'}</p>
    </Link>
  );
}
