import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { homeFor } from '../App.jsx';
import { Button, Card, Field, PageHeader } from '../components/ui.jsx';
import { useAction } from '../hooks.js';

export default function ChangePassword() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const data = await run(() => api.post('/auth/change-password', form));
    if (data) {
      setUser(data.user);
      navigate(homeFor(data.user), { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader badge="Security" title="Set your password" subtitle="Your account uses a temporary password. Choose a new one (12+ characters) to continue." />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current temporary password" type="password" required autoComplete="current-password" value={form.current_password} onChange={set('current_password')} />
          <Field label="New password" type="password" required minLength={12} autoComplete="new-password" value={form.new_password} onChange={set('new_password')} />
          <Field label="Confirm new password" type="password" required minLength={12} autoComplete="new-password" value={form.confirm_password} onChange={set('confirm_password')} />
          <Button disabled={busy}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
