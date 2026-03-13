import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const card = { background: 'var(--bg-card)', padding: '2rem', borderRadius: 12, maxWidth: 400, width: '100%' } as const;
const input = { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', marginBottom: 12 } as const;
const btn = { width: '100%', padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;

export function SetupPage({ onSetup }: { onSetup: (pw: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setErr('Min 8 characters'); return; }
    if (pw !== pw2) { setErr('Passwords do not match'); return; }
    try { await onSetup(pw); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={submit} style={card}>
        <h2 style={{ margin: '0 0 8px' }}>{t('auth.setupTitle')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>{t('auth.setupDesc')}</p>
        <input type="password" placeholder={t('auth.password')} value={pw} onChange={(e) => setPw(e.target.value)} style={input} />
        <input type="password" placeholder={t('auth.confirmPassword')} value={pw2} onChange={(e) => setPw2(e.target.value)} style={input} />
        {err && <p style={{ color: 'var(--danger)', marginBottom: 8, fontSize: 13 }}>{err}</p>}
        <button type="submit" style={btn}>{t('auth.submit')}</button>
      </form>
    </div>
  );
}
