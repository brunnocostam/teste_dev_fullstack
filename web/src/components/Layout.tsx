import { BedDouble, Building2, LayoutDashboard } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { Logo } from './Logo';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Geral', icon: LayoutDashboard, end: true },
  { to: '/departamentos', label: 'Departamentos', icon: Building2, end: false },
  // Sem `end`: o detalhe (/internacoes/:id) mantém "Internações" ativo.
  { to: '/internacoes', label: 'Internações', icon: BedDouble, end: false },
];

export function Layout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo />
          <span>Farol Hospitalar</span>
        </div>
        <nav aria-label="Principal" className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon className={styles.navIcon} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
