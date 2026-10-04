import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';
import { useIdParam } from './useIdParam';
import { NotFoundPage } from './NotFoundPage';

export function AdmissionDetailPage() {
  const id = useIdParam();
  if (id === null) return <NotFoundPage />;

  return (
    <>
      <PageHeader title={`Internação #${id}`} subtitle="Como está este paciente e por quê?" />
      <EmptyState title="Tela em construção">Sinais vitais, exames e linha do tempo.</EmptyState>
    </>
  );
}
