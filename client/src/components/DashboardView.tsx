import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Clock3, Database, Download, FilePlus2, Phone, RefreshCw, ShieldCheck, Smartphone, Upload, Users } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnimatedCard, FadeIn, ScaleIn, SlideUp, Stagger } from './MotionPrimitives';
import type { Stats, User } from '../services/api';
import './DashboardView.css';

type DashboardViewProps = {
  stats: Stats;
  user: User;
  onNavigate: (page: string) => void;
};

type CounterProps = {
  value: number;
};

function AnimatedCounter({ value }: CounterProps) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 850;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, value]);

  return <>{displayValue.toLocaleString()}</>;
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Phone; tone: string }) {
  return <AnimatedCard className={`dashboard-stat ${tone}`}><div className="dashboard-stat-label"><span>{label}</span><span className="dashboard-stat-icon"><Icon size={17} /></span></div><strong><AnimatedCounter value={value} /></strong><small>{detail}</small></AnimatedCard>;
}

function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="Loading dashboard" role="status"><div className="skeleton-hero"><span className="skeleton-line wide" /><span className="skeleton-line" /></div><div className="skeleton-stat-grid">{[1, 2, 3, 4].map((item) => <span className="skeleton-block" key={item} />)}</div><div className="skeleton-content"><span className="skeleton-block" /><span className="skeleton-block" /></div></div>;
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

export function DashboardView({ stats, user, onNavigate }: DashboardViewProps) {
  const totals = stats.totals;
  const activityData = stats.recentActivity.map((item) => ({
    label: new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    activity: 1,
  }));
  const statusData = [
    { name: 'Active', value: totals.active, color: '#4fd39a' },
    { name: 'Inactive', value: totals.inactive, color: '#65758a' },
    { name: 'Blocked', value: totals.blocked, color: '#f4777c' },
  ].filter((item) => item.value > 0);
  const quickActions = [
    { label: 'Add number', detail: 'Register inventory', icon: FilePlus2, page: 'Numbers' },
    { label: 'Import numbers', detail: 'Upload a CSV', icon: Upload, page: 'Numbers' },
    { label: 'View accounts', detail: 'Review sessions', icon: Users, page: 'Telegram Accounts' },
    { label: 'View activity', detail: 'Inspect audit log', icon: Activity, page: 'Activity Logs' },
  ];

  return <div className="dashboard-view">
    <FadeIn className="dashboard-hero">
      <div><p className="dashboard-kicker">OPERATIONS / TODAY</p><h1>Good morning, {user.name.split(' ')[0]}.</h1><p>One clear view of your number inventory, account connections, and session health.</p></div>
      <div className="dashboard-hero-actions"><span className="sync-status"><i /> System operational</span><button className="dashboard-ghost-button"><Download size={16} /> Export report</button></div>
    </FadeIn>

    <Stagger className="dashboard-stat-grid">
      <StatCard label="Total numbers" value={totals.total} detail="Across all providers" tone="blue" icon={Phone} />
      <StatCard label="Active numbers" value={totals.active} detail={`${totals.total ? Math.round(totals.active / totals.total * 100) : 0}% of inventory`} tone="green" icon={CheckCircle2} />
      <StatCard label="Telegram linked" value={totals.linked} detail={`${totals.total ? Math.round(totals.linked / totals.total * 100) : 0}% connected`} tone="violet" icon={Smartphone} />
      <StatCard label="Blocked" value={totals.blocked} detail="Needs attention" tone="red" icon={CircleAlert} />
    </Stagger>

    <SlideUp className="quick-actions-panel"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">SHORTCUTS</p><h2>Quick actions</h2></div><span>Move through routine work faster</span></div><div className="quick-actions-grid">{quickActions.map(({ label, detail, icon: Icon, page }) => <button className="quick-action" key={label} onClick={() => onNavigate(page)}><span className="quick-action-icon"><Icon size={18} /></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight size={16} /></button>)}</div></SlideUp>

    <div className="dashboard-main-grid">
      <ScaleIn className="dashboard-panel chart-panel"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">LAST 7 EVENTS</p><h2>Activity pulse</h2></div><span className="chart-legend"><i /> Audit events</span></div>{activityData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityData} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5ca7ff" stopOpacity={0.35} /><stop offset="100%" stopColor="#5ca7ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(181, 201, 225, .1)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8291a5', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8291a5', fontSize: 10 }} /><Tooltip contentStyle={{ border: '1px solid rgba(181, 201, 225, .18)', borderRadius: 10, background: '#151c28', color: '#f4f7fb', fontSize: 12 }} /><Area type="monotone" dataKey="activity" stroke="#5ca7ff" strokeWidth={2} fill="url(#activityFill)" isAnimationActive /></AreaChart></ResponsiveContainer></div> : <div className="dashboard-empty"><Activity size={22} /><span>No activity recorded yet.</span><small>Events will appear here as your team works.</small></div>}</ScaleIn>
      <ScaleIn className="dashboard-panel distribution-panel"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">INVENTORY MIX</p><h2>Number status</h2></div><Phone size={17} /></div>{statusData.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={76} paddingAngle={4} stroke="none" isAnimationActive><Cell fill="#4fd39a" /><Cell fill="#65758a" /><Cell fill="#f4777c" /></Pie></PieChart></ResponsiveContainer><strong>{totals.total.toLocaleString()}<small>Total</small></strong></div><div className="distribution-legend">{statusData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value}</b></span>)}</div></> : <div className="dashboard-empty"><Phone size={22} /><span>No numbers yet.</span><small>Add inventory to see status distribution.</small></div>}</ScaleIn>
    </div>

    <div className="dashboard-bottom-grid">
      <SlideUp className="dashboard-panel timeline-panel"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">LIVE FEED</p><h2>Recent activity</h2></div><button className="dashboard-link" onClick={() => onNavigate('Activity Logs')}>View all <ArrowUpRight size={14} /></button></div>{stats.recentActivity.length ? <div className="activity-timeline">{stats.recentActivity.map((item) => <div className="timeline-item" key={item.id}><span className="timeline-dot"><Activity size={13} /></span><div><strong>{formatAction(item.action)}</strong><p>{item.resource} <span>·</span> {item.user?.name ?? 'System'}</p></div><time>{new Date(item.createdAt).toLocaleDateString()}</time></div>)}</div> : <div className="dashboard-empty"><Activity size={22} /><span>No activity recorded yet.</span></div>}</SlideUp>
      <div className="dashboard-side-stack"><SlideUp className="dashboard-panel health-panel-modern"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">SYSTEM</p><h2>System health</h2></div><span className="health-badge"><i /> Healthy</span></div><div className="health-list"><div><span><Database size={15} /> Database</span><strong><i />{stats.system.database}</strong></div><div><span><ShieldCheck size={15} /> API status</span><strong><i />{stats.system.api}</strong></div><div><span><RefreshCw size={15} /> Sync status</span><strong><i /> Up to date</strong></div></div></SlideUp><SlideUp className="dashboard-panel session-panel-modern"><div className="dashboard-section-heading"><div><p className="dashboard-kicker">TELEGRAM</p><h2>Recent sessions</h2></div><button className="dashboard-icon-button" aria-label="Refresh sessions"><RefreshCw size={15} /></button></div>{stats.recentSessions.length ? stats.recentSessions.slice(0, 3).map((session) => <div className="session-item" key={session.id}><span className="session-avatar-modern">{(session.account.username ?? 'U')[0].toUpperCase()}</span><span><strong>{session.account.username ? `@${session.account.username}` : 'Unnamed account'}</strong><small>{session.status.toLowerCase()}</small></span><span className="session-live"><i /> Live</span></div>) : <div className="dashboard-empty compact"><Clock3 size={18} /><span>No sessions recorded yet.</span></div>}</SlideUp></div>
    </div>
  </div>;
}

export { DashboardSkeleton };
