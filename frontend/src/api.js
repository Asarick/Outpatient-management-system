import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

const TOKEN_KEY = 'vitalhub_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 anywhere (expired token, deactivated account) signs the user out.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const onLogin = window.location.pathname === '/login';
    if (err.response?.status === 401 && !onLogin && getToken()) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('vitalhub:unauthorized', { detail: err.response.data?.error }));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err) => err.response?.data?.error || 'Could not reach the server. Please try again.';

export default api;
