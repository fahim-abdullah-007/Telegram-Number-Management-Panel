import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Download, Edit3, FileUp, Filter, MoreHorizontal, Phone, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { AnimatedButton, AnimatedModal, AnimatedToast, FadeIn } from './MotionPrimitives';
import { api, NumberItem } from '../services/api';
import './NumbersView.css';

type NumberStatus = 'ACTIVE' | 'AVAILABLE' | 'INACTIVE' | 'BLOCKED';
type NumberForm = { country: string; countryCode: string; phoneNumber: string; provider: string; status: NumberStatus; notes: string };
type Pagination = { page: number; limit: number; total: number; pages: number };
type NumbersResponse = { items: NumberItem[]; pagination: Pagination };
type ImportResult = { total: number; successful: number; duplicate: number; invalid: number; failed: number };

const emptyForm: NumberForm = { country: '', countryCode: '', phoneNumber: '', provider: '', status: 'AVAILABLE', notes: '' };
const statusOptions: NumberStatus[] = ['ACTIVE', 'AVAILABLE', 'INACTIVE', 'BLOCKED'];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';
}

function escapeCsv(value: string | number | boolean | null) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function initialForm(item?: NumberItem | null): NumberForm {
  return item ? { country: item.country, countryCode: item.countryCode, phoneNumber: item.phoneNumber, provider: item.provider, status: item.status as NumberStatus, notes: '' } : emptyForm;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`number-status ${status.toLowerCase()}`}><i />{status}</span>;
}

function NumberFormModal({ open, editing, saving, error, onClose, onSubmit }: { open: boolean; editing: NumberItem | null; saving: boolean; error: string; onClose: () => void; onSubmit: (form: NumberForm) => void }) {
  const [form, setForm] = useState<NumberForm>(() => initialForm(editing));

  useEffect(() => setForm(initialForm(editing)), [editing, open]);
  const update = (field: keyof NumberForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return <AnimatedModal open={open} onClose={onClose} labelledBy="number-form-title"><div className="number-modal"><div className="modal-heading"><div><p className="numbers-kicker">INVENTORY / NUMBERS</p><h2 id="number-form-title">{editing ? 'Edit number' : 'Add number'}</h2><p>{editing ? 'Update inventory details and availability.' : 'Add a number you are authorized to manage.'}</p></div><button className="modal-close" aria-label="Close modal" onClick={onClose}><X size={18} /></button></div><form className="number-form" onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(form); }}><div className="form-grid"><label>Phone number<input value={form.phoneNumber} onChange={(event) => update('phoneNumber', event.target.value)} placeholder="+1 555 010 2048" required /></label><label>Country<input value={form.country} onChange={(event) => update('country', event.target.value)} placeholder="United States" required /></label><label>Country code<input value={form.countryCode} onChange={(event) => update('countryCode', event.target.value)} placeholder="+1" required /></label><label>Provider<input value={form.provider} onChange={(event) => update('provider', event.target.value)} placeholder="Twilio" required /></label><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Notes <span className="optional">Optional</span><input value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Internal note" /></label></div>{error && <div className="number-form-error"><X size={15} />{error}</div>}<div className="modal-actions"><AnimatedButton type="button" className="numbers-secondary-button" onClick={onClose}>Cancel</AnimatedButton><AnimatedButton type="submit" className="numbers-primary-button" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add number'} <Check size={15} /></AnimatedButton></div></form></div></AnimatedModal>;
}

function DeleteModal({ item, deleting, onClose, onConfirm }: { item: NumberItem | null; deleting: boolean; onClose: () => void; onConfirm: () => void }) {
  return <AnimatedModal open={Boolean(item)} onClose={onClose} labelledBy="delete-number-title"><div className="number-modal compact-modal"><div className="modal-heading"><div><span className="danger-icon"><Trash2 size={18} /></span><h2 id="delete-number-title">Delete number?</h2><p>This removes <strong>{item?.phoneNumber}</strong> from the local inventory. This action cannot be undone.</p></div><button className="modal-close" aria-label="Close modal" onClick={onClose}><X size={18} /></button></div><div className="modal-actions"><AnimatedButton type="button" className="numbers-secondary-button" onClick={onClose}>Cancel</AnimatedButton><AnimatedButton type="button" className="danger-button" onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete number'} <Trash2 size={15} /></AnimatedButton></div></div></AnimatedModal>;
}

export function NumbersView() {
  const [items, setItems] = useState<NumberItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<NumberItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NumberItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const numbersUrl = (requestedPage: number) => {
    const query = new URLSearchParams({ page: String(requestedPage), limit: '10' });
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);
    if (country.trim()) query.set('country', country.trim());
    return `/numbers?${query.toString()}`;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<NumbersResponse>(numbersUrl(page)).then((result) => { if (active) { setItems(result.items); setPagination(result.pagination); setLoadError(''); } }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load numbers'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status, country]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const openAdd = () => { setEditing(null); setFormError(''); setModalOpen(true); };
  const openEdit = (item: NumberItem) => { setEditing(item); setFormError(''); setModalOpen(true); };
  const resetFilters = () => { setSearch(''); setStatus(''); setCountry(''); setPage(1); };

  const saveNumber = async (form: NumberForm) => {
    setSaving(true); setFormError('');
    try {
      const path = editing ? `/numbers/${editing.id}` : '/numbers';
      await api<NumberItem>(path, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setModalOpen(false); notify(editing ? 'Number updated' : 'Number added');
      setPage((current) => current);
      const refreshed = await api<NumbersResponse>(numbersUrl(page));
      setItems(refreshed.items); setPagination(refreshed.pagination);
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Unable to save number'); } finally { setSaving(false); }
  };

  const deleteNumber = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api<null>(`/numbers/${deleteTarget.id}`, { method: 'DELETE' }); setDeleteTarget(null); notify('Number deleted'); const refreshed = await api<NumbersResponse>(numbersUrl(page)); setItems(refreshed.items); setPagination(refreshed.pagination); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to delete number'); } finally { setDeleting(false); }
  };

  const importNumbers = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { const result = await api<ImportResult>('/numbers/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: await file.text() }); notify(`${result.successful} number${result.successful === 1 ? '' : 's'} imported`); setPage(1); } catch (error) { notify(error instanceof Error ? error.message : 'Unable to import CSV'); }
  };

  const exportNumbers = () => {
    const header = ['phoneNumber', 'country', 'countryCode', 'provider', 'status', 'telegramLinked', 'createdAt'];
    const rows = items.map((item) => [item.phoneNumber, item.country, item.countryCode, item.provider, item.status, item.telegramLinked, item.createdAt]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'numbers.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="numbers-view"><FadeIn className="numbers-heading"><div><p className="numbers-kicker">INVENTORY / NUMBERS</p><h1>Number management</h1><p>Manage verified number inventory, availability, and Telegram links.</p></div><div className="numbers-heading-actions"><AnimatedButton className="numbers-secondary-button" onClick={exportNumbers}><Download size={15} /> Export</AnimatedButton><AnimatedButton className="numbers-primary-button" onClick={openAdd}><Plus size={16} /> Add number</AnimatedButton></div></FadeIn>
    <section className="numbers-toolbar"><div className="numbers-search"><Search size={17} /><input aria-label="Search numbers" placeholder="Search phone number or provider" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><kbd>⌘ K</kbd></div><div className="numbers-filters"><label><Filter size={14} /><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{statusOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select><ChevronDown size={14} /></label><label><Phone size={14} /><input aria-label="Filter by country" placeholder="Country" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }} /></label><button className="clear-filters" onClick={resetFilters} disabled={!search && !status && !country}><X size={13} /> Clear</button></div></section>
    <div className="numbers-meta"><span>{pagination.total.toLocaleString()} numbers <strong>{status || country || search ? 'matching filters' : 'in inventory'}</strong></span><div><input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={importNumbers} /><button className="numbers-meta-button" onClick={() => fileInput.current?.click()}><Upload size={14} /> Import CSV</button><button className="numbers-meta-button" onClick={exportNumbers}><FileUp size={14} /> Export view</button></div></div>
    <section className="numbers-table-panel">{loading ? <div className="numbers-skeleton" aria-label="Loading numbers" role="status">{[1, 2, 3, 4, 5].map((item) => <span key={item} />)}</div> : loadError ? <div className="numbers-empty"><CircleAlertIcon /><strong>Unable to load numbers</strong><span>{loadError}</span><button onClick={() => setPage((current) => current)}>Try again</button></div> : items.length ? <div className="numbers-table-wrap"><table><thead><tr><th>Number</th><th>Country</th><th>Provider</th><th>Status</th><th>Telegram</th><th>Last activity</th><th aria-label="Actions" /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td data-label="Number"><strong className="number-mono">{item.phoneNumber}</strong><small>{item.id.slice(0, 8)}</small></td><td data-label="Country"><strong>{item.country}</strong><small>{item.countryCode}</small></td><td data-label="Provider">{item.provider}</td><td data-label="Status"><StatusBadge status={item.status} /></td><td data-label="Telegram"><span className={item.telegramLinked ? 'telegram-linked' : 'telegram-unlinked'}><i />{item.telegramLinked ? 'Linked' : 'Unlinked'}</span></td><td data-label="Last activity">{formatDate(item.lastActivityAt)}</td><td className="number-actions"><button aria-label={`Edit ${item.phoneNumber}`} onClick={() => openEdit(item)}><Edit3 size={15} /></button><button aria-label={`Delete ${item.phoneNumber}`} onClick={() => setDeleteTarget(item)}><Trash2 size={15} /></button><MoreHorizontal size={16} /></td></tr>)}</tbody></table></div> : <div className="numbers-empty"><Phone size={25} /><strong>No numbers found</strong><span>Try adjusting your search or add your first authorized number.</span><button onClick={openAdd}><Plus size={15} /> Add your first number</button></div>}
      {pagination.pages > 1 && <div className="numbers-pagination"><span>Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span><div><button disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>{Array.from({ length: Math.min(pagination.pages, 5) }, (_, index) => index + 1).map((number) => <button className={number === pagination.page ? 'current' : ''} key={number} onClick={() => setPage(number)}>{number}</button>)}<button disabled={pagination.page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
    </section>
    <NumberFormModal open={modalOpen} editing={editing} saving={saving} error={formError} onClose={() => setModalOpen(false)} onSubmit={saveNumber} /><DeleteModal item={deleteTarget} deleting={deleting} onClose={() => setDeleteTarget(null)} onConfirm={deleteNumber} /><AnimatePresence><AnimatedToast open={Boolean(toast)}>{toast}</AnimatedToast></AnimatePresence>
  </div>;
}

function CircleAlertIcon() { return <span className="empty-alert">!</span>; }
