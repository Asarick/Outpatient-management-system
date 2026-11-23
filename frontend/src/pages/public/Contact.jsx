import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../api.js';
import { Button, Field, TextArea } from '../../components/ui.jsx';
import { SITE } from '../../siteConfig.js';

const BLANK = { name: '', email: '', subject: '', message: '', hp: '' };

export default function Contact() {
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => { document.title = 'Contact | VitalHub'; }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.post('/public/inquiries', f); setSent(true); setF(BLANK); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Contact us</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">Questions about VitalHub, your application or how the platform works? Send us a message and the VitalHub team will reply by email.</p>
        <dl className="mt-10 space-y-5 text-sm">
          <div><dt className="font-semibold text-slate-900">Email</dt><dd className="mt-1 text-slate-600">{SITE.email}</dd></div>
          <div><dt className="font-semibold text-slate-900">Phone</dt><dd className="mt-1 text-slate-600">{SITE.phone}</dd></div>
          <div><dt className="font-semibold text-slate-900">Based in</dt><dd className="mt-1 text-slate-600">{SITE.location}</dd></div>
          <div><dt className="font-semibold text-slate-900">Hours</dt><dd className="mt-1 text-slate-600">{SITE.hours}</dd></div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        {sent ? (
          <div role="status">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-600">✓</div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Message received</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Thank you. The VitalHub team will follow up at the email address you gave.</p>
            <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-semibold text-blue-700 hover:underline">Send another message</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" required maxLength={160} value={f.name} onChange={set('name')} autoComplete="name" />
              <Field label="Email" type="email" required maxLength={190} value={f.email} onChange={set('email')} autoComplete="email" />
            </div>
            <Field label="Subject" required maxLength={200} value={f.subject} onChange={set('subject')} />
            <TextArea label="Message" required rows={6} maxLength={4000} value={f.message} onChange={set('message')} />
            {/* honeypot: hidden from people, tempting to bots */}
            <div className="hidden" aria-hidden="true"><label>Leave empty<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={set('hp')} /></label></div>
            <Button disabled={busy} className="px-6 py-3">{busy ? 'Sending…' : 'Send message'}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
