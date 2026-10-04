import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { AdmissionDetailPage } from './pages/AdmissionDetailPage';
import { AdmissionsPage } from './pages/AdmissionsPage';
import { DepartmentPage, DepartmentsIndex } from './pages/DepartmentPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'departamentos', element: <DepartmentsIndex /> },
      { path: 'departamentos/:id', element: <DepartmentPage /> },
      { path: 'internacoes', element: <AdmissionsPage /> },
      { path: 'internacoes/:id', element: <AdmissionDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
