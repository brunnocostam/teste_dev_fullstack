import type { AdmissionDetail, VitalSign } from '../api/types';
import { formatDateTime } from '../format';
import { VITAL_META, VITAL_ORDER, formatVital } from '../vitals';
import styles from './VitalCards.module.css';
import { StatusBadge } from './StatusBadge';

type LatestVitals = NonNullable<AdmissionDetail['latestVitals']>;

function displayValue(vitals: LatestVitals, sign: VitalSign): string | null {
  const value = vitals[sign];
  if (value === null) return null;
  // PA aparece como sistólica/diastólica; a cor considera a sistólica (regra do farol).
  if (sign === 'systolicPressure') {
    return vitals.diastolicPressure === null ? `${value} mmHg` : `${value}/${vitals.diastolicPressure} mmHg`;
  }
  return formatVital(sign, value);
}

/** Últimos sinais vitais; só o que está fora da faixa ganha cor (cor vinda da API). */
export function VitalCards({ vitals }: { vitals: LatestVitals }) {
  return (
    <>
      <ul className={styles.grid}>
        {VITAL_ORDER.map((sign) => {
          const value = displayValue(vitals, sign);
          const farol = vitals.farol[sign];
          const alert = farol === 'yellow' || farol === 'red';
          return (
            <li key={sign} className={`${styles.card} ${alert ? styles[farol] : ''}`}>
              <span className={styles.label}>{VITAL_META[sign].label}</span>
              <span className={styles.value}>{value ?? '—'}</span>
              {alert ? <StatusBadge farol={farol} /> : <span className={styles.ok}>{value ? 'Na faixa' : 'Sem medição'}</span>}
            </li>
          );
        })}
      </ul>
      <p className={styles.measured}>Última medição em {formatDateTime(vitals.recordedAt)}</p>
    </>
  );
}
