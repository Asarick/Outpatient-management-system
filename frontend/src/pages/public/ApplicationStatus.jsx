import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../api.js';
import { Button, Field } from '../../components/ui.jsx';
import { fmtDate } from '../../utils.js';

const COPY = {
  pending: ['Under review', 'bg-amber-50 text-amber-800 border-amber-200', 'Your application has been received and is waiting for review. You cannot sign in yet.'],
  approved: ['Approved', 'bg-emerald-50 text-emerald-800 border-emerald-200', 'Your hospital account is ready. Sign in with the administrator email and the password you chose when you applied.'],
  rejected: ['Not approved', 'bg-rose-50 text-rose-800 border-rose-200', 'Your application was not approved. The reviewer\u2019s reason is below.'],
};

export default function ApplicationStatus() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ reference: params.get('ref') || '', email: '' });
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = 'Application status | VitalHub'; }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setRes(null);
    try { setRes((await api.post('/public/applications/status', f)).data); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const c = res && COPY[res.status];

  return (
    <div className="mx-auto max-w-lg px-5 py-16 md:py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900">Check your application</h1>
      <p className="mt-3 text-slate-600">Enter the reference code you received when you applied, and the administrator email you used.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <Field label="Reference code" required placeholder="VH-1A2B3C4D" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <Field label="Administrator email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Button disabled={busy} className="px-6 py-3">{busy ? 'Checking…' : 'Check status'}</Button>
      </form>
      {c && (
        <div role="status" className={`mt-8 rounded-2xl border p-5 ${c[1]}`}>
          <div className="text-xs font-semibold">{res.facility_name}</div>
          <div className="mt-1 text-xl font-semibold">{c[0]}</div>
          <p className="mt-2 text-sm leading-6">{c[2]}</p>
          {res.note && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm">{res.note}</p>}
          <div className="mt-3 text-xs opacity-80">Submitted {fmtDate(res.submitted_at)}{res.reviewed_at ? ` · Reviewed ${fmtDate(res.reviewed_at)}` : ''}</div>
          {res.status === 'approved' && <Link to="/login" className="mt-4 inline-block rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800">Sign in</Link>}
          {res.status === 'rejected' && <Link to="/apply" className="mt-4 inline-block rounded-lg bg-rose-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-800">Apply again</Link>}
        </div>
      )}
    </div>
  );
}
