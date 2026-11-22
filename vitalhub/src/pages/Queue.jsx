import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Empty, Field, Loading, PageHeader, Select, StatusBadge, TextArea, inputCls } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';
import { fmtTime, initials } from '../utils.js';

const LEVELS = ['Immediate', 'Emergency', 'Urgent', 'Less urgent', 'Non-urgent'];

function TriageForm({ visit, onDone }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ temperature: '', blood_pressure: '', heart_rate: '', respiratory_rate: '', oxygen_saturation: '', weight: '', triage_level: '', notes: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/visits/${visit.id}/triage`, f))) onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-4 md:p-6">
      <Field label="Temperature °C" type="number" step="0.1" required placeholder="36.8" value={f.temperature} onChange={set('temperature')} />
      <Field label="Blood pressure" required placeholder="120/80" pattern="\d{2,3}/\d{2,3}" title="Format: 120/80" value={f.blood_pressure} onChange={set('blood_pressure')} />
      <Field label="Heart rate (bpm)" type="number" required placeholder="72" value={f.heart_rate} onChange={set('heart_rate')} />
      <Field label="Respiratory rate" type="number" required placeholder="16" value={f.respiratory_rate} onChange={set('respiratory_rate')} />
      <Field label="Oxygen saturation %" type="number" required placeholder="98" value={f.oxygen_saturation} onChange={set('oxygen_saturation')} />
      <Field label="Weight kg (optional)" type="number" step="0.1" placeholder="68.5" value={f.weight} onChange={set('weight')} />
      <Select label="Triage level" required value={f.triage_level} onChange={set('triage_level')}>
        <option value="">Assign 1–5</option>
        {LEVELS.map((l, i) => <option key={l} value={i + 1}>Level {i + 1} · {l}</option>)}
      </Select>
      <TextArea label="Nursing notes" className="md:col-span-3" rows={2} maxLength={1000} placeholder="Optional observations" value={f.notes} onChange={set('notes')} />
      <div className="md:col-span-4"><Button disabled={busy}>Save vitals & send to doctor</Button></div>
    </form>
  );
}

function ConsultationForm({ visit, onDone }) {
  const { run, busy } = useAction();
  const blank = () => ({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [rx, setRx] = useState([blank()]);
  const setRow = (i, k, v) => setRx(rx.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const cell = 'rounded-lg border border-slate-200 px-3 py-2 text-xs';

  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/visits/${visit.id}/consultation`, { notes, diagnosis, prescriptions: rx }))) onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <TextArea label="Consultation notes" required maxLength={5000} rows={3} placeholder="History, examination and plan" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Field label="Diagnosis" required maxLength={1000} placeholder="Clinical diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      <details className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">Add prescriptions (optional, up to 5)</summary>
        <div className="mt-3 space-y-3">
          {rx.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input className={cell} maxLength={160} placeholder="Medication" value={r.medication} onChange={(e) => setRow(i, 'medication', e.target.value)} />
              <input className={cell} maxLength={100} placeholder="Dosage" value={r.dosage} onChange={(e) => setRow(i, 'dosage', e.target.value)} />
              <input className={cell} maxLength={100} placeholder="Frequency" value={r.frequency} onChange={(e) => setRow(i, 'frequency', e.target.value)} />
              <input className={cell} maxLength={100} placeholder="Duration" value={r.duration} onChange={(e) => setRow(i, 'duration', e.target.value)} />
              <input className={`${cell} sm:col-span-2`} maxLength={500} placeholder="Instructions" value={r.instructions} onChange={(e) => setRow(i, 'instructions', e.target.value)} />
            </div>
          ))}
          {rx.length < 5 && <button type="button" onClick={() => setRx([...rx, blank()])} className="text-xs font-semibold text-blue-600">+ Add another medication</button>}
        </div>
      </details>
      <Button disabled={busy}>Save consultation & send to billing</Button>
    </form>
  );
}

export default function Queue() {
  const { user } = useAuth();
  const role = user.role;
  const { data, loading, reload } = useLoad('/queue', { pollMs: 30000 });
  if (!data) return <Loading />;
  const { visits } = data;

  return (
    <>
      <PageHeader
        badge={<><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Queue is live</>}
        title="Visit queue"
        subtitle={`${visits.length} patient${visits.length === 1 ? "" : "s"} · sorted by triage priority, then check-in time.`}
      >
        <button onClick={() => reload()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">↻ &nbsp; Refresh queue</button>
      </PageHeader>

      <div className="space-y-4">
        {visits.length === 0 && <section className="rounded-2xl border border-slate-100 bg-white shadow-card"><Empty message="There are no visits waiting in this queue." /></section>}
        {visits.map((v) => (
          <section key={v.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 md:px-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{initials(v.full_name)}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{v.full_name}</div>
                  <div className="mt-1 text-xs text-slate-400">{v.patient_number} · {v.gender} · {v.age} yrs</div>
                  <div className="mt-2 text-xs text-slate-500">{v.reason}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Visit #{v.id} · {fmtTime(v.created_at)}</span>
                {v.triage_level && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">Priority {v.triage_level}</span>}
              </div>
            </div>

            {v.status === 'checked_in' && role === 'nurse' ? (
              <TriageForm visit={v} onDone={reload} />
            ) : v.status === 'triaged' ? (
              <div className="grid gap-5 p-5 md:grid-cols-[.8fr_1.2fr] md:p-6">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Triage · Level {v.triage.triage_level}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-slate-400">Temperature</span><div className="mt-1 font-semibold">{v.triage.temperature} °C</div></div>
                    <div><span className="text-slate-400">Blood pressure</span><div className="mt-1 font-semibold">{v.triage.blood_pressure}</div></div>
                    <div><span className="text-slate-400">Heart rate</span><div className="mt-1 font-semibold">{v.triage.heart_rate} bpm</div></div>
                    <div><span className="text-slate-400">Oxygen</span><div className="mt-1 font-semibold">{v.triage.oxygen_saturation}%</div></div>
                  </div>
                  {v.triage.notes && <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">{v.triage.notes}</p>}
                </div>
                {role === 'doctor' ? <ConsultationForm visit={v} onDone={reload} /> : <div className="self-center text-xs text-slate-500">Awaiting doctor consultation.</div>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <span className="flex items-center gap-2 text-xs text-slate-500">Next step: <StatusBadge status={v.status} /></span>
                {['awaiting_billing', 'awaiting_payment'].includes(v.status) && role === 'receptionist' && (
                  <div className="flex gap-2">
                    <Link to={`/visits/${v.id}/report`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Medical report</Link>
                    <Link to="/billing" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Checkout →</Link>
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
