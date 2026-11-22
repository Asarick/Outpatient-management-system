import { useEffect, useState } from 'react';
import api, { errorMessage } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Card, Empty, Loading, PageHeader, StatusBadge, TextArea, Th } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';
import { fmtDate } from '../utils.js';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Declined'], ['', 'All']];
const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Declined' };
const TYPE = { hospital: 'Hospital', clinic: 'Clinic', health_centre: 'Health centre', dispensary: 'Dispensary', specialist_centre: 'Specialist centre', other: 'Other' };
const OWN = { public: 'Public', private: 'Private', faith_based: 'Faith-based', ngo: 'NGO or non-profit', other: 'Other' };

function Row({ k, v }) {
  return <div className="grid grid-cols-[130px_1fr] gap-3 py-2 text-xs"><dt className="text-slate-400">{k}</dt><dd className="break-words font-medium text-slate-700">{v || '—'}</dd></div>;
}

function Detail({ id, onChanged }) {
  const { notify } = useAuth();
  const { run, busy } = useAction();
  const [a, setA] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');

  const load = () => api.get(`/platform/applications/${id}`).then((r) => setA(r.data.application)).catch((e) => notify('error', errorMessage(e)));
  useEffect(() => { setA(null); setRejecting(false); setNote(''); load(); /* eslint-disable-next-line */ }, [id]);
  if (!a) return <Loading />;

  const openDoc = async () => {
    try {
      const res = await api.get(`/platform/applications/${id}/document`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank', 'noopener');
    } catch (e) { notify('error', errorMessage(e)); }
  };
  const approve = async () => {
    if (!window.confirm(`Approve ${a.facility_name}? This creates the hospital workspace and activates the administrator account.`)) return;
    if (await run(() => api.post(`/platform/applications/${id}/approve`))) { await load(); onChanged(); }
  };
  const reject = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/platform/applications/${id}/reject`, { note }))) { setRejecting(false); await load(); onChanged(); }
  };

  return (
    <Card className="h-fit">
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold text-slate-900">{a.facility_name}</h2><div className="mt-1 text-[11px] text-slate-400">Reference {a.reference} · submitted {fmtDate(a.created_at)}</div></div>
        <StatusBadge status={a.status} label={LABEL[a.status]} />
      </div>

      <h3 className="mt-5 text-[11px] font-semibold text-slate-500">Institution</h3>
      <dl className="divide-y divide-slate-100">
        <Row k="Type" v={TYPE[a.facility_type]} /><Row k="Ownership" v={OWN[a.ownership]} />
        <Row k="Established" v={a.year_established} /><Row k="Staff (approx.)" v={a.staff_estimate} /><Row k="Services" v={a.services} />
        <Row k="Address" v={`${a.address}, ${a.town}, ${a.county}`} /><Row k="Phone" v={a.phone} /><Row k="Email" v={a.email} /><Row k="Website" v={a.website} />
      </dl>
      <h3 className="mt-5 text-[11px] font-semibold text-slate-500">Verification</h3>
      <dl className="divide-y divide-slate-100">
        <Row k="Licence number" v={a.license_number} /><Row k="Licensing body" v={a.licensing_body} /><Row k="Licence expires" v={fmtDate(a.license_expiry)} />
        <Row k="Licence copy" v={a.has_document ? <button type="button" onClick={openDoc} className="font-semibold text-blue-700 hover:underline">Open {a.document_name}</button> : 'None uploaded'} />
      </dl>
      <h3 className="mt-5 text-[11px] font-semibold text-slate-500">Administrator</h3>
      <dl className="divide-y divide-slate-100">
        <Row k="Name" v={a.admin_name} /><Row k="Job title" v={a.admin_title} /><Row k="Email" v={a.admin_email} /><Row k="Phone" v={a.admin_phone} />
      </dl>

      {a.status === 'pending' ? (
        rejecting ? (
          <form onSubmit={reject} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
            <TextArea label="Reason for declining (the applicant will see this)" required rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2"><Button disabled={busy} className="bg-rose-600 hover:bg-rose-700">Decline application</Button><Button type="button" variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button></div>
          </form>
        ) : (
          <div className="mt-6 flex gap-2 border-t border-slate-100 pt-5">
            <Button type="button" onClick={approve} disabled={busy}>Approve and create hospital</Button>
            <Button type="button" variant="secondary" onClick={() => setRejecting(true)}>Decline…</Button>
          </div>
        )
      ) : (
        <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-500">
          {LABEL[a.status]} {fmtDate(a.reviewed_at)}.{a.review_note ? ` Note: ${a.review_note}` : ''}
        </div>
      )}
    </Card>
  );
}

export default function Applications() {
  const [tab, setTab] = useState('pending');
  const [sel, setSel] = useState(null);
  const { data, reload } = useLoad(`/platform/applications${tab ? `?status=${tab}` : ''}`, { pollMs: 30000 });
  if (!data) return <Loading />;
  const rows = data.applications;

  return (
    <>
      <PageHeader badge="Platform workspace" title="Hospital applications" subtitle="Review each application, check the licence and approve or decline. Approval creates the hospital and its administrator." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={label} type="button" onClick={() => { setTab(key); setSel(null); }}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {label}{key ? ` (${data.counts[key] ?? 0})` : ''}
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          {rows.length === 0 ? <Empty message={tab === 'pending' ? 'No applications waiting for review.' : 'Nothing to show here.'} /> : (
            <div className="scrollbar overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400"><tr><Th className="px-5">Hospital</Th><Th>Administrator</Th><Th>Submitted</Th><Th className="px-5">Status</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((a) => (
                    <tr key={a.id} onClick={() => setSel(a.id)} className={`cursor-pointer hover:bg-slate-50/70 ${sel === a.id ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-5 py-4"><div className="font-semibold text-slate-700">{a.facility_name}</div><div className="mt-1 text-[10px] text-slate-400">{a.town}, {a.county} · {a.reference}</div></td>
                      <td className="px-4 py-4 text-slate-500"><div>{a.admin_name}</div><div className="text-[10px] text-slate-400">{a.admin_email}</div></td>
                      <td className="px-4 py-4 text-slate-500">{fmtDate(a.created_at)}</td>
                      <td className="px-5 py-4"><StatusBadge status={a.status} label={LABEL[a.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {sel ? <Detail id={sel} onChanged={reload} /> : <Card className="h-fit text-sm text-slate-400">Select an application to review it.</Card>}
      </div>
    </>
  );
}
