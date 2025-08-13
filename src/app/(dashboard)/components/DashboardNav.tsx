'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '../UserContext';
import styles from './DashboardNav.module.css';

// --- Iconos (sin cambios) ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ChartAnalysisIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
const SignalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12.1133L6.44444 16.5556L14.3333 8.66667"/><path d="M10.4444 12.1133L14.8889 16.5556L22.7778 8.66667"/></svg>;
const PulseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M12 8v4l2 2"/></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const SubscriptionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const CollapseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>;


export default function DashboardNav({ handleLogout, isCollapsed, toggleSidebar }: { handleLogout: () => void, isCollapsed: boolean, toggleSidebar: () => void }) {
  const pathname = usePathname();
  const { user, profile } = useUser(); // Ya no necesitamos 'permissions' aquí

  const displayName = profile?.full_name || user?.email || 'Cargando...';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div>
        <div className={styles.sidebarTop}>
          <Link href="/dashboard" className={styles.logo}>
            <Image 
              src="/logo-aimpatfx.svg" 
              alt="AImpatfx Logo" 
              width={35}
              height={35}
              priority
            />
            {!isCollapsed && <span className={styles.logoText}>AImpatfx</span>}
          </Link>

          <button onClick={toggleSidebar} className={styles.collapseButton}>
            <CollapseIcon />
          </button>
        </div>

        {/* --- INICIO DE LA MODIFICACIÓN --- */}
        {/* Ahora todos los enlaces se renderizan siempre */}
        <nav className={styles.navLinks}>
          <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}>
            <div className={styles.navIcon}><HomeIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Dashboard</span>}
          </Link>

          <Link href="/chart-analysis" className={`${styles.navLink} ${pathname.includes('/chart-analysis') ? styles.active : ''}`}>
            <div className={styles.navIcon}><ChartAnalysisIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Análisis de Gráfico</span>}
          </Link>
          
          <Link href="/signals" className={`${styles.navLink} ${pathname.includes('/signals') ? styles.active : ''}`}>
            <div className={styles.navIcon}><SignalIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Señales de Trading</span>}
          </Link>

          <Link href="/market-pulse" className={`${styles.navLink} ${pathname.includes('/market-pulse') ? styles.active : ''}`}>
            <div className={styles.navIcon}><PulseIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Pulso del Mercado</span>}
          </Link>

          <Link href="/history" className={`${styles.navLink} ${pathname.includes('/history') ? styles.active : ''}`}>
            <div className={styles.navIcon}><HistoryIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Historial</span>}
          </Link>

          <Link href="/economic-calendar" className={`${styles.navLink} ${pathname.includes('/economic-calendar') ? styles.active : ''}`}>
            <div className={styles.navIcon}><CalendarIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Calendario</span>}
          </Link>
          
          <Link href="/subscription" className={`${styles.navLink} ${pathname.includes('/subscription') ? styles.active : ''}`}>
            <div className={styles.navIcon}><SubscriptionIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Suscripción</span>}
          </Link>
          <Link href="/settings" className={`${styles.navLink} ${pathname.includes('/settings') ? styles.active : ''}`}>
            <div className={styles.navIcon}><SettingsIcon /></div>
            {!isCollapsed && <span className={styles.navText}>Configuración</span>}
          </Link>
        </nav>
        {/* --- FIN DE LA MODIFICACIÓN --- */}
      </div>

      <div className={styles.sidebarBottom}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {displayInitial}
          </div>
          {!isCollapsed && <span className={styles.userEmail}>{displayName}</span>}
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <div className={styles.navIcon}><LogoutIcon /></div>
          {!isCollapsed && <span className={styles.navText}>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}





