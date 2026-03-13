import { useState, useEffect, useCallback } from 'react';
import { get, post, setToken, clearToken } from '../lib/api-client';

interface AuthState {
  initialized: boolean | null;
  loggedIn: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ initialized: null, loggedIn: !!localStorage.getItem('jwt'), loading: true });

  const checkStatus = useCallback(async () => {
    try {
      const res = await get<{ initialized: boolean }>('/api/auth/status');
      setState((s) => ({ ...s, initialized: res.initialized, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const login = async (password: string) => {
    const res = await post<{ token: string }>('/api/auth/login', { password });
    setToken(res.token);
    setState((s) => ({ ...s, loggedIn: true }));
  };

  const setup = async (password: string) => {
    await post('/api/auth/setup', { password });
    setState((s) => ({ ...s, initialized: true }));
  };

  const logout = () => {
    clearToken();
    setState((s) => ({ ...s, loggedIn: false }));
  };

  return { ...state, login, setup, logout, checkStatus };
}
