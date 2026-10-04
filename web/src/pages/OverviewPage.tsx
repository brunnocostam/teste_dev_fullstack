import { useOverview } from '../api/queries';
import type { Overview } from '../api/types';
import { DepartmentTile } from '../components/DepartmentTile';
import { KpiCard } from '../components/KpiCard';
import { OccupancyChart } from '../components/OccupancyChart';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { StatusBanner } from '../components/StatusBanner';
import { formatNumber, formatTime, plural } from '../format';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  const { data, isPending, error, refetch, dataUpdatedAt } = useOverview();

  return (
    <>
      <PageHeader title="Visão geral" subtitle="O hospital está bem? Onde devo olhar?" />
      {isPending && <OverviewSkeleton />}
      {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {data && <OverviewContent overview={data} updatedAt={dataUpdatedAt} />}
    </>
  );
}

function OverviewContent({ overview, updatedAt }: { overview: Overview; updatedAt: number }) {
  const { kpis, departments } = overview;

  return (
    <div className={styles.stack}>
      <StatusBanner
        farol={overview.farol}
        reason={overview.farolReason}
        footnote={`Atualizado às ${formatTime(updatedAt)}`}
        showTrafficLight
      />

      <section aria-label="Indicadores" className={styles.kpis}>
        <KpiCard
          label="Ocupação geral"
          value={`${kpis.occupancyPct}%`}
          hint={`${kpis.occupiedBeds} de ${kpis.totalBeds} leitos`}
        />
        <KpiCard label="Internações ativas" value={formatNumber(kpis.activeAdmissions)} hint="pacientes internados agora" />
        <KpiCard
          label="Tempo médio de internação"
          value={kpis.avgLengthOfStayDays === null ? '—' : plural(kpis.avgLengthOfStayDays, 'dia', 'dias')}
          hint="internações encerradas"
        />
        <KpiCard
          label="Exames pendentes"
          value={formatNumber(kpis.pendingExams)}
          hint={kpis.lateExams > 0 ? plural(kpis.lateExams, 'atrasado', 'atrasados') : 'nenhum atrasado'}
          tone={kpis.lateExams > 0 ? 'alert' : 'default'}
        />
      </section>

      <section aria-labelledby="departments-title">
        <h2 id="departments-title" className={styles.sectionTitle}>
          Departamentos <span className={styles.sectionHint}>do mais grave para o menos grave</span>
        </h2>
        {departments.length === 0 ? (
          <EmptyState title="Nenhum departamento cadastrado" />
        ) : (
          <div className={styles.tiles}>
            {departments.map((d) => (
              <DepartmentTile key={d.id} department={d} />
            ))}
          </div>
        )}
      </section>

      {departments.length > 0 && <OccupancyChart departments={departments} />}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Carregando visão geral">
      <Skeleton height={112} />
      <div className={styles.kpis}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={116} />
        ))}
      </div>
      <div className={styles.tiles}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={136} />
        ))}
      </div>
    </div>
  );
}
