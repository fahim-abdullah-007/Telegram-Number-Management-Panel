import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Database, Phone, Search, ShieldCheck, Smartphone } from 'lucide-react';
import { MotionProvider } from './components/MotionPrimitives';
import { AppShell } from './components/AppShell';
import { api, NumberItem, Stats, User } from './services/api';
import { NumbersView } from './components/NumbersView';
import { AccountsView } from './components/AccountsView';
import { ActivityLogsView } from './components/ActivityLogsView';
import { SettingsView } from './components/SettingsView';

const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));

function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="Loading dashboard" role="status"><div className="skeleton-hero"><span className="skeleton-line wide" /><span className="skeleton-line" /></div><div className="skeleton-stat-grid">{[1, 2, 3, 4].map((item) => <span className="skeleton-block" key={item} />)}</div><div className="skeleton-content"><span className="skeleton-block" /><span className="skeleton-block" /></div></div>;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('panel_token', result.token);
      onLogin(result.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
    }
  };

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand-mark">TN</div>
        <p className="eyebrow">OPERATIONS CONSOLE / 01</p>
        <h1>Keep every number<br /><em>accountable.</em></h1>
        <p className="muted-on-dark">A clear, controlled workspace for legitimate Telegram number inventory and session health.</p>
        <div className="art-stats"><span><strong>24/7</strong> visibility</span><span><strong>100%</strong> auditable</span></div>
      </section>
      <section className="login-form">
        <div className="mobile-brand">TN <span>Panel</span></div>
        <div className="form-copy"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your panel</h2><p>Use your administrator credentials to continue.</p></div>
        <form onSubmit={submit}>
          <label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>
          {error && <div className="error-message"><CircleAlert size={16} />{error}</div>}
          <button className="primary-button" type="submit">Sign in <ArrowUpRight size={17} /></button>
        </form>
        <p className="form-foot">Access is logged for security. Never share your credentials.</p>
      </section>
    </main>
  );
}

function StatCard({ title, value, detail, tone, icon: Icon }: { title: string; value: number; detail: string; tone: string; icon: typeof Phone }) {
  return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{title}</span><Icon size={18} /></div><strong>{value.toLocaleString()}</strong><small>{detail}</small></div>;
}

function HealthRow({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return <div className="health-row"><div className="health-icon"><Icon size={16} /></div><span>{label}</span><strong><i />{value}</strong></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function Dashboard({ stats, user }: { stats: Stats; user: User }) {
  const totals = stats.totals;
  return <>
    <div className="page-heading"><div><p className="eyebrow">OVERVIEW / TODAY</p><h1>Good morning, {user.name.split(' ')[0]}.</h1><p className="subheading">Here is what is happening across your number inventory.</p></div><button className="outline-button"><ArrowUpRight size={16} /> Export report</button></div>
    <div className="stat-grid">
      <StatCard title="Total numbers" value={totals.total} detail="Across all providers" tone="green" icon={Phone} />
      <StatCard title="Active numbers" value={totals.active} detail={`${totals.total ? Math.round(totals.active / totals.total * 100) : 0}% of inventory`} tone="blue" icon={CheckCircle2} />
      <StatCard title="Telegram linked" value={totals.linked} detail={`${totals.total ? Math.round(totals.linked / totals.total * 100) : 0}% connected`} tone="orange" icon={Smartphone} />
      <StatCard title="Blocked" value={totals.blocked} detail="Needs attention" tone="red" icon={CircleAlert} />
    </div>
    <div className="content-grid">
      <section className="panel activity-panel"><div className="panel-header"><div><p className="eyebrow">LIVE FEED</p><h2>Recent activity</h2></div><button className="text-button">View all <ArrowUpRight size={15} /></button></div>{stats.recentActivity.length ? stats.recentActivity.map((item) => <div className="activity-row" key={item.id}><div className="activity-icon"><Activity size={16} /></div><div><strong>{item.action.replace(/_/g, ' ')}</strong><span>{item.resource} · {item.user?.name ?? 'System'}</span></div><time>{new Date(item.createdAt).toLocaleDateString()}</time></div>) : <Empty text="No activity recorded yet." />}</section>
      <section className="side-stack"><div className="panel health-panel"><div className="panel-header"><div><p className="eyebrow">SYSTEM</p><h2>System health</h2></div><span className="healthy-dot">Healthy</span></div><HealthRow icon={Database} label="Database" value={stats.system.database} /><HealthRow icon={ShieldCheck} label="API status" value={stats.system.api} /></div><div className="panel session-panel"><div className="panel-header"><div><p className="eyebrow">TELEGRAM</p><h2>Recent sessions</h2></div></div>{stats.recentSessions.length ? stats.recentSessions.map((session) => <div className="session-row" key={session.id}><span className="session-avatar">{(session.account.username ?? 'U')[0].toUpperCase()}</span><div><strong>{session.account.username ? `@${session.account.username}` : 'Unnamed account'}</strong><span>{session.status.toLowerCase()}</span></div><span className="session-status"><i /> active</span></div>) : <Empty text="No sessions recorded yet." />}</div></section>
    </div>
  </>;
}

function Numbers({ numbers, reload }: { numbers: NumberItem[]; reload: (search: string) => void }) {
  const [search, setSearch] = useState('');
  return <>
    <div className="page-heading"><div><p className="eyebrow">INVENTORY / NUMBERS</p><h1>Number management</h1><p className="subheading">Manage your verified number inventory and availability.</p></div><button className="primary-button compact"><Phone size={16} /> Add number</button></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search number or provider" value={search} onChange={(event) => { setSearch(event.target.value); reload(event.target.value); }} /></div><button className="outline-button">Filter</button></div><div className="table-wrap"><table><thead><tr><th>Phone number</th><th>Country</th><th>Provider</th><th>Status</th><th>Telegram</th><th>Added</th></tr></thead><tbody>{numbers.map((item) => <tr key={item.id}><td><strong>{item.phoneNumber}</strong><span className="cell-sub">{item.id.slice(0, 8)}</span></td><td>{item.country} <span className="cell-sub">{item.countryCode}</span></td><td>{item.provider}</td><td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td><td><span className={item.telegramLinked ? 'linked' : 'unlinked'}>{item.telegramLinked ? 'Linked' : 'Unlinked'}</span></td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>{!numbers.length && <Empty text="No numbers found. Add inventory or adjust your search." />}</div></section>
  </>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('Dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [numbers, setNumbers] = useState<NumberItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('panel_token');
    if (token) api<User>('/auth/me').then(setUser).catch(() => localStorage.removeItem('panel_token'));
  }, []);

  useEffect(() => {
    if (!user) return;
    api<Stats>('/dashboard/stats').then(setStats).catch(() => setStats(null));
    api<{ items: NumberItem[] }>('/numbers').then((data) => setNumbers(data.items)).catch(() => setNumbers([]));
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  const reload = (search: string) => api<{ items: NumberItem[] }>(`/numbers?search=${encodeURIComponent(search)}`).then((data) => setNumbers(data.items)).catch(() => undefined);
  const logout = () => { localStorage.removeItem('panel_token'); setUser(null); };

  return (
    <MotionProvider>
      <AppShell user={user} page={page} onPageChange={setPage} onLogout={logout}>
        {page === 'Dashboard' && (stats ? <Suspense fallback={<DashboardSkeleton />}><DashboardView stats={stats} user={user} onNavigate={setPage} /></Suspense> : <DashboardSkeleton />)}
        {page === 'Numbers' && <NumbersView />}
        {page === 'Telegram Accounts' && <AccountsView />}
        {page === 'Activity Logs' && <ActivityLogsView />}
        {page === 'Settings' && <SettingsView user={user} />}
        {page !== 'Dashboard' && page !== 'Numbers' && <div className="placeholder panel"><p className="eyebrow">MODULE / {page.toUpperCase()}</p><h1>{page}</h1><p className="subheading">This module is ready for data from the same authenticated API.</p></div>}
      </AppShell>
    </MotionProvider>
  );
}

export default App;
