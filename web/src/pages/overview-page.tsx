import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from '../lib/api-client';
import { useWebSocket } from '../hooks/use-websocket';

const statCard = { background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 10, flex: 1, minWidth: 150 } as const;

export function OverviewPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => { get<{ data: any }>('/api/overview').then((r) => setData(r.data)).catch(() => {}); }, []);

  const onMsg = useCallback((msg: any) => {
    if (msg.type === 'system') setData((d) => d ? { ...d, system: { ...d.system, ...msg.data } } : d);
  }, []);

  useWebSocket(['system', 'logs'], onMsg);

  if (!data) return <p>{t('common.loading')}</p>;

  const successRate = data.calls24h.total > 0 ? Math.round((data.calls24h.success / data.calls24h.total) * 100) : 0;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>{t('nav.overview')}</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.calls24h')}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{data.calls24h.total}</div></div>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.successRate')}</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{successRate}%</div></div>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.activeKeys')}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{data.keys.active}</div></div>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.enabledTools')}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{data.tools.enabled}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.cpu')}</div><div style={{ fontSize: 24, fontWeight: 600 }}>{data.system.cpuLoad}%</div></div>
        <div style={statCard}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('overview.memory')}</div><div style={{ fontSize: 24, fontWeight: 600 }}>{data.system.memoryPercent}%</div></div>
      </div>
      <h3>{t('overview.recentActivity')}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.time')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.tool')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('logs.status')}</th>
        </tr></thead>
        <tbody>{data.recentActivity?.map((l: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8, fontSize: 13 }}>{new Date(l.created_at * 1000).toLocaleString()}</td>
            <td style={{ padding: 8 }}>{l.tool_name}</td>
            <td style={{ padding: 8 }}><span style={{ color: l.status === 'success' ? 'var(--success)' : l.status === 'error' ? 'var(--danger)' : 'var(--warning)' }}>{l.status}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
