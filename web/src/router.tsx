import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

// Cada tela é carregada sob demanda: o Recharts só é baixado nas telas com gráfico.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, lazy: () => import('./pages/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
      {
        path: 'departamentos',
        lazy: () => import('./pages/DepartmentPage').then((m) => ({ Component: m.DepartmentsIndex })),
      },
      {
        path: 'departamentos/:id',
        lazy: () => import('./pages/DepartmentPage').then((m) => ({ Component: m.DepartmentPage })),
      },
      { path: 'internacoes', lazy: () => import('./pages/AdmissionsPage').then((m) => ({ Component: m.AdmissionsPage })) },
      {
        path: 'internacoes/:id',
        lazy: () => import('./pages/AdmissionDetailPage').then((m) => ({ Component: m.AdmissionDetailPage })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
