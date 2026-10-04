import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAdmissions } from '../api/queries';
import { AdmissionFilters } from '../components/AdmissionFilters';
import { AdmissionList } from '../components/AdmissionList';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { plural } from '../format';
import { hasActiveFilters, PAGE_SIZE, readFilters, withFilters, withPage, type FilterPatch } from './admissionFilters';
import styles from './AdmissionsPage.module.css';

export function AdmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { data, isPending, isFetching, isPlaceholderData, error, refetch } = useAdmissions({
    ...filters,
    pageSize: PAGE_SIZE,
  });

  const changeFilter = useCallback(
    (patch: FilterPatch, options?: { replace?: boolean }) =>
      setSearchParams((current) => withFilters(current, patch), options),
    [setSearchParams],
  );
  const clearFilters = () => setSearchParams(new URLSearchParams());
  const changePage = (page: number) => {
    setSearchParams((current) => withPage(current, page));
    window.scrollTo({ top: 0 });
  };

  const filtered = hasActiveFilters(searchParams);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader title="Internações" subtitle="Quais internações existem e quais exigem atenção?" />
      <div className={styles.stack}>
        <AdmissionFilters filters={filters} onChange={changeFilter} onClear={filtered ? clearFilters : undefined} />

        {isPending && <ListSkeleton />}
        {error && <ErrorState message={error.message} onRetry={() => refetch()} />}

        {data && (
          <>
            <p className={styles.count} aria-live="polite">
              {plural(data.total, 'internação', 'internações')}
              {filtered && ' com esses filtros'}
              {isFetching && isPlaceholderData && <span className={styles.updating}> · atualizando…</span>}
            </p>
            {data.items.length === 0 ? (
              <EmptyState title="Nenhuma internação com esses filtros">
                Ajuste os filtros ou{' '}
                <button type="button" className={styles.linkButton} onClick={clearFilters}>
                  limpe todos
                </button>
                .
              </EmptyState>
            ) : (
              <div className={isPlaceholderData ? styles.stale : undefined}>
                <AdmissionList items={data.items} />
              </div>
            )}
            <Pagination page={data.page} totalPages={totalPages} onPageChange={changePage} />
          </>
        )}
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label="Carregando internações">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height={56} />
      ))}
    </div>
  );
}
