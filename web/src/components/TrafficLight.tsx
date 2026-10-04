import type { FarolColor } from '../api/types';
import styles from './TrafficLight.module.css';

const LIGHTS = ['red', 'yellow', 'green'] as const;

/** Semáforo de 3 luzes com a cor atual acesa (decorativo: o rótulo vem ao lado). */
export function TrafficLight({ farol }: { farol: FarolColor }) {
  return (
    <span className={styles.housing} aria-hidden="true">
      {LIGHTS.map((light) => (
        <span key={light} className={`${styles.light} ${light === farol ? styles[light] : ''}`} />
      ))}
    </span>
  );
}
