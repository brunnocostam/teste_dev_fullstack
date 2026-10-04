/** Semáforo do logotipo; decorativo, o nome do produto vem ao lado. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 18 30" aria-hidden="true">
      <rect x="0.5" y="0.5" width="17" height="29" rx="5" fill="#1d2939" stroke="var(--color-border)" />
      <circle cx="9" cy="7" r="3.5" fill="var(--status-red)" />
      <circle cx="9" cy="15" r="3.5" fill="var(--status-yellow)" />
      <circle cx="9" cy="23" r="3.5" fill="var(--status-green)" />
    </svg>
  );
}
