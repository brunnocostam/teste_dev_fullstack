import { useParams } from 'react-router';

/** Lê o :id da rota como inteiro positivo; null se for inválido. */
export function useIdParam(): number | null {
  const { id } = useParams();
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}
