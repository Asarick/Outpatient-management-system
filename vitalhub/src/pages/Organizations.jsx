import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Card, Empty, Field, Loading, PageHeader, PanelTitle, StatCard, Th } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';

const BLANK = { organization_name: '', admin_email: '', organization_phone: '', organization_address: '', admin_name: '' };

export default function Organizations() {
  const { notify } = useAuth();
  const { data, reload } = useLoad('/platform/organizations');
  const { run, busy } = useAction();
  const [f, setF] = useState(BLANK);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  if (!data) return <Loading />;
  const orgs = data.organizations;

  const submit = async (e) => {
    e.preventDefault();
    const res = await run(() => api.post('/platform/organizations', f), { success: false });
    if (res) {
      notify('success', `${res.message} Temporary password (shown once): ${res.temporary_password}`, true);
      setF(BLANK);
      reload();
    }
  };

  return (
    <>
      <PageHeader badge="Platform workspace" title="Organizations" subtitle="Each hospital has a separate workspace, staff directory, and patient data." />
      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <StatCard label="Organizations" value={orgs.length} detail="Hospitals registered on VitalHub" icon="▦" tone="blue" />
        <StatCard label="Active hospitals" value={orgs.filter((o) => o.is_active).length} detail="Organizations with sign-in access" icon="✓" tone="green" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="h-fit">
          <PanelTitle title="Create an organization" subtitle="The first hospital administrator is created with the organization." />
          <form onSubmit={submit} className="space-y-4">
            <Field label="Hospital / organization name" required maxLength={180} placeholder="Northside Community Hospital" value={f.organization_name} onChange={set('organization_name')} />
            <Field label="Contact email" type="email" required placeholder="admin@hospital.com" value={f.admin_email} onChange={set('admin_email')} />
            <Field label="Phone (optional)" type="tel" placeholder="+254 700 000000" value={f.organization_phone} onChange={set('organization_phone')} />
            <Field label="Address (optional)" placeholder="Street, city, region" value={f.organization_address} onChange={set('organization_address')} />
            <div className="border-t border-slate-100 pt-4"><PanelTitle title="First organization administrator" /></div>
            <Field label="Administrator full name" required placeholder="Hospital administrator" value={f.admin_name} onChange={set('admin_name')} />
            <Button disabled={busy}>Create organization & admin</Button>
          </form>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-[11px] leading-relaxed text-blue-800">
            A secure, randomly generated temporary password will be shown once after creation. The organization administrator must change it before signing in.
          </div>
        </Card>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-5 md:px-6">
            <h2 className="text-sm font-semibold">Registered hospitals</h2>
            <p className="mt-1 text-xs text-slate-400">{orgs.length} organizations · platform admins do not see clinical records</p>
          </div>
          {orgs.length === 0 ? <Empty message="No organizations created yet." /> : (
            <div className="scrollbar overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><Th className="px-5">Organization</Th><Th>Staff</Th><Th>Admins</Th><Th className="px-5">Status</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgs.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4"><div className="font-semibold text-slate-700">{o.name}</div><div className="mt-1 text-[10px] text-slate-400">{o.email} · {o.slug}</div></td>
                      <td className="px-4 py-4 text-slate-500">{o.staff_count}</td>
                      <td className="px-4 py-4 text-slate-500">{o.admin_count}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${o.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
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
