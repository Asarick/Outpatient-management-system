import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Card, Empty, Field, Loading, PageHeader, PanelTitle, Select, StatCard, Th, inputCls } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';

function ServiceRow({ s, onDone }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ name: s.name, unit_price: s.unit_price, is_active: s.is_active ? '1' : '0' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    if (await run(() => api.put(`/admin/services/${s.id}`, { ...f, is_active: f.is_active === '1' }))) onDone();
  };
  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-[1fr_160px_130px_auto] sm:items-end">
      <Field label="Service name" required maxLength={200} value={f.name} onChange={set('name')} />
      <Field label="Price (KSh)" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={f.unit_price} onChange={set('unit_price')} />
      <Select label="Status" value={f.is_active} onChange={set('is_active')}><option value="1">Available</option><option value="0">Inactive</option></Select>
      <Button variant="secondary" disabled={busy}>Save price</Button>
    </form>
  );
}

export default function Admin() {
  const { user, notify } = useAuth();
  const { data, reload } = useLoad('/admin/overview');
  const { run, busy } = useAction();
  const [svc, setSvc] = useState({ name: '', unit_price: '' });
  const [staff, setStaff] = useState({ name: '', email: '', role: '' });
  if (!data) return <Loading />;
  const { staff: members, services, active_admins: admins } = data;
  const activeCount = members.filter((m) => m.is_active).length;
  const pending = members.filter((m) => m.must_change_password).length;

  const addService = async (e) => {
    e.preventDefault();
    if (await run(() => api.post('/admin/services', { ...svc, is_active: true }))) {
      setSvc({ name: '', unit_price: '' });
      reload();
    }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    const res = await run(() => api.post('/admin/staff', staff), { success: false });
    if (res) {
      notify('success', `${res.message} Temporary password (shown once): ${res.temporary_password}`, true);
      setStaff({ name: '', email: '', role: '' });
      reload();
    }
  };

  const deactivate = async (m) => {
    if (!window.confirm('Deactivate this staff account? They will no longer be able to sign in.')) return;
    if (await run(() => api.post(`/admin/staff/${m.id}/deactivate`))) reload();
  };

  return (
    <>
      <PageHeader badge="Admin workspace" title="Staff & pricing" subtitle={`Manage users for ${user.organization_name} only.`} />
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <StatCard label="Staff accounts" value={members.length} detail="All account statuses" icon="◎" tone="blue" />
        <StatCard label="Active accounts" value={activeCount} detail="Can sign in" icon="✓" tone="green" />
        <StatCard label="Password setup pending" value={pending} detail="Temporary passwords" icon="⌁" tone="amber" />
      </div>

      <Card className="mt-7">
        <PanelTitle title="Standard service prices" subtitle="Maintain your hospital’s own KSh prices. Checkout uses these saved prices automatically." />
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-800">
          Sample outpatient consultations, nursing services, and common tests are preloaded, including psychiatrist consultation at KSh 7,000. These example prices are not a universal hospital tariff: adjust them to your hospital's approved fee schedule. Price changes apply to new bills only; existing bills keep their original amounts.
        </div>
        <form onSubmit={addService} className="mb-7 grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <Field label="Service or consultation name" required maxLength={200} placeholder="e.g. General consultation" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
          <Field label="Price (KSh)" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="1500.00" value={svc.unit_price} onChange={(e) => setSvc({ ...svc, unit_price: e.target.value })} />
          <Button disabled={busy}>Add to price list</Button>
        </form>
        {services.length === 0 ? <Empty message="No standard prices have been set up. Add a service above to enable preset billing." /> : (
          <div className="space-y-3">{services.map((s) => <ServiceRow key={`${s.id}-${s.unit_price}-${s.name}-${s.is_active}`} s={s} onDone={reload} />)}</div>
        )}
      </Card>

      <div className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="h-fit">
          <PanelTitle title="Create staff account" subtitle="A random one-time password is generated and shown once." />
          <form onSubmit={createStaff} className="space-y-4">
            <Field label="Full name" required placeholder="Staff member name" value={staff.name} onChange={(e) => setStaff({ ...staff, name: e.target.value })} />
            <Field label="Work email" type="email" required placeholder="name@clinic.com" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} />
            <Select label="Workspace role" required value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
              <option value="">Select a role</option>
              <option value="receptionist">Receptionist</option><option value="nurse">Nurse / Triage</option>
              <option value="doctor">Doctor</option><option value="billing">Billing</option><option value="admin">Administrator</option>
            </Select>
            <Button disabled={busy}>Create staff account</Button>
          </form>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-[11px] leading-relaxed text-blue-800">
            The temporary password is shown only in the confirmation after account creation. Share it directly with the staff member. They must set a new password before accessing the app.
          </div>
        </Card>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-5 md:px-6">
            <h2 className="text-sm font-semibold">Staff directory</h2>
            <p className="mt-1 text-xs text-slate-400">{members.length} accounts · {admins} active administrator{admins === 1 ? '' : 's'}</p>
          </div>
          {members.length === 0 ? <Empty message="No staff accounts yet." /> : (
            <div className="scrollbar overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><Th className="px-5">Staff member</Th><Th>Workspace</Th><Th>Status</Th><Th className="px-5">Action</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4"><div className="font-semibold text-slate-700">{m.name}</div><div className="mt-1 text-[10px] text-slate-400">{m.email}</div></td>
                      <td className="px-4 py-4 capitalize text-slate-500">{m.role}</td>
                      <td className="px-4 py-4">
                        {!m.is_active ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">Inactive</span>
                          : m.must_change_password ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Setup required</span>
                          : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Active</span>}
                      </td>
                      <td className="px-5 py-4">
                        {m.is_active && m.id !== user.id && !(m.role === 'admin' && admins <= 1)
                          ? <button onClick={() => deactivate(m)} className="text-[11px] font-semibold text-rose-600 hover:text-rose-700">Deactivate</button>
                          : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
