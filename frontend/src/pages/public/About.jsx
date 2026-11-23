import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const PRINCIPLES = [
  ['One visit, one record', 'Everyone who touches a visit sees the same information, so nothing is re-typed or lost between the front desk and the pharmacy counter.'],
  ['Privacy by default', 'Every hospital is a closed workspace. Staff see only what their role needs, and the platform team stays out of clinical records.'],
  ['Simple enough to use on a busy day', 'The screens follow the order of the visit. A new receptionist or nurse can find their next task without training manuals.'],
  ['Priced in the local reality', 'Bills are itemised in Kenya shillings from each hospital\u2019s own price list, with cash, card, insurance and part payments.'],
];

export default function About() {
  useEffect(() => { document.title = 'About | VitalHub'; }, []);
  return (
    <>
      <section className="border-b border-slate-100 bg-[#f5f8fc]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">Outpatient care runs on handovers. VitalHub makes them clean.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            A patient visit passes through four or five people in an hour. On paper, or across disconnected tools, each handover is a place where details go missing. VitalHub gives the whole team one shared, live view of the visit.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">What we believe</h2>
        <dl className="divide-y divide-slate-200 border-y border-slate-200">
          {PRINCIPLES.map(([t, d]) => (
            <div key={t} className="py-6"><dt className="text-base font-semibold text-slate-900">{t}</dt><dd className="mt-1.5 text-sm leading-7 text-slate-600">{d}</dd></div>
          ))}
        </dl>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:px-8 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Who uses it</h2>
          <div className="space-y-5 text-[15px] leading-7 text-slate-600">
            <p><span className="font-semibold text-slate-900">Receptionists</span> register patients and check them in. <span className="font-semibold text-slate-900">Nurses</span> record vitals and set the triage level. <span className="font-semibold text-slate-900">Doctors</span> consult and prescribe. <span className="font-semibold text-slate-900">Billing staff</span> raise bills and record payments.</p>
            <p><span className="font-semibold text-slate-900">Hospital administrators</span> manage their own staff accounts and price list. The <span className="font-semibold text-slate-900">VitalHub platform team</span> reviews hospital applications and looks after the platform itself.</p>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">VitalHub is a management tool, not a clinical decision-making system. Hospitals remain responsible for their own clinical practice and for meeting the data protection rules that apply to them.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Ready to talk, or ready to apply?</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/apply" className="rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700">Apply for a hospital account</Link>
          <Link to="/contact" className="rounded-lg border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Contact us</Link>
        </div>
      </section>
    </>
  );
}
