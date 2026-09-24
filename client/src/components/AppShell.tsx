import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import * as React from 'react';
import type { User } from '../services/api';
import { pageVariants } from '../lib/motion';
import './AppShell.css';

const nav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Numbers', icon: Phone },
  { label: 'Telegram Accounts', icon: Smartphone },
  { label: 'Sessions', icon: Activity },
  { label: 'Activity Logs', icon: ShieldCheck },
  { label: 'Users', icon: Users },
  { label: 'Settings', icon: Settings },
];

type AppShellProps = {
  children: ReactNode;
  user: User;
  page: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
};

export function AppShell({ children, user, page, onPageChange, onLogout }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const selectPage = (nextPage: string) => {
    onPageChange(nextPage);
    setMobileOpen(false);
  };

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            className="mobile-nav-backdrop"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="side-brand">
          <span>TN</span>
          <strong className="sidebar-label">Panel</strong>
          <button className="close-nav" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label sidebar-label">WORKSPACE</div>
        <nav aria-label="Primary navigation">
          {nav.map(({ label, icon: Icon }) => (
            <button
              className={page === label ? 'nav-item active' : 'nav-item'}
              key={label}
              aria-current={page === label ? 'page' : undefined}
              title={collapsed ? label : undefined}
              onClick={() => selectPage(label)}
            >
              <Icon size={18} />
              <span className="sidebar-label">{label}</span>
              {label === 'Activity Logs' && <b className="sidebar-label">6</b>}
              {page === label && <motion.i className="nav-active-indicator" layoutId="nav-active" />}
            </button>
          ))}
        </nav>
        <div className="side-footer">
          <div className="security-note">
            <ShieldCheck size={18} />
            <span className="sidebar-label"><strong>Secure workspace</strong><small>Audit logging is active</small></span>
          </div>
          <button className="profile" onClick={onLogout} title="Sign out">
            <span className="avatar">{user.name[0]}</span>
            <span className="sidebar-label"><strong>{user.name}</strong><small>{user.role}</small></span>
            <LogOut size={16} />
          </button>
        </div>
        <button
          className="sidebar-collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="top-search">
            <span aria-hidden="true">⌘</span>
            <input aria-label="Search anything" placeholder="Search anything..." />
            <kbd>K</kbd>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <span className="top-divider" />
            <button className="top-user" aria-label="Open user menu">
              <span className="avatar">{user.name[0]}</span>
              <span>{user.name}</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={page} className="page-content" variants={pageVariants} initial="hidden" animate="visible" exit="exit">
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

