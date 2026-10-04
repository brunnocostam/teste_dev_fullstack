import { useOverview } from '../api/queries';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { StatusBadge } from '../components/StatusBadge';

export function OverviewPage() {
  const { data, isPending, error, refetch } = useOverview();

  return (
    <>
      <PageHeader title="Visão geral" subtitle="O hospital está bem? Onde devo olhar?" />
      {isPending && <Skeleton height={32} width={240} />}
      {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {data && (
        <>
          <StatusBadge farol={data.farol} label={data.farolReason} size="md" />
          <EmptyState title="Tela em construção">KPIs, departamentos e gráfico de ocupação chegam na próxima entrega.</EmptyState>
        </>
      )}
    </>
  );
}
