import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loading, StatusBadge } from '../components/ui.jsx';
import { useLoad } from '../hooks.js';
import { fmtDateTime, money } from '../utils.js';

const H2 = ({ children }) => <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</h2>;

export default function Report() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const { data: r, loading } = useLoad(`/visits/${visitId}/report`);
  if (loading) return <Loading />;
  if (!r) return <div className="py-16 text-center text-sm text-slate-500">The visit report is unavailable. <Link to="/dashboard" className="text-blue-600">Go back</Link></div>;
  const { visit, patient, triage, consultation, prescriptions, bill } = r;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-sm font-medium text-blue-600 hover:text-blue-700">← Back</button>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Print / Save report</button>
      </div>
      <section className="report-card rounded-2xl border border-slate-100 bg-white p-6 shadow-card md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-blue-600">Outpatient medical report</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{r.organization_name}</h1>
            <p className="mt-1 text-xs text-slate-500">Visit #{visit.id} · {fmtDateTime(visit.created_at)}</p>
          </div>
          <StatusBadge status={visit.status} />
        </div>

        <div className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</h2>
            <p className="text-sm font-semibold text-slate-800">{patient.full_name}</p>
            <p className="mt-1 text-xs text-slate-500">{patient.patient_number} · {patient.gender} · {patient.age} years</p>
            <p className="mt-1 text-xs text-slate-500">{patient.phone}{patient.email ? ` · ${patient.email}` : ''}</p>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Reason for visit</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{visit.reason}</p>
          </div>
        </div>

        <div className="border-b border-slate-200 py-6">
          <H2>Triage & vitals</H2>
          {triage ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ['Priority level', triage.triage_level],
                  ['Temperature', `${triage.temperature} °C`],
                  ['Blood pressure', triage.blood_pressure],
                  ['Heart rate', `${triage.heart_rate} bpm`],
                  ['Respiratory rate', `${triage.respiratory_rate} /min`],
                  ['Oxygen saturation', `${triage.oxygen_saturation}%`],
                  ['Weight', triage.weight ? `${triage.weight} kg` : 'Not recorded'],
                  ['Recorded', fmtDateTime(triage.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-700">{value}</div></div>
                ))}
              </div>
              {triage.notes && <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600"><strong>Nursing notes:</strong> {triage.notes}</p>}
            </>
          ) : <p className="text-sm text-slate-500">Triage has not been recorded.</p>}
        </div>

        <div className="border-b border-slate-200 py-6">
          <H2>Consultation</H2>
          {consultation ? (
            <>
              <p className="mb-2 text-xs text-slate-500">Clinician: <strong className="text-slate-700">{consultation.doctor_name || '—'}</strong> · {fmtDateTime(consultation.created_at)}</p>
              <div className="mb-3"><h3 className="text-xs font-semibold text-slate-600">Diagnosis</h3><p className="mt-1 whitespace-pre-line text-sm text-slate-700">{consultation.diagnosis}</p></div>
              <div><h3 className="text-xs font-semibold text-slate-600">Clinical notes & plan</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{consultation.notes}</p></div>
            </>
          ) : <p className="text-sm text-slate-500">Consultation has not been recorded.</p>}
        </div>

        <div className="border-b border-slate-200 py-6">
          <H2>Prescribed medicines</H2>
          {prescriptions.length ? (
            <div className="space-y-3">
              {prescriptions.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4">
                  <div className="text-sm font-semibold text-slate-800">{p.medication}</div>
                  <div className="mt-1 text-xs text-slate-500">{[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}</div>
                  {p.instructions && <p className="mt-2 text-xs text-slate-600">{p.instructions}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No medicines were prescribed for this visit.</p>}
          <p className="mt-3 text-[10px] text-slate-400">Prescription details are included for the medical record. Medicine dispensing is not managed in VitalHub.</p>
        </div>

        <div className="py-6">
          <H2>Bill & payments</H2>
          {bill ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                    <tr><th className="py-2 font-semibold">Description</th><th className="py-2 text-right font-semibold">Qty</th><th className="py-2 text-right font-semibold">Unit price</th><th className="py-2 text-right font-semibold">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bill.items.map((i, idx) => (
                      <tr key={idx}><td className="py-3 text-slate-700">{i.description}</td><td className="py-3 text-right text-slate-500">{i.quantity}</td><td className="py-3 text-right text-slate-500">{money(i.unit_price)}</td><td className="py-3 text-right font-medium text-slate-700">{money(i.line_total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto mt-4 max-w-xs space-y-2 border-t border-slate-200 pt-4 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Bill total</span><strong>{money(bill.total_amount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid</span><strong>{money(bill.paid_amount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Balance</span><strong>{money(bill.balance)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Bill status</span><strong className="capitalize">{bill.status}</strong></div>
              </div>
              {bill.payments.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 text-xs font-semibold text-slate-600">Payment history</h3>
                  <div className="space-y-2">
                    {bill.payments.map((p, i) => (
                      <div key={i} className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                        <span className="capitalize">{p.method}{p.reference ? ` · ${p.reference}` : ''} · {fmtDateTime(p.created_at)}</span>
                        <strong className="text-slate-700">{money(p.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : <p className="text-sm text-slate-500">A bill has not yet been created for this visit.</p>}
        </div>
        <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400">Generated {fmtDateTime(new Date().toISOString())} · {r.organization_name} · Visit #{visit.id}</div>
      </section>
    </div>
  );
}
