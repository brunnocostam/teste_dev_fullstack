import { Link } from 'react-router';
import { ApiError } from '../api/client';
import { useAdmission } from '../api/queries';
import type { AdmissionDetail } from '../api/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { Card } from '../components/Card';
import { ExamList } from '../components/ExamList';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { StatusBanner } from '../components/StatusBanner';
import { Timeline } from '../components/Timeline';
import { VitalCards } from '../components/VitalCards';
import { VitalsChart } from '../components/VitalsChart';
import { SITUATION_LABEL } from '../farol/labels';
import { formatDate, formatTime, plural } from '../format';
import { NotFoundPage } from './NotFoundPage';
import styles from './AdmissionDetailPage.module.css';
import { useIdParam } from './useIdParam';

const GENDER_LABEL = { M: 'Masculino', F: 'Feminino' } as const;

export function AdmissionDetailPage() {
  const id = useIdParam();
  if (id === null) return <NotFoundPage />;
  return <AdmissionDetailView id={id} />;
}

function AdmissionDetailView({ id }: { id: number }) {
  const { data, isPending, error, refetch, dataUpdatedAt } = useAdmission(id);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  return (
    <>
      <Breadcrumb parent={{ label: 'Internações', to: '/internacoes' }} current={`#${id}`} />
      {isPending && <DetailSkeleton />}
      {error && <ErrorState message={error.message} onRetry={() => refetch()} />}
      {data && <AdmissionContent admission={data} updatedAt={dataUpdatedAt} />}
    </>
  );
}

/** Motivo da faixa: para internação encerrada, conta como e quando terminou. */
function bannerReason(a: AdmissionDetail): string {
  if (a.status === 'internado') return a.farolReason ?? 'Sinais vitais e exames em ordem';
  const outcome = a.status === 'obito' ? 'óbito' : 'alta';
  return a.dischargedAt ? `Internação encerrada por ${outcome} em ${formatDate(a.dischargedAt)}` : `Internação encerrada por ${outcome}`;
}

function AdmissionContent({ admission: a, updatedAt }: { admission: AdmissionDetail; updatedAt: number }) {
  const facts = [
    { label: 'Departamento', value: <Link to={`/departamentos/${a.department.id}`}>{a.department.name}</Link> },
    { label: 'Leito', value: a.bed },
    { label: 'Entrada', value: formatDate(a.admittedAt) },
    { label: a.status === 'internado' ? 'Internado há' : 'Duração', value: plural(a.daysAdmitted, 'dia', 'dias') },
    { label: 'Situação', value: SITUATION_LABEL[a.status] },
    { label: 'Diagnóstico', value: a.diagnosis ?? '—' },
    {
      label: 'Profissional responsável',
      value: a.attendingStaff ? `${a.attendingStaff.name} (${a.attendingStaff.role})` : '—',
    },
  ];

  return (
    <div className={styles.stack}>
      <PageHeader
        title={a.patient.name}
        subtitle={`${a.patient.age} anos · ${GENDER_LABEL[a.patient.gender]} · Internação #${a.id}`}
      />

      <StatusBanner farol={a.farol} reason={bannerReason(a)} footnote={`Atualizado às ${formatTime(updatedAt)}`} />

      <dl className={styles.facts}>
        {facts.map(({ label, value }) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <Card title="Sinais vitais" subtitle="Última medição e evolução ao longo da internação.">
        {a.latestVitals ? (
          <div className={styles.vitals}>
            <VitalCards vitals={a.latestVitals} />
            <VitalsChart vitals={a.vitals} ranges={a.referenceRanges} latestFarol={a.latestVitals.farol} />
          </div>
        ) : (
          <EmptyState title="Nenhuma medição registrada" />
        )}
      </Card>

      <div className={styles.columns}>
        <Card title="Exames" subtitle="Atrasados primeiro.">
          {a.exams.length === 0 ? <EmptyState title="Nenhum exame solicitado" /> : <ExamList exams={a.exams} />}
        </Card>
        <Card title="Linha do tempo" subtitle="Entrada, exames, alertas e desfecho.">
          <Timeline events={a.timeline} />
        </Card>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Carregando internação">
      <Skeleton height={56} width="50%" />
      <Skeleton height={96} />
      <Skeleton height={88} />
      <Skeleton height={420} />
    </div>
  );
}
