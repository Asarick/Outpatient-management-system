import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { Button, Empty, Loading, PageHeader, PanelTitle, StatCard, StatusBadge, TableCard } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';
import { fmtDate, money } from '../utils.js';

function BillForm({ visit, services, onDone }) {
  const { run, busy } = useAction();
  const [rows, setRows] = useState([{ service_id: '', quantity: 1 }]);
  const price = (id) => Number(services.find((s) => String(s.id) === String(id))?.unit_price || 0);
  const total = rows.reduce((sum, r) => sum + price(r.service_id) * (Number(r.quantity) || 0), 0);
  const setRow = (i, k, v) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const cell = 'mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs';

  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/visits/${visit.visit_id}/bill`, { items: rows }))) onDone();
  };

  if (services.length === 0)
    return (
      <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">
        There are no active prices in this hospital’s service list. Ask an administrator to add services under{' '}
        <Link to="/admin" className="font-semibold underline">Staff & pricing</Link>.
      </div>
    );

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_100px_150px_150px_auto] sm:items-end">
            <label className="block text-[10px] font-medium text-slate-500">Service
              <select required value={r.service_id} onChange={(e) => setRow(i, 'service_id', e.target.value)} className={`${cell} bg-white`}>
                <option value="">Select a service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {money(s.unit_price)}</option>)}
              </select>
            </label>
            <label className="block text-[10px] font-medium text-slate-500">Quantity
              <input type="number" min="1" max="999" required value={r.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} className={cell} />
            </label>
            <div className="text-[10px] text-slate-500">Unit price<div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{r.service_id ? money(price(r.service_id)) : '—'}</div></div>
            <div className="text-[10px] text-slate-500">Line total<div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold">{r.service_id ? money(price(r.service_id) * (Number(r.quantity) || 0)) : '—'}</div></div>
            {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Remove</button>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {rows.length < 8 ? <button type="button" onClick={() => setRows([...rows, { service_id: '', quantity: 1 }])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">+ Add service</button> : <span />}
        <div className="text-sm font-semibold text-slate-800">Bill total: {money(total)}</div>
      </div>
      <div className="mt-4"><Button disabled={busy}>Generate bill</Button></div>
    </form>
  );
}

function PaymentForm({ bill, onDone }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ amount: bill.balance, method: 'cash', reference: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cell = 'mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-xs';
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/bills/${bill.id}/payments`, f))) onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="block text-[10px] font-medium text-slate-500">Amount (KSh)
        <input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={f.amount} onChange={set('amount')} className={`${cell} w-28`} />
      </label>
      <label className="block text-[10px] font-medium text-slate-500">Method
        <select value={f.method} onChange={set('method')} className={`${cell} bg-white`}><option value="cash">Cash</option><option value="card">Card</option><option value="insurance">Insurance</option></select>
      </label>
      <label className="block text-[10px] font-medium text-slate-500">Claim / reference
        <input maxLength={120} placeholder={f.method === 'insurance' ? 'Required' : 'Optional'} required={f.method === 'insurance'} value={f.reference} onChange={set('reference')} className={`${cell} w-32`} />
      </label>
      <Button disabled={busy}>Record payment</Button>
    </form>
  );
}

export default function Billing() {
  const { data, loading, reload } = useLoad('/billing');
  if (!data) return <Loading />;
  const { ready, services, bills, reports, collected_today: collected } = data;

  return (
    <>
      <PageHeader title="Billing & payments" subtitle="Select priced services to calculate bills in Kenyan shillings, then record payments." />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Ready to bill" value={ready.length} detail="Consultations completed" icon="▤" tone="violet" />
        <StatCard label="Open invoices" value={bills.length} detail="Pending or partially paid" icon="K" tone="amber" />
        <StatCard label="Collected today" value={money(collected)} detail="All payment methods" icon="✓" tone="green" />
      </div>

      {ready.length > 0 && (
        <section className="mb-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
          <PanelTitle title="Ready to bill" subtitle="Choose from the hospital price list; preset prices are applied automatically." />
          <div className="space-y-4">
            {ready.map((v) => (
              <details key={v.visit_id} className="rounded-xl border border-slate-100 p-4">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700">{v.full_name} <span className="font-normal text-slate-400">· {v.patient_number} · Visit #{v.visit_id}</span></span>
                  <span className="text-blue-600">Create bill +</span>
                </summary>
                {v.diagnosis && <div className="mt-4 text-xs text-slate-500">Diagnosis: <span className="font-medium text-slate-700">{v.diagnosis}</span></div>}
                <BillForm visit={v} services={services} onDone={reload} />
              </details>
            ))}
          </div>
        </section>
      )}

      <TableCard title="Outstanding payments" subtitle="Record cash, card or insurance payments against each bill.">
        {bills.length === 0 ? <Empty message="No outstanding bills." /> : (
          <div className="divide-y divide-slate-100">
            {bills.map((b) => (
              <div key={b.id} className="grid gap-4 p-5 md:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="text-sm font-semibold text-slate-700">{b.full_name} <span className="font-normal text-slate-400">· {b.patient_number} · Bill #{b.id}</span></div>
                  <div className="mt-1 text-xs text-slate-400">Visit #{b.visit_id} · {fmtDate(b.created_at)}</div>
                  <div className="mt-2 text-xs text-slate-500">{b.item_summary}</div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <span className="text-slate-500">Total <strong className="text-slate-700">{money(b.total_amount)}</strong></span>
                    <span className="text-slate-500">Paid <strong className="text-emerald-700">{money(b.paid_amount)}</strong></span>
                    <span className="text-slate-500">Balance <strong className="text-orange-700">{money(b.balance)}</strong></span>
                  </div>
                </div>
                <PaymentForm key={`${b.id}-${b.balance}`} bill={b} onDone={reload} />
              </div>
            ))}
          </div>
        )}
      </TableCard>

      <div className="mt-7">
        <TableCard title="Recent visit reports" subtitle="Open or print a complete report for recent consultations.">
          {reports.length === 0 ? <Empty message="No consultations are available for reporting yet." /> : (
            <div className="divide-y divide-slate-100">
              {reports.map((r) => (
                <div key={r.visit_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{r.full_name} <span className="font-normal text-slate-400">· {r.patient_number} · Visit #{r.visit_id}</span></div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">{fmtDate(r.created_at)} · <StatusBadge status={r.status} />{r.bill_status && <> · Bill <StatusBadge status={r.bill_status} /></>}</div>
                  </div>
                  <Link to={`/visits/${r.visit_id}/report`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">View report →</Link>
                </div>
              ))}
            </div>
          )}
        </TableCard>
      </div>
    </>
  );
}
