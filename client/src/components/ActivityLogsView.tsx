import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Database, Filter, KeyRound, LogIn, LogOut, RefreshCw, Search, ShieldAlert, Smartphone, UserRound } from 'lucide-react';
import { AnimatedButton, FadeIn, Stagger } from './MotionPrimitives';
import { api } from '../services/api';
import './ActivityLogsView.css';

type LogItem = { id: string; action: string; resource: string; resourceId: string | null; ipAddress?: string | null; result: string; createdAt: string; user?: { name: string; email: string } | null };
type LogsResponse = { items: LogItem[]; pagination: { page: number; limit: number; total: number; pages: number } };

function iconFor(action: string) {
  if (action.includes('LOGIN')) return LogIn;
  if (action.includes('LOGOUT')) return LogOut;
  if (action.includes('NUMBER')) return Smartphone;
  if (action.includes('ACCOUNT')) return UserRound;
  if (action.includes('CONFIGURATION')) return KeyRound;
  if (action.includes('SESSION')) return ShieldAlert;
  return Activity;
}

function actionLabel(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());
}

function timeLabel(value: string) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (elapsed < 60 * 1000) return 'Just now';
  if (elapsed < 60 * 60 * 1000) return `${Math.floor(elapsed / (60 * 1000))}m ago`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / (60 * 60 * 1000))}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function LogStatus({ result }: { result: string }) {
  const success = result === 'SUCCESS';
  return <span className={`log-result ${success ? 'success' : 'failure'}`}><i />{result}</span>;
}

export function ActivityLogsView() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = () => {
    setLoading(true);
    api<LogsResponse>(`/logs?page=${page}`).then((data) => { setItems(data.items); setPagination(data.pagination); setError(''); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load activity logs')).finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, [page]);
  const visibleItems = items.filter((item) => { const needle = search.trim().toLowerCase(); const matchesSearch = !needle || [item.action, item.resource, item.resourceId, item.user?.name, item.user?.email].some((value) => value?.toLowerCase().includes(needle)); return matchesSearch && (!result || item.result === result); });
  const grouped = visibleItems.reduce<Record<string, LogItem[]>>((groups, item) => { const group = dateGroup(item.createdAt); (groups[group] ??= []).push(item); return groups; }, {});

  return <div className="logs-view"><FadeIn className="logs-heading"><div><p className="logs-kicker">AUDIT / ACTIVITY</p><h1>Activity logs</h1><p>Trace changes and security events across the workspace.</p></div><AnimatedButton className="logs-refresh" onClick={loadLogs}><RefreshCw size={15} /> Refresh</AnimatedButton></FadeIn><section className="logs-toolbar"><div className="logs-search"><Search size={16} /><input aria-label="Search activity logs" placeholder="Search actions, users, or resources" value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="logs-filter"><Filter size={14} /><select aria-label="Filter activity result" value={result} onChange={(event) => setResult(event.target.value)}><option value="">All results</option><option value="SUCCESS">Success</option><option value="FAILURE">Failure</option></select></label><span className="logs-count"><strong>{pagination.total.toLocaleString()}</strong> events</span></section>{loading ? <div className="logs-skeleton" role="status" aria-label="Loading activity logs">{[1, 2, 3, 4, 5].map((item) => <span key={item} />)}</div> : error ? <div className="logs-empty"><AlertCircle size={25} /><strong>Unable to load activity</strong><span>{error}</span><button onClick={loadLogs}>Try again</button></div> : visibleItems.length ? <Stagger className="logs-timeline">{Object.entries(grouped).map(([group, groupItems]) => <div className="log-group" key={group}><div className="log-group-label"><Clock3 size={14} />{group}</div>{groupItems.map((item) => <LogRow item={item} key={item.id} />)}</div>)}</Stagger> : <div className="logs-empty"><Database size={25} /><strong>No matching activity</strong><span>Try another search or result filter.</span></div>}{pagination.pages > 1 && <div className="logs-pagination"><span>Page {pagination.page} of {pagination.pages}</span><div><button aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /></button><button aria-label="Next page" disabled={pagination.page >= pagination.pages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={15} /></button></div></div>}</div>;
}

function LogRow({ item }: { item: LogItem }) {
  const Icon = iconFor(item.action);
  return <article className="log-row"><span className="log-line" /><span className="log-icon"><Icon size={16} /></span><div className="log-main"><div className="log-title"><strong>{actionLabel(item.action)}</strong><LogStatus result={item.result} /></div><p>{item.resource}{item.resourceId ? ` · ${item.resourceId.slice(0, 8)}` : ''}</p><div className="log-meta"><span><UserRound size={12} />{item.user?.name ?? 'System'}</span><span>{item.user?.email ?? 'Automated event'}</span></div></div><time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{timeLabel(item.createdAt)}</time></article>;
}
