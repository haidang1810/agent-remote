import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/use-auth';
import { AppLayout } from './components/layout/app-layout';
import { SetupPage } from './pages/setup-page';
import { LoginPage } from './pages/login-page';
import { OverviewPage } from './pages/overview-page';
import { KeysPage } from './pages/keys-page';

import { LogsPage } from './pages/logs-page';
import { SystemPage } from './pages/system-page';

export default function App() {
  const { initialized, loggedIn, loading, login, setup, logout } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>Loading...</div>;

  if (initialized === false) return <SetupPage onSetup={setup} />;
  if (!loggedIn) return <LoginPage onLogin={login} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout onLogout={logout} />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/keys" element={<KeysPage />} />

          <Route path="/logs" element={<LogsPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
