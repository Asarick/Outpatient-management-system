import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Toast } from '../components/Layout.jsx';
import { Button, Field } from '../components/ui.jsx';
import { errorMessage } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login, toast } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password); // routing reacts to the user changing
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#101c35] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-32 -top-32 h-[440px] w-[440px] rounded-full border border-white/[.07]" />
        <div className="absolute -right-16 -top-16 h-[310px] w-[310px] rounded-full border border-white/[.07]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-xl font-bold">+</div>
          <div className="text-[17px] font-semibold">Vital<span className="text-blue-400">Hub</span></div>
        </div>
        <div className="relative max-w-lg">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[.16em] text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Outpatient care, connected
          </div>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight xl:text-[46px]">
            A better day in care starts <span className="text-blue-400">right here.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
            One connected workspace for every patient visit — from the first hello to the final checkout.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
              <div className="text-lg">◎</div><div className="mt-2 text-xs font-semibold">Patient-first</div>
              <div className="mt-1 text-[10px] text-slate-400">A connected care journey</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-4">
              <div className="text-lg">⌁</div><div className="mt-2 text-xs font-semibold">Team-ready</div>
              <div className="mt-1 text-[10px] text-slate-400">One live visit queue</div>
            </div>
          </div>
        </div>
        <div className="relative text-[10px] text-slate-500">© {new Date().getFullYear()} VitalHub · Secure clinical workspace</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-xl font-bold text-white">+</div>
            <div className="text-lg font-semibold">Vital<span className="text-blue-600">Hub</span></div>
          </div>
          <div className="mb-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-blue-600">Staff sign in</div>
            <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to your VitalHub workspace.</p>
          </div>
          {toast && !error && <Toast />}
          {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <form onSubmit={submit} className="space-y-5">
            <Field label="Work email" type="email" required placeholder="you@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <label className="block text-xs font-medium text-slate-600">
              Password
              <div className="relative mt-1.5">
                <input
                  type={show ? 'text' : 'password'} required value={password} autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 pr-16 text-sm"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-3 text-xs text-slate-400">{show ? 'Hide' : 'Show'}</button>
              </div>
            </label>
            <Button disabled={busy} className="w-full py-3">{busy ? 'Signing in…' : 'Sign in to VitalHub'}</Button>
          </form>
          <div className="mt-8 space-y-2 rounded-xl border border-slate-100 bg-white p-4 text-xs leading-relaxed text-slate-500">
            <p><span className="font-semibold text-slate-700">Hospital staff:</span> ask your hospital administrator to create your account.</p>
            <p><span className="font-semibold text-slate-700">New hospital?</span> <Link to="/apply" className="font-semibold text-blue-700 hover:underline">Apply for an account</Link> or <Link to="/apply/status" className="font-semibold text-blue-700 hover:underline">check your application</Link>.</p>
          </div>
          <div className="mt-6 text-center"><Link to="/" className="text-xs font-medium text-slate-400 hover:text-slate-700">Back to the VitalHub website</Link></div>
          <div className="mt-8 text-center text-[10px] text-slate-400">Protected by JWT sessions and role-based access</div>
        </div>
      </section>
    </div>
  );
}
