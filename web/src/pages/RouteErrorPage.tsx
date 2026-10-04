import { ErrorState } from '../components/States';

/** Último recurso para erros inesperados de renderização. */
export function RouteErrorPage() {
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <ErrorState message="Algo deu errado nesta tela." onRetry={() => window.location.reload()} />
    </main>
  );
}
