import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from '../lib/api-client';
import { useWebSocket } from '../hooks/use-websocket';

const card = { background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 10, flex: 1, minWidth: 150 } as const;

export function SystemPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [procs, setProcs] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [docker, setDocker] = useState<any[]>([]);

  useEffect(() => {
    get<{ data: any }>('/api/system/stats').then((r) => setStats(r.data));
    get<{ data: any[] }>('/api/system/processes').then((r) => setProcs(r.data));
    get<{ data: any[] }>('/api/system/ports').then((r) => setPorts(r.data));
    get<{ data: any[] }>('/api/system/docker').then((r) => setDocker(r.data)).catch(() => {});
  }, []);

  const onMsg = useCallback((msg: any) => {
    if (msg.type === 'system') setStats((s: any) => s ? { ...s, cpu: { ...s.cpu, load: msg.data.cpuLoad }, memory: { ...s.memory, percent: msg.data.memoryPercent } } : s);
  }, []);

  useWebSocket(['system'], onMsg);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>{t('system.title')}</h2>

      {stats && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={card}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>CPU</div><div style={{ fontSize: 28, fontWeight: 700 }}>{stats.cpu.load}%</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.cpu.cores} cores</div></div>
          <div style={card}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>RAM</div><div style={{ fontSize: 28, fontWeight: 700 }}>{stats.memory.percent}%</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.memory.usedGB}/{stats.memory.totalGB} GB</div></div>
          <div style={card}><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Hostname</div><div style={{ fontSize: 18, fontWeight: 600 }}>{stats.hostname}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Up {Math.floor(stats.uptime / 3600)}h</div></div>
        </div>
      )}

      <h3 style={{ marginBottom: 12 }}>{t('system.processes')}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('system.pid')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('system.cpuPercent')}</th>
          <th style={{ textAlign: 'left', padding: 8 }}>{t('system.memPercent')}</th>
        </tr></thead>
        <tbody>{procs.map((p, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}>{p.pid}</td><td style={{ padding: 8 }}>{p.name}</td>
            <td style={{ padding: 8 }}>{p.cpu?.toFixed(1)}%</td><td style={{ padding: 8 }}>{p.mem?.toFixed(1)}%</td>
          </tr>
        ))}</tbody>
      </table>

      <h3 style={{ marginBottom: 12 }}>{t('system.ports')}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>Protocol</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Port</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Address</th>
          <th style={{ textAlign: 'left', padding: 8 }}>PID</th>
        </tr></thead>
        <tbody>{ports.map((p, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: 8 }}>{p.protocol}</td><td style={{ padding: 8 }}>{p.port}</td>
            <td style={{ padding: 8 }}>{p.address}</td><td style={{ padding: 8 }}>{p.pid}</td>
          </tr>
        ))}</tbody>
      </table>

      {docker.length > 0 && (<>
        <h3 style={{ marginBottom: 12 }}>{t('system.docker')}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Name</th><th style={{ textAlign: 'left', padding: 8 }}>Image</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th><th style={{ textAlign: 'left', padding: 8 }}>State</th>
          </tr></thead>
          <tbody>{docker.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: 8 }}>{c.name}</td><td style={{ padding: 8 }}>{c.image}</td>
              <td style={{ padding: 8 }}>{c.status}</td><td style={{ padding: 8 }}>{c.state}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}
    </div>
  );
}
