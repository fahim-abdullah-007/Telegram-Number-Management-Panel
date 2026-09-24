import { useEffect, useState } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, RotateCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { AnimatedButton, AnimatedModal, AnimatedToast, FadeIn } from './MotionPrimitives';
import { api } from '../services/api';
import './ApiKeysView.css';

type ApiKeyItem = { id: string; name: string; keyPrefix: string; scopes: string[]; status: string; createdAt: string; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string | null };
type ApiKeysResponse = { items: ApiKeyItem[]; scopes: string[] };

const scopeLabels: Record<string, string> = { 'numbers:read': 'Read number inventory', 'numbers:write': 'Modify number inventory', 'telegram:read': 'Read Telegram accounts', 'telegram:write': 'Modify Telegram integration', 'dashboard:read': 'Read dashboard analytics', 'activity:read': 'Read activity logs' };

function dateLabel(value: string | null) { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'; }

export function ApiKeysView() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [availableScopes, setAvailableScopes] = useState<string[]>(Object.keys(scopeLabels));
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['numbers:read']);
  const [expiresAt, setExpiresAt] = useState('');
  const [oneTimeKey, setOneTimeKey] = useState<{ name: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => { setLoading(true); api<ApiKeysResponse>('/api-keys').then((data) => { setItems(data.items); setAvailableScopes(data.scopes); }).catch((error) => setToast(error instanceof Error ? error.message : 'Unable to load API keys')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const toggleScope = (scope: string) => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  const create = async () => {
    if (!name.trim() || !scopes.length) return;
    setBusy(true);
    try { const result = await api<{ name: string; key: string }>('/api-keys', { method: 'POST', body: JSON.stringify({ name: name.trim(), scopes, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) }); setModalOpen(false); setName(''); setScopes(['numbers:read']); setExpiresAt(''); setOneTimeKey({ name: result.name, key: result.key }); load(); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to create API key'); } finally { setBusy(false); }
  };
  const revoke = async (id: string) => { setBusy(true); try { await api<null>(`/api-keys/${id}`, { method: 'DELETE' }); notify('API key revoked'); load(); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to revoke API key'); } finally { setBusy(false); } };
  const rotate = async (id: string) => { setBusy(true); try { const result = await api<{ name: string; key: string }>(`/api-keys/${id}/rotate`, { method: 'POST' }); setOneTimeKey({ name: result.name, key: result.key }); load(); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to rotate API key'); } finally { setBusy(false); } };
  const copy = async () => { if (!oneTimeKey) return; await navigator.clipboard.writeText(oneTimeKey.key); notify('API key copied to clipboard'); };

  return <div className="api-keys-view"><div className="api-keys-header"><div><p className="settings-kicker">DEVELOPER ACCESS</p><h2>API keys</h2><p>Create scoped keys for authorized integrations. Full secrets are shown only once.</p></div><AnimatedButton className="settings-primary-button" onClick={() => setModalOpen(true)}><Plus size={15} /> Create API key</AnimatedButton></div><div className="api-key-safety"><ShieldCheck size={16} /><span>Keys are hashed at rest and never included in normal list responses.</span></div>{loading ? <div className="api-key-list-skeleton">{[1, 2].map((item) => <span key={item} />)}</div> : items.length ? <div className="api-key-list">{items.map((item) => <FadeIn className="api-key-card" key={item.id}><div className="api-key-card-top"><span className="api-key-icon"><KeyRound size={17} /></span><div><strong>{item.name}</strong><small>{item.keyPrefix}••••••••</small></div><span className={`api-key-status ${item.status.toLowerCase()}`}><i />{item.status}</span></div><div className="api-key-meta"><span>Created {dateLabel(item.createdAt)}</span><span>Last used {dateLabel(item.lastUsedAt)}</span><span>{item.expiresAt ? `Expires ${dateLabel(item.expiresAt)}` : 'No expiration'}</span></div><div className="api-key-scopes">{item.scopes.map((scope) => <span key={scope}>{scope}</span>)}</div><div className="api-key-actions"><AnimatedButton className="api-key-rotate" disabled={busy || item.status !== 'ACTIVE'} onClick={() => rotate(item.id)}><RotateCw size={14} /> Rotate</AnimatedButton><AnimatedButton className="api-key-revoke" disabled={busy || item.status !== 'ACTIVE'} onClick={() => revoke(item.id)}><Trash2 size={14} /> Revoke</AnimatedButton></div></FadeIn>)}</div> : <div className="api-key-empty"><KeyRound size={24} /><strong>No API keys yet</strong><span>Create a scoped key for an authorized integration.</span><button onClick={() => setModalOpen(true)}><Plus size={14} /> Create your first key</button></div>}<CreateKeyModal open={modalOpen} name={name} scopes={scopes} expiresAt={expiresAt} availableScopes={availableScopes} busy={busy} onName={setName} onExpiresAt={setExpiresAt} onToggleScope={toggleScope} onClose={() => setModalOpen(false)} onCreate={create} /><OneTimeKeyModal value={oneTimeKey} onCopy={copy} onClose={() => setOneTimeKey(null)} /><AnimatedToast open={Boolean(toast)}>{toast}</AnimatedToast></div>;
}

function CreateKeyModal({ open, name, scopes, expiresAt, availableScopes, busy, onName, onExpiresAt, onToggleScope, onClose, onCreate }: { open: boolean; name: string; scopes: string[]; expiresAt: string; availableScopes: string[]; busy: boolean; onName: (value: string) => void; onExpiresAt: (value: string) => void; onToggleScope: (value: string) => void; onClose: () => void; onCreate: () => void }) {
  return <AnimatedModal open={open} onClose={onClose} labelledBy="create-api-key-title"><div className="api-key-modal"><div className="api-key-modal-heading"><div><p className="settings-kicker">DEVELOPER ACCESS</p><h2 id="create-api-key-title">Create API key</h2><p>Choose the minimum permissions this integration needs.</p></div><button aria-label="Close create API key modal" onClick={onClose}><X size={17} /></button></div><label>Key name<input value={name} onChange={(event) => onName(event.target.value)} placeholder="My integration" maxLength={100} /></label><label>Expiration <span className="api-key-optional">Optional</span><input type="datetime-local" value={expiresAt} onChange={(event) => onExpiresAt(event.target.value)} /></label><div className="scope-picker"><strong>Permissions</strong>{availableScopes.map((scope) => <label className="scope-option" key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={() => onToggleScope(scope)} /><span><b>{scope}</b><small>{scopeLabels[scope] ?? scope}</small></span></label>)}</div><div className="api-key-modal-actions"><AnimatedButton className="accounts-secondary-button" onClick={onClose}>Cancel</AnimatedButton><AnimatedButton className="settings-primary-button" disabled={busy || !name.trim() || !scopes.length} onClick={onCreate}>{busy ? 'Creating...' : 'Create key'} <KeyRound size={14} /></AnimatedButton></div></div></AnimatedModal>;
}

function OneTimeKeyModal({ value, onCopy, onClose }: { value: { name: string; key: string } | null; onCopy: () => void; onClose: () => void }) {
  return <AnimatedModal open={Boolean(value)} onClose={onClose} labelledBy="new-api-key-title"><div className="api-key-modal one-time-key"><div className="api-key-modal-heading"><div><p className="settings-kicker">SAVE THIS SECRET</p><h2 id="new-api-key-title">{value?.name}</h2><p>Copy this API key now. For security, the complete key will not be shown again.</p></div><button aria-label="Close new API key modal" onClick={onClose}><X size={17} /></button></div><div className="one-time-value">{value?.key}</div><div className="api-key-modal-actions"><AnimatedButton className="settings-primary-button" onClick={onCopy}><Copy size={14} /> Copy API key</AnimatedButton><AnimatedButton className="accounts-secondary-button" onClick={onClose}>I saved it</AnimatedButton></div></div></AnimatedModal>;
}
