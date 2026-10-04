import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { AdmissionListItem } from '../api/types';
import { SITUATION_LABEL } from '../farol/labels';
import { formatDate, plural } from '../format';
import styles from './AdmissionList.module.css';
import { StatusBadge } from './StatusBadge';

function detailPath(id: number) {
  return `/internacoes/${id}`;
}

/** Tabela no desktop e cards no celular (o CSS mostra um ou outro). */
export function AdmissionList({ items }: { items: AdmissionListItem[] }) {
  const navigate = useNavigate();

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Farol</th>
              <th scope="col">Paciente</th>
              <th scope="col">Departamento</th>
              <th scope="col" className={styles.num}>
                Leito
              </th>
              <th scope="col">Entrada</th>
              <th scope="col" className={styles.num}>
                Dias
              </th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              // A linha inteira é clicável com o mouse; o link no nome atende teclado e leitor de tela.
              <tr key={a.id} className={styles.row} onClick={() => navigate(detailPath(a.id))}>
                <td>
                  <StatusBadge farol={a.farol} />
                </td>
                <td>
                  <Link to={detailPath(a.id)} className={styles.name} onClick={(event) => event.stopPropagation()}>
                    {a.patientName}
                  </Link>
                  {a.farolReason && <span className={styles.reason}>{a.farolReason}</span>}
                </td>
                <td>{a.departmentName}</td>
                <td className={styles.num}>{a.bed}</td>
                <td>{formatDate(a.admittedAt)}</td>
                <td className={styles.num}>{a.daysAdmitted}</td>
                <td>{SITUATION_LABEL[a.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.cards}>
        {items.map((a) => (
          <li key={a.id}>
            <Link to={detailPath(a.id)} className={styles.card}>
              <span className={styles.cardTop}>
                <StatusBadge farol={a.farol} />
                <span className={styles.situation}>{SITUATION_LABEL[a.status]}</span>
              </span>
              <span className={styles.name}>{a.patientName}</span>
              {a.farolReason && <span className={styles.reason}>{a.farolReason}</span>}
              <span className={styles.meta}>
                {a.departmentName} · Leito {a.bed} · {plural(a.daysAdmitted, 'dia', 'dias')}
              </span>
              <ChevronRight className={styles.chevron} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
