import { Navigate } from 'react-router';
import { useDepartments } from '../api/queries';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { useIdParam } from './useIdParam';
import { NotFoundPage } from './NotFoundPage';

/** /departamentos sem id abre o primeiro departamento. */
export function DepartmentsIndex() {
  const { data, isPending, error, refetch } = useDepartments();

  if (isPending) return <Skeleton height={32} width={240} />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (data.length === 0) return <EmptyState title="Nenhum departamento cadastrado" />;
  return <Navigate to={`/departamentos/${data[0].id}`} replace />;
}

export function DepartmentPage() {
  const id = useIdParam();
  if (id === null) return <NotFoundPage />;

  return (
    <>
      <PageHeader title="Departamento" subtitle="O que está pegando nesta área e quem está envolvido?" />
      <EmptyState title="Tela em construção">Departamento #{id}: mapa de leitos, funil de exames e prioridades.</EmptyState>
    </>
  );
}
