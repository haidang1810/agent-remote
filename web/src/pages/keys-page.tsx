import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, post, del } from '../lib/api-client';

const btn = { padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
const input = { padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' } as const;

export function KeysPage() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', permissionGroup: 'read' });

  const load = () => get<{ data: any[] }>('/api/keys').then((r) => setKeys(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const res = await post<{ data: any }>('/api/keys', form);
    setNewKey(res.data.plaintext);
    setShowCreate(false);
    setForm({ name: '', permissionGroup: 'read' });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this key?')) return;
    await del(`/api/keys/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>{t('keys.title')}</h2>
        <button style={btn} onClick={() => setShowCreate(true)}>{t('keys.create')}</button>
      </div>

      {newKey && (
        <div style={{ background: '#14532d', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{t('keys.keyCreated')}</p>
          <code style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, display: 'block', wordBreak: 'break-all' }}>{newKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null); }} style={{ ...btn, marginTop: 8, background: 'var(--success)' }}>{t('keys.copyKey')}</button>
        </div>
      )}

      {showCreate && (
        <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 8, marginBottom: 16 }}>
          <input placeholder={t('keys.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...input, marginRight: 8, width: 200 }} />
          <select value={form.permissionGroup} onChange={(e) => setForm({ ...form, permissionGroup: e.target.value })} style={{ ...input, marginRight: 8 }}>
            <option value="read">read</option><option value="write">write</option><option value="admin">admin</option>
          </select>
          <button onClick={create} style={btn}>{t('common.save')}</button>
          <button onClick={() => setShowCreate(false)} style={{ ...btn, background: 'var(--bg-hover)', marginLeft: 8 }}>{t('common.cancel')}</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.name')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.prefix')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.group')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.status')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.lastUsed')}</th>
          <th style={{ padding: 8 }}></th>
        </tr></thead>
        <tbody>{keys.map((k) => (
          <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}>{k.name}</td>
            <td style={{ padding: 8, fontFamily: 'monospace' }}>{k.key_prefix}...</td>
            <td style={{ padding: 8 }}><span style={{ padding: '2px 8px', borderRadius: 4, background: k.permission_group === 'admin' ? 'var(--danger)' : k.permission_group === 'write' ? 'var(--warning)' : 'var(--primary)', fontSize: 12 }}>{k.permission_group}</span></td>
            <td style={{ padding: 8 }}><span style={{ color: k.active ? 'var(--success)' : 'var(--text-muted)' }}>{k.active ? t('keys.active') : t('keys.inactive')}</span></td>
            <td style={{ padding: 8, fontSize: 13 }}>{k.last_used_at ? new Date(k.last_used_at * 1000).toLocaleString() : '-'}</td>
            <td style={{ padding: 8 }}><button onClick={() => remove(k.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>{t('keys.delete')}</button></td>
          </tr>
        ))}</tbody>
      </table>
      {keys.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t('common.noData')}</p>}
    </div>
  );
}
