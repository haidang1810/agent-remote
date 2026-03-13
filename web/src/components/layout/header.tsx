import { useTranslation } from 'react-i18next';

export function Header({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={toggleLang} style={{ background: 'var(--bg-hover)', border: 'none', color: 'var(--text)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>
        {i18n.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
      </button>
      <button onClick={onLogout} style={{ background: 'var(--danger)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>
        {t('auth.logout')}
      </button>
    </header>
  );
}
