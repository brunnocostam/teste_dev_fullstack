import { Link } from 'react-router';
import type { DepartmentDetail } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import styles from './BedMap.module.css';

type Bed = DepartmentDetail['beds']['map'][number];

const LEGEND = [
  { key: 'red', label: 'Crítico' },
  { key: 'yellow', label: 'Atenção' },
  { key: 'green', label: 'Tudo OK' },
  { key: 'free', label: 'Livre' },
] as const;

function BedCell({ bed }: { bed: Bed }) {
  if (bed.admissionId === null || bed.farol === null) {
    return (
      <li className={`${styles.bed} ${styles.free}`} aria-label={`Leito ${bed.bed}: livre`}>
        {bed.bed}
      </li>
    );
  }
  return (
    <li>
      <Link
        to={`/internacoes/${bed.admissionId}`}
        className={`${styles.bed} ${styles[bed.farol]}`}
        aria-label={`Leito ${bed.bed}: ${FAROL_LABEL[bed.farol]}. Ver internação`}
      >
        {bed.bed}
      </Link>
    </li>
  );
}

/** Um quadrado por leito; a cor é o farol do paciente, tracejado é leito livre. */
export function BedMap({ beds }: { beds: Bed[] }) {
  return (
    <>
      <ul className={styles.grid}>
        {beds.map((bed) => (
          <BedCell key={bed.bed} bed={bed} />
        ))}
      </ul>
      <ul className={styles.legend} aria-label="Legenda">
        {LEGEND.map(({ key, label }) => (
          <li key={key}>
            <span className={`${styles.swatch} ${styles[key]}`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </>
  );
}
