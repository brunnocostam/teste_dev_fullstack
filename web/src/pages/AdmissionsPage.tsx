import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/States';

export function AdmissionsPage() {
  return (
    <>
      <PageHeader title="Internações" subtitle="Quais internações existem e quais exigem atenção?" />
      <EmptyState title="Tela em construção">Filtros, lista por gravidade e paginação.</EmptyState>
    </>
  );
}
