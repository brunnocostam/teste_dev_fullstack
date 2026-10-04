import { Link } from 'react-router';
import { EmptyState } from '../components/States';

export function NotFoundPage() {
  return (
    <EmptyState title="Página não encontrada">
      O endereço não existe. <Link to="/">Voltar para a visão geral</Link>
    </EmptyState>
  );
}
