import { useEffect, useState } from 'react';
import api from '../api.js';
import { Button, Card, Empty, Loading, PageHeader, Select, TextArea } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';
import { fmtDateTime } from '../utils.js';

const TABS = [['new', 'New'], ['read', 'Read'], ['resolved', 'Resolved'], ['', 'All']];
const LABEL = { new: 'New', read: 'Read', resolved: 'Resolved' };
const BADGE = { new: 'bg-blue-50 text-blue-700', read: 'bg-slate-100 text-slate-600', resolved: 'bg-emerald-50 text-emerald-700' };

function Detail({ item, onChanged, onDeleted }) {
  const { run, busy } = useAction();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.admin_note || '');
  useEffect(() => { setStatus(item.status); setNote(item.admin_note || ''); }, [item]);
  const save = async (e) => { e.preventDefault(); if (await run(() => api.put(`/platform/inquiries/${item.id}`, { status, admin_note: note }))) onChanged(); };
  const del = async () => { if (window.confirm('Delete this inquiry permanently?') && await run(() => api.delete(`/platform/inquiries/${item.id}`))) onDeleted(); };
  return (
    <Card className="h-fit">
      <div className="text-base font-semibold text-slate-900">{item.subject}</div>
      <div className="mt-1 text-xs text-slate-500">{item.name} · <a className="text-blue-700 hover:underline" href={`mailto:${item.email}?subject=${encodeURIComponent('Re: ' + item.subject)}`}>{item.email}</a></div>
      <div className="mt-1 text-[11px] text-slate-400">{fmtDateTime(item.created_at)}</div>
      <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{item.message}</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option></Select>
        <TextArea label="Internal note (not shown to the visitor)" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex gap-2"><Button disabled={busy}>Save</Button><Button type="button" variant="secondary" onClick={del} disabled={busy}>Delete</Button></div>
      </form>
    </Card>
  );
}

export default function Inquiries() {
  const [tab, setTab] = useState('new');
  const [selId, setSelId] = useState(null);
  const { data, reload } = useLoad(`/platform/inquiries${tab ? `?status=${tab}` : ''}`, { pollMs: 30000 });
  if (!data) return <Loading />;
  const sel = data.inquiries.find((i) => i.id === selId);

  return (
    <>
      <PageHeader badge="Platform workspace" title="Inquiries" subtitle="Messages sent through the public Contact page. Reply by email, then mark them resolved." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button key={label} type="button" onClick={() => { setTab(key); setSelId(null); }}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {label}{key ? ` (${data.counts[key] ?? 0})` : ''}
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          {data.inquiries.length === 0 ? <Empty message="No inquiries here." /> : (
            <ul className="divide-y divide-slate-100">
              {data.inquiries.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setSelId(i.id)} className={`block w-full px-5 py-4 text-left hover:bg-slate-50 ${selId === i.id ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{i.subject}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE[i.status]}`}>{LABEL[i.status]}</span></div>
                    <div className="mt-1 truncate text-xs text-slate-500">{i.name} · {fmtDateTime(i.created_at)}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{i.message}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {sel ? <Detail item={sel} onChanged={reload} onDeleted={() => { setSelId(null); reload(); }} /> : <Card className="h-fit text-sm text-slate-400">Select an inquiry to read it.</Card>}
      </div>
    </>
  );
}
