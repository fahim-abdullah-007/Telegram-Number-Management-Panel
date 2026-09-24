import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight, CircleHelp, Database, EyeOff, KeyRound, LockKeyhole, MonitorCog, Radio, RefreshCw, Server, ShieldCheck, SlidersHorizontal, Sparkles, UserRound, Users, Wifi, X } from 'lucide-react';
import { AnimatedButton, FadeIn, ScaleIn } from './MotionPrimitives';
import { api, User } from '../services/api';
import { ApiKeysView } from './ApiKeysView';
import './SettingsView.css';

type SettingsTab = 'General' | 'Telegram Integration' | 'API Keys' | 'Security' | 'Users' | 'System';
type TelegramStatus = { configured: boolean; connection: string; lastSynchronization: string | null };

const tabs: { label: SettingsTab; icon: typeof SlidersHorizontal; description: string }[] = [
  { label: 'General', icon: SlidersHorizontal, description: 'Workspace preferences' },
  { label: 'Telegram Integration', icon: Radio, description: 'Connection status' },
  { label: 'API Keys', icon: KeyRound, description: 'Scoped integrations' },
  { label: 'Security', icon: ShieldCheck, description: 'Access and protection' },
  { label: 'Users', icon: Users, description: 'Workspace access' },
  { label: 'System', icon: Server, description: 'Runtime health' },
];

function StatusPill({ active, children }: { active: boolean; children: string }) {
  return <span className={`settings-status ${active ? 'online' : 'offline'}`}><i />{children}</span>;
}

export function SettingsView({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState(() => localStorage.getItem('settings_notifications') !== 'off');
  const [compact, setCompact] = useState(() => localStorage.getItem('settings_density') === 'compact');

  const loadTelegramStatus = () => {
    setTelegramLoading(true);
    api<TelegramStatus>('/telegram/status').then(setTelegram).catch(() => setTelegram(null)).finally(() => setTelegramLoading(false));
  };
  useEffect(() => { loadTelegramStatus(); }, []);
  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 3200); };
  const saveNotifications = (value: boolean) => { setNotifications(value); localStorage.setItem('settings_notifications', value ? 'on' : 'off'); notify('Notification preference saved'); };
  const saveDensity = (value: boolean) => { setCompact(value); localStorage.setItem('settings_density', value ? 'compact' : 'comfortable'); notify('Display preference saved'); };
  const setConnection = async (connect: boolean) => {
    setTelegramBusy(true);
    try { await api<{ connection: string }>(connect ? '/telegram/connect' : '/telegram/disconnect', { method: 'POST' }); notify(connect ? 'Telegram integration marked connected' : 'Telegram integration disconnected'); loadTelegramStatus(); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to update Telegram connection'); } finally { setTelegramBusy(false); }
  };

  return <div className="settings-view"><FadeIn className="settings-heading"><div><p className="settings-kicker">WORKSPACE / SETTINGS</p><h1>Settings</h1><p>Control workspace preferences, connections, and access visibility.</p></div><div className="settings-user-chip"><span>{user.name[0]}</span><strong>{user.name}</strong><small>{user.role}</small></div></FadeIn><div className="settings-layout"><nav className="settings-tabs" aria-label="Settings sections">{tabs.map(({ label, icon: Icon, description }) => <button className={activeTab === label ? 'active' : ''} key={label} onClick={() => setActiveTab(label)} aria-current={activeTab === label ? 'page' : undefined}><Icon size={17} /><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={15} /></button>)}</nav><main className="settings-content"><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}><SettingsPanel tab={activeTab} telegram={telegram} telegramLoading={telegramLoading} telegramBusy={telegramBusy} notifications={notifications} compact={compact} onNotificationChange={saveNotifications} onDensityChange={saveDensity} onTelegramChange={setConnection} onRefreshTelegram={loadTelegramStatus} user={user} /></motion.div></AnimatePresence></main></div>{message && <div className="settings-toast" role="status"><Check size={15} />{message}</div>}</div>;
}

function SettingsPanel({ tab, telegram, telegramLoading, telegramBusy, notifications, compact, onNotificationChange, onDensityChange, onTelegramChange, onRefreshTelegram, user }: { tab: SettingsTab; telegram: TelegramStatus | null; telegramLoading: boolean; telegramBusy: boolean; notifications: boolean; compact: boolean; onNotificationChange: (value: boolean) => void; onDensityChange: (value: boolean) => void; onTelegramChange: (connect: boolean) => void; onRefreshTelegram: () => void; user: User }) {
  if (tab === 'General') return <GeneralPanel notifications={notifications} compact={compact} onNotificationChange={onNotificationChange} onDensityChange={onDensityChange} />;
  if (tab === 'Telegram Integration') return <TelegramPanel telegram={telegram} loading={telegramLoading} busy={telegramBusy} onChange={onTelegramChange} onRefresh={onRefreshTelegram} />;
  if (tab === 'API Keys') return <ApiKeysView />;
  if (tab === 'Security') return <SecurityPanel user={user} />;
  if (tab === 'Users') return <UsersPanel user={user} />;
  return <SystemPanel />;
}

function PanelHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="settings-panel-header"><p className="settings-kicker">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>;
}

function GeneralPanel({ notifications, compact, onNotificationChange, onDensityChange }: { notifications: boolean; compact: boolean; onNotificationChange: (value: boolean) => void; onDensityChange: (value: boolean) => void }) {
  return <div className="settings-panel"><PanelHeader eyebrow="PREFERENCES" title="General settings" description="Tune the workspace for the way your team operates." /><div className="settings-options"><SettingRow icon={Bell} title="Activity notifications" description="Show feedback when workspace actions complete."><Toggle checked={notifications} onChange={onNotificationChange} /></SettingRow><SettingRow icon={MonitorCog} title="Compact density" description="Use tighter spacing for high-volume inventory work."><Toggle checked={compact} onChange={onDensityChange} /></SettingRow><SettingRow icon={Sparkles} title="Motion preference" description="Animations follow your operating system reduced-motion setting."><span className="settings-readonly">System controlled</span></SettingRow></div><div className="settings-note"><CircleHelp size={16} /><span>General preferences are stored locally in this browser. They do not contain credentials or API secrets.</span></div></div>;
}

function TelegramPanel({ telegram, loading, busy, onChange, onRefresh }: { telegram: TelegramStatus | null; loading: boolean; busy: boolean; onChange: (connect: boolean) => void; onRefresh: () => void }) {
  const connected = telegram?.connection === 'CONNECTED';
  return <div className="settings-panel"><div className="settings-panel-header with-action"><div><p className="settings-kicker">OFFICIAL API CONFIGURATION</p><h2>Telegram integration</h2><p>Manage the local connection state for an authorized Telegram integration.</p></div><button className="settings-icon-button" aria-label="Refresh Telegram status" onClick={onRefresh}><RefreshCw size={16} /></button></div><ScaleIn className="integration-card"><div className="integration-brand"><span><Radio size={22} /></span><div><strong>Telegram API</strong><small>Official integration status</small></div></div>{loading ? <div className="integration-loading"><span /><span /></div> : <><StatusPill active={connected}>{connected ? 'Connected' : 'Disconnected'}</StatusPill><div className="integration-grid"><div><small>Credentials</small><strong>{telegram?.configured ? 'Configured in environment' : 'Not configured'}</strong></div><div><small>Last synchronization</small><strong>{telegram?.lastSynchronization ? new Date(telegram.lastSynchronization).toLocaleString() : 'Not synchronized'}</strong></div><div><small>Secrets</small><strong>Never displayed</strong></div></div><div className="integration-actions">{connected ? <AnimatedButton className="settings-secondary-button" disabled={busy} onClick={() => onChange(false)}>{busy ? 'Updating...' : 'Disconnect integration'} <X size={15} /></AnimatedButton> : <AnimatedButton className="settings-primary-button" disabled={busy || !telegram?.configured} onClick={() => onChange(true)}>{busy ? 'Updating...' : 'Mark as connected'} <Wifi size={15} /></AnimatedButton>}{!telegram?.configured && <span className="settings-action-hint">Add environment configuration before connecting.</span>}</div></>}</ScaleIn><div className="settings-note"><ShieldCheck size={16} /><span>Connection controls only update the authorized integration state. They do not create accounts, retrieve verification codes, or store session secrets.</span></div></div>;
}

function SecurityPanel({ user }: { user: User }) {
  return <div className="settings-panel"><PanelHeader eyebrow="ACCESS CONTROL" title="Security" description="Review the protections applied to this workspace." /><div className="security-grid"><SecurityCard icon={LockKeyhole} title="JWT authentication" text="Protected API routes require an authenticated bearer token." /><SecurityCard icon={KeyRound} title="Password protection" text="User passwords are handled by the server with bcrypt hashing." /><SecurityCard icon={EyeOff} title="Secret redaction" text="Tokens, API hashes, OTPs, and session secrets are never shown here." /></div><div className="current-access"><span className="access-avatar">{user.name[0]}</span><div><strong>Signed in as {user.name}</strong><small>{user.email} · {user.role}</small></div><StatusPill active>Authenticated</StatusPill></div></div>;
}

function UsersPanel({ user }: { user: User }) {
  return <div className="settings-panel"><PanelHeader eyebrow="WORKSPACE ACCESS" title="Users" description="Review the current user context and role permissions." /><div className="user-row"><span className="access-avatar">{user.name[0]}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span className="role-badge">{user.role}</span></div><div className="permissions-grid"><Permission label="View inventory and accounts" enabled /><Permission label="Review activity logs" enabled /><Permission label="Modify number inventory" enabled={user.role !== 'VIEWER'} /><Permission label="Manage Telegram integration" enabled={user.role === 'ADMIN'} /><Permission label="Manage workspace users" enabled={user.role === 'ADMIN'} /></div><div className="settings-note"><Users size={16} /><span>User administration endpoints are not exposed by the current backend. This view remains read-only until those contracts exist.</span></div></div>;
}

function SystemPanel() {
  return <div className="settings-panel"><PanelHeader eyebrow="RUNTIME / HEALTH" title="System settings" description="Operational details for this panel instance." /><div className="system-grid"><SystemCard icon={Server} label="API service" value="Connected through authenticated REST" /><SystemCard icon={Database} label="Database" value="Managed by the server layer" /><SystemCard icon={Wifi} label="Environment" value={import.meta.env.MODE === 'production' ? 'Production' : 'Development'} /><SystemCard icon={MonitorCog} label="Browser" value={navigator.userAgent.split(' ').slice(-1)[0] ?? 'Unknown'} /></div><div className="settings-note"><ShieldCheck size={16} /><span>Database credentials, JWT secrets, and environment values are never exposed by this interface.</span></div></div>;
}

function SettingRow({ icon: Icon, title, description, children }: { icon: typeof Bell; title: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><span className="setting-icon"><Icon size={16} /></span><span><strong>{title}</strong><small>{description}</small></span>{children}</div>;
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button className={`settings-toggle${checked ? ' checked' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span /></button>; }
function SecurityCard({ icon: Icon, title, text }: { icon: typeof LockKeyhole; title: string; text: string }) { return <div className="security-card"><span className="setting-icon"><Icon size={17} /></span><strong>{title}</strong><p>{text}</p></div>; }
function Permission({ label, enabled }: { label: string; enabled: boolean }) { return <div className="permission"><span className={enabled ? 'permission-check' : 'permission-disabled'}>{enabled ? <Check size={13} /> : <X size={13} />}</span><span>{label}</span></div>; }
function SystemCard({ icon: Icon, label, value }: { icon: typeof Server; label: string; value: string }) { return <div className="system-card"><span className="setting-icon"><Icon size={16} /></span><small>{label}</small><strong>{value}</strong></div>; }
