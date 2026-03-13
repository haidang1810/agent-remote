import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const links = [
  { to: '/', key: 'overview', icon: '📊' },
  { to: '/keys', key: 'keys', icon: '🔑' },
  { to: '/tools', key: 'tools', icon: '🔧' },
  { to: '/logs', key: 'logs', icon: '📋' },
  { to: '/system', key: 'system', icon: '💻' },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside style={{ width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ padding: '0 1rem 1rem', fontWeight: 700, fontSize: 18 }}>{t('app.title')}</div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === '/'} style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1rem',
          textDecoration: 'none', color: isActive ? 'var(--primary)' : 'var(--text-muted)',
          background: isActive ? 'var(--bg-hover)' : 'transparent', borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
        })}>
          <span>{l.icon}</span> {t(`nav.${l.key}`)}
        </NavLink>
      ))}
    </aside>
  );
}
