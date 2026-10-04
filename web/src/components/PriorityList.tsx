import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { DepartmentDetail } from '../api/types';
import styles from './PriorityList.module.css';
import { StatusBadge } from './StatusBadge';

type Priority = DepartmentDetail['priorityAdmissions'][number];

/** Internações que pedem ação, mais graves primeiro (a API já entrega ordenado). */
export function PriorityList({ admissions }: { admissions: Priority[] }) {
  return (
    <ul className={styles.list}>
      {admissions.map((a) => (
        <li key={a.id}>
          <Link to={`/internacoes/${a.id}`} className={styles.item}>
            <StatusBadge farol={a.farol} />
            <span className={styles.body}>
              <span className={styles.name}>{a.patientName}</span>
              <span className={styles.meta}>
                Leito {a.bed}
                {a.farolReason && ` · ${a.farolReason}`}
              </span>
            </span>
            <ChevronRight className={styles.chevron} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
