import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, post, put, del } from '../lib/api-client';

const btn = { padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;

function copyText(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

const input = { padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' } as const;

interface Permission { tool_name: string; allowed: number }
interface ToolInfo { name: string; category: string; description: string; risk_level: string; enabled: number }

export function KeysPage() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '' });

  // Tool permissions panel
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [allTools, setAllTools] = useState<ToolInfo[]>([]);
  const [keyPerms, setKeyPerms] = useState<Permission[]>([]);
  const [filterText, setFilterText] = useState('');

  const load = () => get<{ data: any[] }>('/api/keys').then((r) => setKeys(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const res = await post<{ data: any }>('/api/keys', form);
    setNewKey(res.data.plaintext);
    setShowCreate(false);
    setForm({ name: '' });
    load();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const remove = async (id: number) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    await del(`/api/keys/${id}`);
    if (selectedKeyId === id) setSelectedKeyId(null);
    setConfirmDeleteId(null);
    load();
  };

  // Load tools + permissions when a key is selected
  const selectKey = async (id: number) => {
    if (selectedKeyId === id) { setSelectedKeyId(null); return; }
    setSelectedKeyId(id);
    const [toolsRes, permsRes] = await Promise.all([
      get<{ data: Record<string, ToolInfo[]> }>('/api/tools'),
      get<{ data: Permission[] }>(`/api/keys/${id}/permissions`),
    ]);
    // Flatten grouped tools
    const flat = Object.values(toolsRes.data).flat();
    setAllTools(flat);
    setKeyPerms(permsRes.data);
  };

  // Toggle a tool for the selected key
  const toggleTool = async (toolName: string) => {
    if (!selectedKeyId) return;
    const existing = keyPerms.find((p) => p.tool_name === toolName);

    if (!existing) {
      // No override yet → deny it
      await put(`/api/keys/${selectedKeyId}/permissions`, {
        permissions: [{ toolName, allowed: false }],
      });
    } else if (!existing.allowed) {
      // Currently denied → remove override (back to default allow)
      await put(`/api/keys/${selectedKeyId}/permissions`, {
        permissions: [{ toolName, allowed: null }],
      });
    } else {
      // Explicitly allowed → deny
      await put(`/api/keys/${selectedKeyId}/permissions`, {
        permissions: [{ toolName, allowed: false }],
      });
    }

    const permsRes = await get<{ data: Permission[] }>(`/api/keys/${selectedKeyId}/permissions`);
    setKeyPerms(permsRes.data);
  };

  const isToolAllowed = (toolName: string): boolean => {
    const perm = keyPerms.find((p) => p.tool_name === toolName);
    if (!perm) return true; // default allow
    return !!perm.allowed;
  };

  // Group tools by category for display
  const groupedTools = allTools.reduce<Record<string, ToolInfo[]>>((acc, tool) => {
    if (filterText && !tool.name.includes(filterText) && !tool.description.toLowerCase().includes(filterText.toLowerCase())) return acc;
    (acc[tool.category] ??= []).push(tool);
    return acc;
  }, {});

  const selectedKeyName = keys.find((k) => k.id === selectedKeyId)?.name;
  const deniedCount = keyPerms.filter((p) => !p.allowed).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>{t('keys.title')}</h2>
        <button style={btn} onClick={() => setShowCreate(true)}>{t('keys.create')}</button>
      </div>

      {newKey && (() => {
        const mcpUrl = `${window.location.origin}/mcp`;
        const mcpConfig = JSON.stringify({ mcpServers: { 'agent-remote': { url: mcpUrl, headers: { 'x-api-key': newKey } } } }, null, 2);
        return (
          <div style={{ background: '#14532d', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{t('keys.keyCreated')}</p>
            <code style={{ background: 'var(--bg)', padding: '8px 12px', borderRadius: 6, display: 'block', wordBreak: 'break-all' }}>{newKey}</code>
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, marginBottom: 6, color: 'var(--text-muted)' }}>{t('keys.mcpGuide')}</p>
              <pre style={{ background: 'var(--bg)', padding: 12, borderRadius: 6, fontSize: 12, overflow: 'auto', margin: 0 }}>{mcpConfig}</pre>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { copyText(newKey); }} style={{ ...btn, background: 'var(--success)' }}>{t('keys.copyKey')}</button>
              <button onClick={() => { copyText(mcpConfig); }} style={{ ...btn, background: 'var(--primary)' }}>{t('keys.copyConfig')}</button>
              <button onClick={() => setNewKey(null)} style={{ ...btn, background: 'var(--bg-hover)' }}>{t('common.close')}</button>
            </div>
          </div>
        );
      })()}

      {showCreate && (
        <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 8, marginBottom: 16 }}>
          <input placeholder={t('keys.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...input, marginRight: 8, width: 200 }} />
          <button onClick={create} style={btn}>{t('common.save')}</button>
          <button onClick={() => setShowCreate(false)} style={{ ...btn, background: 'var(--bg-hover)', marginLeft: 8 }}>{t('common.cancel')}</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.name')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.prefix')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.status')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('keys.lastUsed')}</th>
          <th style={{ padding: 8 }}></th>
        </tr></thead>
        <tbody>{keys.map((k) => (
          <tr key={k.id} style={{ borderBottom: '1px solid var(--border)', background: selectedKeyId === k.id ? 'var(--bg-hover)' : undefined, cursor: 'pointer' }} onClick={() => selectKey(k.id)}>
            <td style={{ padding: 8 }}>{k.name}</td>
            <td style={{ padding: 8, fontFamily: 'monospace' }}>{k.key_prefix}...</td>
            <td style={{ padding: 8 }}><span style={{ color: k.active ? 'var(--success)' : 'var(--text-muted)' }}>{k.active ? t('keys.active') : t('keys.inactive')}</span></td>
            <td style={{ padding: 8, fontSize: 13 }}>{k.last_used_at ? new Date(k.last_used_at * 1000).toLocaleString() : '-'}</td>
            <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
              {confirmDeleteId === k.id ? (
                <>
                  <button onClick={() => remove(k.id)} style={{ background: 'var(--danger)', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px 8px', borderRadius: 4, marginRight: 4 }}>Confirm</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 8px' }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteId(k.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px 8px', borderRadius: 4 }}>{t('keys.delete')}</button>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table>
      {keys.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t('common.noData')}</p>}

      {/* Tool permissions panel */}
      {selectedKeyId && allTools.length > 0 && (
        <div style={{ marginTop: 24, background: 'var(--bg-card)', borderRadius: 8, padding: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>
              {t('keys.toolPermissions')} — <span style={{ color: 'var(--primary)' }}>{selectedKeyName}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 12 }}>
                {allTools.length - deniedCount}/{allTools.length} {t('tools.enabled').toLowerCase()}
              </span>
            </h3>
            <input placeholder={t('keys.filterTools')} value={filterText} onChange={(e) => setFilterText(e.target.value)} style={{ ...input, width: 200 }} />
          </div>

          {Object.entries(groupedTools).map(([cat, tools]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <h4 style={{ textTransform: 'capitalize', marginBottom: 8, color: 'var(--text-muted)' }}>{cat}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {tools.map((tool) => {
                  const allowed = isToolAllowed(tool.name);
                  return (
                    <div key={tool.name} onClick={() => toggleTool(tool.name)} style={{
                      padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                      background: allowed ? 'var(--bg)' : 'var(--bg-hover)',
                      border: `1px solid ${allowed ? 'var(--success)' : 'var(--border)'}`,
                      opacity: allowed ? 1 : 0.5,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{tool.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tool.description}</div>
                      </div>
                      <div style={{
                        width: 36, height: 20, borderRadius: 10, position: 'relative',
                        background: allowed ? 'var(--success)' : 'var(--bg-hover)',
                        border: '1px solid var(--border)', flexShrink: 0, marginLeft: 12,
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 1, left: allowed ? 17 : 1,
                          transition: 'left 0.15s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
