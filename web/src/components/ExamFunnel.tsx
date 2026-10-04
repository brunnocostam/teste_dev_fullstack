import { AlertTriangle } from 'lucide-react';
import type { DepartmentDetail } from '../api/types';
import { plural } from '../format';
import styles from './ExamFunnel.module.css';

type Exams = DepartmentDetail['exams'];

/** Etapas dos exames das internações ativas, com os atrasados em destaque. */
export function ExamFunnel({ exams }: { exams: Exams }) {
  const stages = [
    { label: 'Solicitados', value: exams.requested },
    { label: 'Em andamento', value: exams.inProgress },
    { label: 'Concluídos', value: exams.completed },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <>
      <dl className={styles.stages}>
        {stages.map(({ label, value }) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd className={styles.track}>
              <span className={styles.bar} style={{ width: `${(value / max) * 100}%` }} aria-hidden="true" />
            </dd>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={`${styles.late} ${exams.late > 0 ? styles.lateActive : ''}`}>
        {exams.late > 0 && <AlertTriangle className={styles.icon} aria-hidden="true" />}
        {exams.late > 0 ? `${plural(exams.late, 'exame atrasado', 'exames atrasados')} (mais de 24h)` : 'Nenhum exame atrasado'}
      </p>
    </>
  );
}
