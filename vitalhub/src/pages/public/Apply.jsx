import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api.js';
import { Button, Field, Select, TextArea } from '../../components/ui.jsx';

const BLANK = {
  facility_name: '', facility_type: '', ownership: '', year_established: '', staff_estimate: '', services: '',
  county: '', town: '', address: '', phone: '', email: '', website: '',
  license_number: '', licensing_body: '', license_expiry: '',
  admin_name: '', admin_title: '', admin_email: '', admin_phone: '', password: '', confirm_password: '',
  declaration: false, hp: '',
};

function Section({ title, hint, children }) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function Apply() {
  const [f, setF] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { document.title = 'Apply for a hospital account | VitalHub'; }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) return setError('Attach a copy of your facility licence (PDF, PNG or JPG).');
    if (file.size > 5 * 1024 * 1024) return setError('The licence document is larger than 5 MB.');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? String(v) : v));
    fd.append('license_document', file);
    setBusy(true);
    try {
      setDone((await api.post('/public/applications', fd)).data.reference);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(errorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-emerald-600">✓</div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900">Application submitted</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">The VitalHub team will review your details and licence. You cannot sign in until the application is approved. Keep this reference code, you will need it to check progress.</p>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
            <code className="text-lg font-semibold tracking-wider text-slate-900">{done}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(done); setCopied(true); }} className="text-xs font-semibold text-blue-700 hover:underline">{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/apply/status?ref=${done}`} className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Check application status</Link>
            <Link to="/" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f8fc]">
      <div className="mx-auto max-w-3xl px-5 py-14 md:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Apply for a hospital account</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Tell us about your hospital and the person who will administer it. You choose the administrator password now, and use it to sign in once the application is approved.</p>

        <form onSubmit={submit} className="mt-10 space-y-6">
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <Section title="Your hospital" hint="Basic details about the facility.">
            <Field className="sm:col-span-2" label="Hospital or clinic name" required maxLength={180} value={f.facility_name} onChange={set('facility_name')} />
            <Select label="Facility type" required value={f.facility_type} onChange={set('facility_type')}>
              <option value="">Select a type</option>
              <option value="hospital">Hospital</option><option value="clinic">Clinic</option><option value="health_centre">Health centre</option>
              <option value="dispensary">Dispensary</option><option value="specialist_centre">Specialist centre</option><option value="other">Other</option>
            </Select>
            <Select label="Ownership" required value={f.ownership} onChange={set('ownership')}>
              <option value="">Select ownership</option>
              <option value="public">Public</option><option value="private">Private</option><option value="faith_based">Faith-based</option>
              <option value="ngo">NGO or non-profit</option><option value="other">Other</option>
            </Select>
            <Field label="Year established (optional)" inputMode="numeric" maxLength={4} placeholder="2009" value={f.year_established} onChange={set('year_established')} />
            <Field label="Approximate number of staff (optional)" inputMode="numeric" value={f.staff_estimate} onChange={set('staff_estimate')} />
            <TextArea className="sm:col-span-2" label="Outpatient services offered (optional)" rows={3} maxLength={1000} placeholder="General consultation, laboratory, pharmacy…" value={f.services} onChange={set('services')} />
          </Section>

          <Section title="Location and contact" hint="Where patients find you and how we reach the facility.">
            <Field label="County" required maxLength={80} value={f.county} onChange={set('county')} />
            <Field label="Town or city" required maxLength={120} value={f.town} onChange={set('town')} />
            <Field className="sm:col-span-2" label="Physical address" required maxLength={500} placeholder="Street, building, landmark" value={f.address} onChange={set('address')} />
            <Field label="Hospital phone" type="tel" required placeholder="+254 700 000000" value={f.phone} onChange={set('phone')} />
            <Field label="Hospital email" type="email" required value={f.email} onChange={set('email')} />
            <Field className="sm:col-span-2" label="Website (optional)" type="url" placeholder="https://" value={f.website} onChange={set('website')} />
          </Section>

          <Section title="Verification" hint="We use these to confirm the facility is licensed to operate.">
            <Field label="Facility licence number" required maxLength={80} value={f.license_number} onChange={set('license_number')} />
            <Field label="Licensing body" required maxLength={160} placeholder="e.g. county health department" value={f.licensing_body} onChange={set('licensing_body')} />
            <Field label="Licence expiry date" type="date" required value={f.license_expiry} onChange={set('license_expiry')} />
            <label className="block text-xs font-medium text-slate-600">
              Copy of the licence
              <input type="file" required accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold" />
              <span className="mt-1 block text-[11px] text-slate-400">PDF, PNG or JPG, up to 5 MB.</span>
            </label>
          </Section>

          <Section title="Hospital administrator" hint="This person becomes the first administrator. They can then add receptionists, nurses, doctors and billing staff.">
            <Field label="Full name" required maxLength={160} autoComplete="name" value={f.admin_name} onChange={set('admin_name')} />
            <Field label="Job title" required maxLength={120} placeholder="e.g. Medical superintendent" value={f.admin_title} onChange={set('admin_title')} />
            <Field label="Work email (used to sign in)" type="email" required autoComplete="username" value={f.admin_email} onChange={set('admin_email')} />
            <Field label="Mobile phone" type="tel" required value={f.admin_phone} onChange={set('admin_phone')} />
            <Field label="Password" type="password" required minLength={12} autoComplete="new-password" value={f.password} onChange={set('password')} />
            <Field label="Confirm password" type="password" required minLength={12} autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} />
            <p className="text-xs text-slate-500 sm:col-span-2">Use at least 12 characters. Your password is stored securely and is only activated if your application is approved.</p>
          </Section>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input type="checkbox" required checked={f.declaration} onChange={(e) => setF({ ...f, declaration: e.target.checked })} className="mt-1.5 h-4 w-4 rounded border-slate-300" />
              I confirm that the information above is accurate, that I am authorised to apply on behalf of this facility, and that the facility will protect patient information it records in VitalHub.
            </label>
            <div className="hidden" aria-hidden="true"><label>Leave empty<input tabIndex={-1} autoComplete="off" value={f.hp} onChange={set('hp')} /></label></div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button disabled={busy} className="px-7 py-3.5 text-sm">{busy ? 'Submitting…' : 'Submit application'}</Button>
              <Link to="/apply/status" className="text-sm font-semibold text-blue-700 hover:underline">Already applied? Check status</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
