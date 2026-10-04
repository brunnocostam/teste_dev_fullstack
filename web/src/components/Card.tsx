import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/** Seção com título; base visual dos blocos das telas. */
export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <section className={`${styles.card} ${className}`}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
