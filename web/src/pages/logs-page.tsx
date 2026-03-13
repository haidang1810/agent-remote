import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from '../lib/api-client';
import { useWebSocket } from '../hooks/use-websocket';

const statusColors: Record<string, string> = { success: 'var(--success)', error: 'var(--danger)', denied: 'var(--warning)', timeout: 'var(--text-muted)' };

export function LogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({ tool: '', status: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (filter.tool) params.set('tool', filter.tool);
    if (filter.status) params.set('status', filter.status);
    get<{ data: any[]; meta: { hasMore: boolean } }>(`/api/logs?${params}`).then((r) => {
      setLogs(r.data);
      setHasMore(r.meta.hasMore);
    });
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const onMsg = useCallback((msg: any) => {
    if (msg.type === 'logs') setLogs((prev) => [msg.data, ...prev].slice(0, 30));
  }, []);

  useWebSocket(['logs'], onMsg);

  const exportCsv = () => { window.open('/api/logs/export', '_blank'); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>{t('logs.title')}</h2>
        <button onClick={exportCsv} style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>{t('logs.export')}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder={t('logs.tool')} value={filter.tool} onChange={(e) => { setFilter({ ...filter, tool: e.target.value }); setPage(1); }}
          style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
        <select value={filter.status} onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
          style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
          <option value="">{t('logs.status')}</option>
          <option value="success">{t('logs.success')}</option>
          <option value="error">{t('logs.error')}</option>
          <option value="denied">{t('logs.denied')}</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.time')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.keyName')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.tool')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.status')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.duration')}</th>
        </tr></thead>
        <tbody>{logs.map((l, i) => (
          <tr key={l.id ?? i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => l.id && get(`/api/logs/${l.id}`).then((r: any) => setDetail(r.data))}>
            <td style={{ padding: 8, fontSize: 13 }}>{new Date((l.created_at ?? l.timestamp) * 1000).toLocaleString()}</td>
            <td style={{ padding: 8 }}>{l.api_key_name || '-'}</td>
            <td style={{ padding: 8 }}>{l.tool_name}</td>
            <td style={{ padding: 8 }}><span style={{ color: statusColors[l.status] || 'var(--text)' }}>{l.status}</span></td>
            <td style={{ padding: 8, fontSize: 13 }}>{l.duration_ms != null ? `${l.duration_ms}ms` : '-'}</td>
          </tr>
        ))}</tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {page > 1 && <button onClick={() => setPage(page - 1)} style={{ padding: '6px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>Prev</button>}
        {hasMore && <button onClick={() => setPage(page + 1)} style={{ padding: '6px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}>Next</button>}
      </div>

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }} onClick={() => setDetail(null)}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Log Detail</h3>
            <pre style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(detail, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
