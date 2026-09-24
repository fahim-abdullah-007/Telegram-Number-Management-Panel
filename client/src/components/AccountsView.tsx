import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronDown, CircleUserRound, Link2, LogOut, MoreHorizontal, Phone, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { AnimatedButton, AnimatedModal, AnimatedToast, FadeIn, ScaleIn, Stagger } from './MotionPrimitives';
import type { NumberItem } from '../services/api';
import { api } from '../services/api';
import './AccountsView.css';

type Session = { id: string; status: string; createdAt: string; updatedAt: string; lastSeenAt: string | null };
type Account = { id: string; numberId: string; username: string | null; telegramUserId: string | null; displayName: string | null; status: string; createdAt: string; updatedAt: string; lastActiveAt: string | null; number: NumberItem; sessions: Session[] };
type AccountsResponse = { items: Account[]; pagination: { page: number; limit: number; total: number; pages: number } };

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';
}

function statusClass(status: string) {
  return status.toLowerCase();
}

function AccountStatus({ status }: { status: string }) {
  return <span className={`account-status ${statusClass(status)}`}><i />{status}</span>;
}

function DeleteAccountModal({ account, busy, onClose, onConfirm }: { account: Account | null; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  return <AnimatedModal open={Boolean(account)} onClose={onClose} labelledBy="delete-account-title"><div className="account-modal"><div className="account-modal-heading"><span className="account-danger-icon"><Trash2 size={18} /></span><div><h2 id="delete-account-title">Delete local account record?</h2><p>This removes the local record for <strong>{account?.username ? `@${account.username}` : account?.number.phoneNumber}</strong>. It does not create, authenticate, or recover a Telegram account.</p></div><button className="account-close" aria-label="Close modal" onClick={onClose}><X size={18} /></button></div><div className="account-modal-actions"><AnimatedButton className="accounts-secondary-button" onClick={onClose}>Cancel</AnimatedButton><AnimatedButton className="accounts-danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting...' : 'Delete record'} <Trash2 size={15} /></AnimatedButton></div></div></AnimatedModal>;
}

export function AccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const loadAccounts = () => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '10' });
    if (status) query.set('status', status);
    api<AccountsResponse>(`/accounts?${query.toString()}`).then((result) => { setAccounts(result.items); setTotal(result.pagination.total); setError(''); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts')).finally(() => setLoading(false));
  };

  useEffect(() => { loadAccounts(); }, [page, status]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const visibleAccounts = accounts.filter((account) => { const needle = search.trim().toLowerCase(); return !needle || [account.username, account.displayName, account.telegramUserId, account.number.phoneNumber, account.number.country].some((value) => value?.toLowerCase().includes(needle)); });

  const disconnect = async (account: Account) => {
    setBusy(true);
    try { await api<Account>(`/accounts/${account.id}/disconnect`, { method: 'POST' }); notify('Account disconnected'); loadAccounts(); } catch (disconnectError) { notify(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect account'); } finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await api<null>(`/accounts/${deleteTarget.id}`, { method: 'DELETE' }); setDeleteTarget(null); notify('Local account record deleted'); loadAccounts(); } catch (deleteError) { notify(deleteError instanceof Error ? deleteError.message : 'Unable to delete account'); } finally { setBusy(false); }
  };

  return <div className="accounts-view"><FadeIn className="accounts-heading"><div><p className="accounts-kicker">TELEGRAM / ACCOUNTS</p><h1>Account management</h1><p>Review authorized Telegram account metadata and session health.</p></div><div className="accounts-safety"><ShieldCheck size={16} /><span>Local records only</span></div></FadeIn><section className="accounts-toolbar"><div className="accounts-search"><Search size={16} /><input aria-label="Search accounts" placeholder="Search username, ID, or number" value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="account-filter"><span>Status</span><select aria-label="Filter accounts by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DISCONNECTED">Disconnected</option><option value="RESTRICTED">Restricted</option></select><ChevronDown size={14} /></label></section><div className="accounts-meta"><span><strong>{total.toLocaleString()}</strong> account records</span><span>Credentials and session secrets are never displayed</span></div>{loading ? <div className="account-card-grid account-skeleton" role="status" aria-label="Loading accounts">{[1, 2, 3].map((item) => <span key={item} />)}</div> : error ? <div className="accounts-empty"><CircleUserRound size={25} /><strong>Unable to load accounts</strong><span>{error}</span><button onClick={loadAccounts}>Try again</button></div> : visibleAccounts.length ? <Stagger className="account-card-grid">{visibleAccounts.map((account) => <AccountCard account={account} expanded={expanded === account.id} busy={busy} key={account.id} onToggle={() => setExpanded(expanded === account.id ? null : account.id)} onDisconnect={() => disconnect(account)} onDelete={() => setDeleteTarget(account)} />)}</Stagger> : <div className="accounts-empty"><CircleUserRound size={25} /><strong>{search ? 'No matching accounts' : 'No account records yet'}</strong><span>{search ? 'Try another username, ID, or number.' : 'Authorized account metadata will appear here after a legitimate connection.'}</span></div>}{!loading && total > 10 && <div className="accounts-pagination"><span>Page {page}</span><div><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><button disabled={accounts.length < 10} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}<DeleteAccountModal account={deleteTarget} busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={deleteAccount} /><AnimatePresence><AnimatedToast open={Boolean(toast)}>{toast}</AnimatedToast></AnimatePresence></div>;
}

function AccountCard({ account, expanded, busy, onToggle, onDisconnect, onDelete }: { account: Account; expanded: boolean; busy: boolean; onToggle: () => void; onDisconnect: () => void; onDelete: () => void }) {
  const initials = (account.displayName ?? account.username ?? 'TG').slice(0, 2).toUpperCase();
  const activeSessions = account.sessions.filter((session) => session.status === 'ACTIVE').length;
  return <ScaleIn className={`account-card${expanded ? ' expanded' : ''}`}><button className="account-card-header" onClick={onToggle} aria-expanded={expanded}><span className="account-avatar">{initials}</span><span className="account-identity"><strong>{account.displayName ?? (account.username ? `@${account.username}` : 'Unnamed account')}</strong><small>{account.username ? `@${account.username}` : 'No username set'}</small></span><AccountStatus status={account.status} /><ChevronDown className="account-chevron" size={18} /></button><div className="account-summary"><span><Phone size={14} />{account.number.phoneNumber}</span><span><Link2 size={14} />{account.number.provider}</span><span><Activity size={14} />{activeSessions} active session{activeSessions === 1 ? '' : 's'}</span></div><AnimatePresence initial={false}>{expanded && <motion.div className="account-details" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><div className="account-detail-grid"><div><small>Telegram user ID</small><strong className="account-mono">{account.telegramUserId ?? 'Not available'}</strong></div><div><small>Associated number</small><strong>{account.number.country} {account.number.countryCode} · {account.number.phoneNumber}</strong></div><div><small>Last active</small><strong>{dateLabel(account.lastActiveAt)}</strong></div><div><small>Record created</small><strong>{dateLabel(account.createdAt)}</strong></div></div><div className="account-session-list"><div className="session-list-heading"><span>Session status</span><strong>{account.sessions.length} total</strong></div>{account.sessions.length ? account.sessions.map((session) => <div className="account-session" key={session.id}><span><i className={session.status.toLowerCase()} />{session.status}</span><small>Last seen {dateLabel(session.lastSeenAt)}</small></div>) : <span className="no-sessions">No session records.</span>}</div><div className="account-actions"><AnimatedButton className="accounts-secondary-button" onClick={onDisconnect} disabled={busy || account.status === 'DISCONNECTED'}><LogOut size={14} />{account.status === 'DISCONNECTED' ? 'Disconnected' : 'Disconnect'}</AnimatedButton><AnimatedButton className="accounts-danger-ghost" onClick={onDelete}><Trash2 size={14} /> Delete local record</AnimatedButton></div></motion.div>}</AnimatePresence></ScaleIn>;
}
