import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Accordion from '../../components/Accordion.jsx';
import api from '../../api.js';

/* ---------- hero: a sample visit queue that behaves like the real one ---------- */
const STATIONS = [
  { name: 'Reception', note: 'Patients are registered and checked in with the reason for their visit.' },
  { name: 'Triage', note: 'A nurse records vitals and assigns a triage level from 1 to 5.' },
  { name: 'Doctor', note: 'The most urgent patients are seen first. The doctor records the diagnosis and prescriptions.' },
  { name: 'Billing', note: 'An itemised bill is raised from the hospital price list and payment is recorded.' },
];
const LEVELS = [
  { n: 1, label: 'Immediate', bar: 'bg-rose-500' },
  { n: 2, label: 'Very urgent', bar: 'bg-orange-500' },
  { n: 3, label: 'Urgent', bar: 'bg-amber-400' },
  { n: 4, label: 'Standard', bar: 'bg-emerald-500' },
  { n: 5, label: 'Non-urgent', bar: 'bg-sky-500' },
];
const PATIENTS = [
  { id: 1, name: 'Wanjiru K.', reason: 'Fever, two days', level: 3, start: 1 },
  { id: 2, name: 'Otieno M.', reason: 'Chest pain', level: 1, start: 2 },
  { id: 3, name: 'Amina H.', reason: 'Follow-up visit', level: 5, start: 0 },
  { id: 4, name: 'Kiprono B.', reason: 'Deep cut, left hand', level: 2, start: 1 },
  { id: 5, name: 'Njeri W.', reason: 'Persistent cough', level: 4, start: 3 },
];

function LiveBoard() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [stages, setStages] = useState(() => Object.fromEntries(PATIENTS.map((p) => [p.id, p.start])));
  const [turn, setTurn] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [focus, setFocus] = useState(1);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      setTurn((i) => {
        const id = PATIENTS[i % PATIENTS.length].id;
        setStages((s) => ({ ...s, [id]: (s[id] + 1) % STATIONS.length }));
        return i + 1;
      });
    }, 2400);
    return () => clearInterval(t);
  }, [playing]);

  return (
    <div className="rounded-2xl bg-[#101c35] p-4 text-white shadow-2xl shadow-blue-950/20 sm:p-5" role="group" aria-label="Sample visit queue">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Today&apos;s visit queue <span className="font-normal text-slate-400">(sample data)</span></div>
        <button type="button" onClick={() => setPlaying(!playing)} className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10">
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATIONS.map((st, col) => {
          const here = PATIENTS.filter((p) => stages[p.id] === col).sort((a, b) => a.level - b.level || a.id - b.id);
          return (
            <div key={st.name} className={`min-h-[190px] rounded-xl p-2 transition ${focus === col ? 'bg-white/[.09]' : 'bg-white/[.04]'}`}>
              <button type="button" onClick={() => setFocus(col)} aria-pressed={focus === col}
                className="mb-2 flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-xs font-semibold hover:bg-white/10">
                {st.name}<span className="text-[10px] font-normal text-slate-400">{here.length}</span>
              </button>
              <div className="space-y-1.5">
                {here.map((p) => {
                  const lv = LEVELS[p.level - 1];
                  return (
                    <div key={`${p.id}-${col}`} className="flex animate-arrive overflow-hidden rounded-lg bg-[#1b2b4d] motion-reduce:animate-none">
                      <span className={`w-1 shrink-0 ${lv.bar}`} aria-hidden />
                      <div className="min-w-0 px-2 py-1.5">
                        <div className="truncate text-[11px] font-semibold">{p.name}</div>
                        <div className="truncate text-[10px] text-slate-400">{p.reason}</div>
                        <div className="mt-0.5 text-[10px] text-slate-300">Level {p.level}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 min-h-[40px] text-xs leading-5 text-slate-300" aria-live="polite">
        <span className="font-semibold text-white">{STATIONS[focus].name}.</span> {STATIONS[focus].note}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/10 pt-3 text-[10px] text-slate-400">
        {LEVELS.map((l) => (
          <span key={l.n} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${l.bar}`} />{l.n} {l.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------- how a visit flows: the one place numbering is honest, it is a sequence ---------- */
const STEPS = [
  { who: 'Receptionist', title: 'Register and check in',
    text: 'Register a new patient or find an existing record, then check them in with the reason for the visit. They join the queue straight away.',
    records: ['Name and date of birth', 'Phone number', 'Reason for visit'] },
  { who: 'Nurse', title: 'Triage',
    text: 'Record vitals and assign a triage level from 1 to 5. The most urgent patients rise to the top of the doctor\u2019s queue.',
    records: ['Temperature', 'Blood pressure', 'Heart and respiratory rate', 'Oxygen saturation', 'Weight', 'Triage level'] },
  { who: 'Doctor', title: 'Consult and prescribe',
    text: 'See the next patient with their triage details in front of you, write the consultation notes and diagnosis, and add prescriptions.',
    records: ['Consultation notes', 'Diagnosis', 'Medication, dose and duration'] },
  { who: 'Billing', title: 'Bill and take payment',
    text: 'Build an itemised bill in Kenya shillings from your hospital\u2019s own price list. Accept cash, card or insurance payments, including partial payments, and print the visit report.',
    records: ['Itemised services', 'Cash, card or insurance', 'Partial payments', 'Printable visit report'] },
];

function Flow() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <div className="grid gap-8 md:grid-cols-[280px_1fr]">
      <ol className="flex gap-2 overflow-x-auto md:flex-col md:gap-1" role="tablist" aria-label="Visit steps">
        {STEPS.map((st, n) => (
          <li key={st.who} className="shrink-0">
            <button type="button" role="tab" aria-selected={i === n} onClick={() => setI(n)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${i === n ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i === n ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{n + 1}</span>
              <span className="font-semibold">{st.who}</span>
            </button>
          </li>
        ))}
      </ol>
      <div role="tabpanel" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 md:p-8">
        <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">{s.title}</h3>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">{s.text}</p>
        <div className="mt-6 text-xs font-semibold text-slate-500">What gets recorded</div>
        <ul className="mt-2 flex flex-wrap gap-2">
          {s.records.map((r) => <li key={r} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

const SAFEGUARDS = [
  ['A separate workspace for every hospital', 'Staff, patients, visits, bills and price lists belong to one hospital and are never shared with another.'],
  ['Access that follows the job', 'Receptionists, nurses, doctors, billing staff and administrators each see only the pages their role needs.'],
  ['Platform team kept out of clinical records', 'VitalHub administrators approve and manage hospital accounts. They do not see patient information.'],
  ['Your administrator runs your staff list', 'Hospital administrators create staff accounts, set the price list and can deactivate anyone who leaves.'],
];

export default function Home() {
  const [faqs, setFaqs] = useState([]);
  useEffect(() => {
    document.title = 'VitalHub | Outpatient hospital management';
    api.get('/public/faqs').then((r) => setFaqs(r.data.faqs.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <>
      <section className="border-b border-slate-100 bg-[#f5f8fc]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:py-24">
          <div>
            <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[56px]">
              One live queue for every outpatient visit.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              VitalHub takes a patient from registration through triage, consultation and billing in a single workspace, and keeps every hospital&apos;s records separate.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/apply" className="rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Apply for a hospital account</Link>
              <a href="#flow" className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">See how a visit flows</a>
            </div>
            <p className="mt-5 text-sm text-slate-500">Already approved? <Link to="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link></p>
          </div>
          <LiveBoard />
        </div>
      </section>

      <section id="flow" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Follow one patient through the hospital</h2>
        <p className="mt-3 max-w-xl text-slate-600">Each team member works on the same visit, in turn. Choose a step to see what that person does in VitalHub.</p>
        <div className="mt-10"><Flow /></div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:px-8 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Built for many hospitals, kept apart</h2>
            <p className="mt-3 max-w-md text-slate-600">VitalHub serves several hospitals at once. Each one is a closed workspace.</p>
          </div>
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            {SAFEGUARDS.map(([t, d]) => (
              <div key={t} className="py-5">
                <dt className="text-[15px] font-semibold text-slate-900">{t}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-600">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <div className="rounded-3xl bg-[#101c35] px-6 py-12 text-white md:px-12">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Bring your hospital onto VitalHub</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ['Apply online', 'Tell us about your hospital, upload your licence and set up the administrator account.'],
              ['We review it', 'The VitalHub team checks your details. Track the result with your reference code.'],
              ['Sign in and start', 'Once approved, sign in with the password you chose and add your staff.'],
            ].map(([t, d], n) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-500 text-xs font-semibold">{n + 1}</span>
                <div><div className="font-semibold">{t}</div><p className="mt-1 text-sm leading-6 text-slate-300">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/apply" className="rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">Start your application</Link>
            <Link to="/apply/status" className="rounded-lg border border-white/25 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">Check application status</Link>
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 pb-24 md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Common questions</h2>
          <div className="mt-8"><Accordion items={faqs} /></div>
          <Link to="/faqs" className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:underline">See all questions</Link>
        </section>
      )}
    </>
  );
}
