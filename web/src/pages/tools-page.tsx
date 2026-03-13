import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get, put } from '../lib/api-client';

const riskColors: Record<string, string> = { low: 'var(--success)', medium: 'var(--warning)', high: '#f97316', critical: 'var(--danger)' };

export function ToolsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Record<string, any[]>>({});

  const load = () => get<{ data: Record<string, any[]> }>('/api/tools').then((r) => setGroups(r.data));
  useEffect(() => { load(); }, []);

  const toggle = async (name: string, enabled: boolean) => {
    await put(`/api/tools/${name}`, { enabled: !enabled });
    load();
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>{t('tools.title')}</h2>
      {Object.entries(groups).map(([cat, tools]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ textTransform: 'capitalize', marginBottom: 12 }}>{cat}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {tools.map((tool) => (
              <div key={tool.name} style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>{tool.name}</strong>
                  <span style={{ color: riskColors[tool.risk_level] || 'var(--text-muted)', fontSize: 12, padding: '2px 8px', borderRadius: 4, border: `1px solid ${riskColors[tool.risk_level]}` }}>{t(`tools.${tool.risk_level}`)}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{tool.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{t('tools.callCount')}: {tool.call_count}</span>
                  <button onClick={() => toggle(tool.name, !!tool.enabled)} style={{
                    padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: tool.enabled ? 'var(--success)' : 'var(--bg-hover)', color: '#fff', fontSize: 12,
                  }}>{tool.enabled ? t('tools.enabled') : t('tools.disabled')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
