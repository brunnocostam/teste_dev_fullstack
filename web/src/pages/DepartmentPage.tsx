import { Navigate } from 'react-router';
import { ApiError } from '../api/client';
import { useDepartment, useDepartments } from '../api/queries';
import type { DepartmentDetail } from '../api/types';
import { BedMap } from '../components/BedMap';
import { Card } from '../components/Card';
import { DepartmentSelect } from '../components/DepartmentSelect';
import { ExamFunnel } from '../components/ExamFunnel';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { PriorityList } from '../components/PriorityList';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { StatusBanner } from '../components/StatusBanner';
import { formatNumber, formatTime, plural } from '../format';
import { NotFoundPage } from './NotFoundPage';
import styles from './DepartmentPage.module.css';
import { useIdParam } from './useIdParam';

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
  return <DepartmentView id={id} />;
}

function DepartmentView({ id }: { id: number }) {
  const { data, isPending, error, refetch, dataUpdatedAt } = useDepartment(id);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  return (
    <>
      <PageHeader
        title={data?.name ?? 'Departamento'}
        subtitle="O que está pegando nesta área e quem está envolvido?"
        actions={<DepartmentSelect currentId={id} />}
      />
      {isPending && <DepartmentSkeleton />}
      {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {data && <DepartmentContent department={data} updatedAt={dataUpdatedAt} />}
    </>
  );
}

function DepartmentContent({ department, updatedAt }: { department: DepartmentDetail; updatedAt: number }) {
  const { beds, staff, exams, priorityAdmissions } = department;
  const occupancyPct = beds.total > 0 ? Math.round((beds.occupied / beds.total) * 100) : 0;

  return (
    <div className={styles.stack}>
      <StatusBanner
        farol={department.farol}
        reason={department.farolReason ?? 'Sem alertas no departamento'}
        footnote={`Atualizado às ${formatTime(updatedAt)}`}
      />

      <section aria-label="Capacidade" className={styles.kpis}>
        <KpiCard
          label="Leitos livres"
          value={`${beds.free}/${beds.total}`}
          hint={`${occupancyPct}% de ocupação`}
        />
        <KpiCard
          label="Pacientes por enfermeiro"
          value={staff.patientsPerNurse === null ? '—' : formatNumber(staff.patientsPerNurse)}
          hint={`${plural(staff.nurses, 'enfermeiro', 'enfermeiros')} · ${plural(staff.doctors, 'médico', 'médicos')} no quadro`}
        />
      </section>

      <div className={styles.columns}>
        <Card title="Mapa de leitos" subtitle="Toque em um leito ocupado para ver a internação.">
          <BedMap beds={beds.map} />
        </Card>
        <Card title="Exames" subtitle="Das internações ativas do departamento.">
          <ExamFunnel exams={exams} />
        </Card>
      </div>

      <Card title="Pacientes por prioridade" subtitle="Internações ativas que pedem atenção, mais graves primeiro.">
        {priorityAdmissions.length === 0 ? (
          <EmptyState title="Nenhum paciente em alerta">Todas as internações ativas estão com sinais e exames em ordem.</EmptyState>
        ) : (
          <PriorityList admissions={priorityAdmissions} />
        )}
      </Card>
    </div>
  );
}

function DepartmentSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Carregando departamento">
      <Skeleton height={96} />
      <div className={styles.kpis}>
        <Skeleton height={116} />
        <Skeleton height={116} />
      </div>
      <div className={styles.columns}>
        <Skeleton height={240} />
        <Skeleton height={240} />
      </div>
    </div>
  );
}
