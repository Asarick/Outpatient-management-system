import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { getToken, setToken } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message, sticky? }

  const notify = useCallback((type, message, sticky = false) => setToast({ type, message, sticky, id: Date.now() }), []);

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = (e) => {
      setUser(null);
      notify('error', e.detail || 'Please sign in again.');
    };
    window.addEventListener('vitalhub:unauthorized', onUnauthorized);
    return () => window.removeEventListener('vitalhub:unauthorized', onUnauthorized);
  }, [notify]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    notify('success', 'You have been securely signed out.');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, toast, setToast, notify }}>
      {children}
    </AuthContext.Provider>
  );
}
