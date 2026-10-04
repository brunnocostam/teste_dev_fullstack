import type { AdmissionDetail, ExamStatus, FarolColor } from '../api/types';
import { formatDateTime } from '../format';
import styles from './ExamList.module.css';
import { StatusBadge } from './StatusBadge';

type Exam = AdmissionDetail['exams'][number];

const EXAM_STATUS: Record<ExamStatus, { label: string; farol: FarolColor }> = {
  late: { label: 'Atrasado', farol: 'red' },
  requested: { label: 'Solicitado', farol: 'neutral' },
  in_progress: { label: 'Em andamento', farol: 'neutral' },
  completed: { label: 'Concluído', farol: 'green' },
};

function detail(exam: Exam): string {
  if (exam.resultAt) return `Resultado em ${formatDateTime(exam.resultAt)}${exam.result ? `: ${exam.result}` : ''}`;
  return `Solicitado há ${exam.hoursPending ?? 0}h (${formatDateTime(exam.requestedAt)})`;
}

/** Exames da internação; a API já entrega atrasados primeiro. */
export function ExamList({ exams }: { exams: Exam[] }) {
  return (
    <ul className={styles.list}>
      {exams.map((exam) => {
        const status = EXAM_STATUS[exam.status];
        return (
          <li key={exam.id} className={styles.item}>
            <span className={styles.body}>
              <span className={styles.name}>{exam.name}</span>
              <span className={styles.detail}>{detail(exam)}</span>
            </span>
            <StatusBadge farol={status.farol} label={status.label} />
          </li>
        );
      })}
    </ul>
  );
}
