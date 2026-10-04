import { Activity, FlaskConical, HeartPulse, LogIn, LogOut } from 'lucide-react';
import type { AdmissionDetail } from '../api/types';
import { FAROL_LABEL } from '../farol/labels';
import { formatDateTime } from '../format';
import styles from './Timeline.module.css';

type TimelineEvent = AdmissionDetail['timeline'][number];

const ICONS = {
  admission: LogIn,
  exam: FlaskConical,
  alert: HeartPulse,
  discharge: LogOut,
  death: Activity,
};

/** Linha do tempo cronológica: entrada, exames, alertas de sinais vitais e desfecho. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className={styles.timeline}>
      {events.map((event, index) => {
        const Icon = ICONS[event.type];
        return (
          <li key={`${event.at}-${index}`} className={`${styles.event} ${event.severity ? styles[event.severity] : ''}`}>
            <span className={styles.marker} aria-hidden="true">
              <Icon className={styles.icon} />
            </span>
            <span className={styles.body}>
              <span className={styles.label}>
                {event.label}
                {event.severity && <span className="sr-only"> ({FAROL_LABEL[event.severity]})</span>}
              </span>
              <time className={styles.time} dateTime={event.at}>
                {formatDateTime(event.at)}
              </time>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
