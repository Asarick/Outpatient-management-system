import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from './api.js';
import { useAuth } from './auth.jsx';

/** GET `url` and expose { data, loading, reload }. Optional silent polling (used by the live queue). */
export function useLoad(url, { pollMs } = {}) {
  const { notify } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const reload = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const res = await api.get(url);
        if (id === seq.current) setData(res.data);
      } catch (err) {
        if (!silent && err.response?.status !== 401) notify('error', errorMessage(err));
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [url, notify]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => {
      // don't refresh under the user's hands while they are typing in a form
      const el = document.activeElement;
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      reload(true);
    }, pollMs);
    return () => clearInterval(t);
  }, [pollMs, reload]);

  return { data, loading, reload };
}

/** Runs an API call, shows success/error toast, returns the response data or null. */
export function useAction() {
  const { notify } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async (fn, { success = true } = {}) => {
    setBusy(true);
    try {
      const res = await fn();
      if (success && res.data?.message) notify('success', res.data.message);
      return res.data;
    } catch (err) {
      if (err.response?.status !== 401) notify('error', errorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}
