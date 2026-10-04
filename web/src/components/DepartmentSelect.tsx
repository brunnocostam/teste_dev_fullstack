import { useNavigate } from 'react-router';
import { useDepartments } from '../api/queries';
import { FAROL_LABEL } from '../farol/labels';
import styles from './DepartmentSelect.module.css';

/** Troca de departamento sem voltar à tela Geral (a escolha fica na URL). */
export function DepartmentSelect({ currentId }: { currentId: number }) {
  const navigate = useNavigate();
  const { data } = useDepartments();
  if (!data) return null;

  return (
    <label className={styles.field}>
      <span className="sr-only">Departamento</span>
      <select
        className={styles.select}
        value={currentId}
        onChange={(event) => navigate(`/departamentos/${event.target.value}`)}
      >
        {data.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — {FAROL_LABEL[d.farol]}
          </option>
        ))}
      </select>
    </label>
  );
}
