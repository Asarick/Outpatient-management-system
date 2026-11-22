import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { Button, Card, Empty, Field, Loading, PageHeader, PanelTitle, Select, StatusBadge, TableCard, TextArea, Th } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';
import { fmtDate } from '../utils.js';

const BLANK = { name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '', reason: '' };

export default function Patients() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [term, setTerm] = useState(q);
  const { data, loading, reload } = useLoad(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const { run, busy } = useAction();
  const [form, setForm] = useState(BLANK);
  const [checkIn, setCheckIn] = useState({ patient_id: '', reason: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!data) return <Loading />;
  const { patients, can_register: canRegister } = data;

  const search = (e) => {
    e.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
  };

  const register = async (e) => {
    e.preventDefault();
    if (await run(() => api.post('/patients', form))) {
      setForm(BLANK);
      reload();
    }
  };

  const doCheckIn = async (e) => {
    e.preventDefault();
    if (await run(() => api.post(`/patients/${checkIn.patient_id}/check-in`, { reason: checkIn.reason }))) {
      setCheckIn({ patient_id: '', reason: '' });
      reload();
    }
  };

  return (
    <>
      <PageHeader title="Patients" subtitle="Patient directory and visit history." />
      {canRegister && (
        <div className="mb-7 grid gap-6 xl:grid-cols-2">
          <Card>
            <PanelTitle title="New patient & check-in" subtitle="Create the patient record and first visit together." />
            <form onSubmit={register} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required placeholder="Patient full name" maxLength={160} value={form.name} onChange={set('name')} />
                <Field label="Date of birth" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={set('date_of_birth')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Gender" required value={form.gender} onChange={set('gender')}>
                  <option value="">Select</option><option>Female</option><option>Male</option><option>Other</option>
                </Select>
                <Field label="Phone" type="tel" required placeholder="+254 700 000000" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email (optional)" type="email" placeholder="patient@example.com" value={form.email} onChange={set('email')} />
                <Field label="Address (optional)" placeholder="Street, city" value={form.address} onChange={set('address')} />
              </div>
              <TextArea label="Reason for visit" required rows={2} maxLength={500} placeholder="Briefly describe the reason for today's visit" value={form.reason} onChange={set('reason')} />
              <Button disabled={busy}>Register & check in</Button>
            </form>
          </Card>

          <Card>
            <PanelTitle title="Check in existing patient" subtitle="Find a patient and start a new visit." />
            <form onSubmit={search} className="mb-4 flex gap-2">
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, ID or phone" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
              <button className="rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Search</button>
            </form>
            <form onSubmit={doCheckIn} className="space-y-4">
              <Select label="Patient" required value={checkIn.patient_id} onChange={(e) => setCheckIn({ ...checkIn, patient_id: e.target.value })}>
                <option value="">Choose patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.patient_number}</option>)}
              </Select>
              <TextArea label="Reason for visit" required rows={3} maxLength={500} placeholder="Briefly describe the reason for today's visit" value={checkIn.reason} onChange={(e) => setCheckIn({ ...checkIn, reason: e.target.value })} />
              <Button disabled={busy}>Check in patient</Button>
            </form>
          </Card>
        </div>
      )}

      <TableCard
        title="Patient directory"
        subtitle={`${patients.length} records${q ? ` matching “${q}”` : ''}`}
        action={
          <form onSubmit={search} className="flex gap-2">
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search patients" className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-xs sm:w-56" />
            <button className="rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600">Search</button>
          </form>
        }
      >
        {loading && !patients.length ? <Loading /> : patients.length === 0 ? <Empty message="No patients found." /> : (
          <div className="scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                <tr><Th className="px-6">Patient</Th><Th>Contact</Th><Th>Date of birth</Th><Th>Latest visit</Th><Th className="px-6">Status</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4"><div className="font-semibold text-slate-700">{p.full_name}</div><div className="mt-1 text-[10px] text-slate-400">{p.patient_number} · {p.gender}</div></td>
                    <td className="px-4 py-4 text-slate-500">{p.phone}<div className="mt-1 text-[10px] text-slate-400">{p.email || 'No email'}</div></td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(p.date_of_birth + 'T00:00:00')}</td>
                    <td className="px-4 py-4 text-slate-500">{p.visit_id ? `#${p.visit_id} · ${fmtDate(p.visit_created, { month: 'short', day: 'numeric' })}` : '—'}</td>
                    <td className="px-6 py-4">{p.visit_status ? <StatusBadge status={p.visit_status} /> : <span className="text-slate-400">No visits</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </>
  );
}
