import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDepartments } from '../api/queries';
import type { AdmissionListParams, AdmissionSituation } from '../api/types';
import { SITUATION_LABEL } from '../farol/labels';
import type { FilterPatch } from '../pages/admissionFilters';
import styles from './AdmissionFilters.module.css';
import { PeriodFilter } from './PeriodFilter';

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: { value: AdmissionSituation | undefined; label: string }[] = [
  { value: undefined, label: 'Todas' },
  ...(['internado', 'alta', 'obito'] as const).map((value) => ({ value, label: SITUATION_LABEL[value] })),
];

interface AdmissionFiltersProps {
  filters: AdmissionListParams;
  onChange: (patch: FilterPatch, options?: { replace?: boolean }) => void;
  onClear?: () => void;
}

export function AdmissionFilters({ filters, onChange, onClear }: AdmissionFiltersProps) {
  const { data: departments } = useDepartments();
  const [search, setSearch] = useState(filters.search ?? '');
  const [urlSearch, setUrlSearch] = useState(filters.search);

  // A URL é a fonte da verdade: se ela mudar (voltar, limpar), o campo acompanha.
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    setSearch(filters.search ?? '');
  }

  // Espera o usuário parar de digitar antes de buscar; replace para não poluir o histórico.
  useEffect(() => {
    if (search.trim() === (filters.search ?? '')) return;
    const timer = setTimeout(() => onChange({ search: search.trim() || undefined }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filters.search, onChange]);

  return (
    <div className={styles.filters}>
      <div className={styles.chips} role="group" aria-label="Situação">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            className={styles.chip}
            aria-pressed={filters.status === value}
            onClick={() => onChange({ status: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.fields}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span className={styles.label}>Paciente</span>
          <span className={styles.inputWrap}>
            <Search className={styles.inputIcon} aria-hidden="true" />
            <input
              type="search"
              className={`${styles.input} ${styles.withIcon}`}
              placeholder="Buscar pelo nome"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Departamento</span>
          <select
            className={styles.input}
            value={filters.departmentId ?? ''}
            onChange={(event) => onChange({ departmentId: event.target.value || undefined })}
          >
            <option value="">Todos</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <PeriodFilter from={filters.from} to={filters.to} onApply={(from, to) => onChange({ from, to })} />

        {onClear && (
          <button type="button" className={styles.clear} onClick={onClear}>
            <X className={styles.clearIcon} aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
