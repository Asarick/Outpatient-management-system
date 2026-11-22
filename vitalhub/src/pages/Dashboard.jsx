import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Empty, Loading, StatCard, StatusBadge, TableCard, Th } from '../components/ui.jsx';
import { useLoad } from '../hooks.js';

const GREETING = {
  receptionist: 'Keep the front desk moving.',
  nurse: 'Triage starts with a clear picture.',
  doctor: 'Your care team is ready.',
  billing: 'Every visit, one clear checkout.',
};
const STEPS = [
  ['01', 'Registration', 'Patient record & check-in', 'bg-blue-50 text-blue-600'],
  ['02', 'Triage', 'Vitals & priority level', 'bg-violet-50 text-violet-600'],
  ['03', 'Consultation', 'Clinical notes & medication', 'bg-amber-50 text-amber-600'],
  ['04', 'Billing', 'Charges, payment & receipt', 'bg-emerald-50 text-emerald-600'],
];
const btn = 'rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useLoad('/dashboard');
  if (loading || !data) return <Loading />;
  const { counts, queue } = data;
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const n = (v) => Number(v).toLocaleString();

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Today at VitalHub
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[28px]">Good {part}, {user.name.split(' ')[0]}.</h1>
          <p className="mt-1.5 text-sm text-slate-500">{GREETING[user.role] || 'A clearer view of outpatient care.'}</p>
        </div>
        {user.role === 'receptionist' && (
          <div className="flex gap-2">
            <Link to="/patients" className={btn}>+ &nbsp; Register patient</Link>
            <Link to="/billing" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Billing & checkout</Link>
          </div>
        )}
        {(user.role === 'nurse' || user.role === 'doctor') && <Link to="/queue" className={btn}>Open live queue &nbsp; →</Link>}
        {user.role === 'billing' && <Link to="/billing" className={btn}>Open billing &nbsp; →</Link>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Patients registered" value={n(counts.patients)} detail="Across all visits" icon="◎" tone="blue" />
        <StatCard label="Today's visits" value={n(counts.today_visits)} detail="Checked in today" icon="▣" tone="violet" />
        <StatCard label="Active care queue" value={n(counts.active_queue)} detail="Waiting for triage or doctor" icon="≋" tone="amber" />
        <StatCard label="Open bills" value={n(counts.open_bills)} detail="Awaiting payment" icon="K" tone="green" />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <TableCard title="Live visit queue" subtitle="Priority sorted · updates on refresh" action={<Link to="/queue" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View queue →</Link>}>
          {queue.length === 0 ? <Empty message="No visits waiting in your queue." /> : (
            <div className="scrollbar overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><Th className="px-6">Patient</Th><Th>Visit</Th><Th>Priority</Th><Th className="px-6">Status</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4"><div className="font-semibold text-slate-700">{v.full_name}</div><div className="mt-1 text-[10px] text-slate-400">{v.patient_number}</div></td>
                      <td className="px-4 py-4 text-slate-500">#{v.id}</td>
                      <td className="px-4 py-4">{v.triage_level ? <span className="font-semibold text-rose-600">Level {v.triage_level}</span> : <span className="text-slate-400">Not triaged</span>}</td>
                      <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableCard>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
          <h2 className="text-[16px] font-semibold text-slate-800">Your workflow</h2>
          <p className="mb-5 mt-1 text-xs text-slate-400">Every visit stays connected from arrival to checkout.</p>
          <div className="space-y-4">
            {STEPS.map(([num, label, desc, tone]) => (
              <div key={num} className="flex items-center gap-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold ${tone}`}>{num}</div>
                <div className="flex-1"><div className="text-xs font-semibold text-slate-700">{label}</div><div className="mt-0.5 text-[10px] text-slate-400">{desc}</div></div>
                <span className="text-slate-300">→</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-blue-50/70 p-4">
            <div className="text-xs font-semibold text-blue-800">Patient-first, by design</div>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-700/70">A shared visit record keeps reception, nursing, clinicians and billing in sync.</p>
          </div>
        </section>
      </div>
    </>
  );
}
