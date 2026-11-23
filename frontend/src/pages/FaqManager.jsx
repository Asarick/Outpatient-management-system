import { useState } from 'react';
import api from '../api.js';
import { Button, Card, Field, Loading, PageHeader, PanelTitle, Select, TextArea } from '../components/ui.jsx';
import { useAction, useLoad } from '../hooks.js';

const BLANK = { category: 'General', question: '', answer: '', sort_order: 100, is_published: '1' };
const payload = (f) => ({ ...f, sort_order: Number(f.sort_order) || 0, is_published: f.is_published === '1' });

function FaqRow({ faq, onDone }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ category: faq.category, question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_published: faq.is_published ? '1' : '0' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => { e.preventDefault(); if (await run(() => api.put(`/platform/faqs/${faq.id}`, payload(f)))) onDone(); };
  const del = async () => { if (window.confirm('Delete this FAQ?') && await run(() => api.delete(`/platform/faqs/${faq.id}`))) onDone(); };
  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-slate-100 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_140px]">
        <Field label="Category" required maxLength={60} value={f.category} onChange={set('category')} />
        <Field label="Order" inputMode="numeric" value={f.sort_order} onChange={set('sort_order')} />
        <Select label="Visibility" value={f.is_published} onChange={set('is_published')}><option value="1">Published</option><option value="0">Hidden</option></Select>
      </div>
      <Field label="Question" required maxLength={300} value={f.question} onChange={set('question')} />
      <TextArea label="Answer" required rows={3} maxLength={4000} value={f.answer} onChange={set('answer')} />
      <div className="flex gap-2"><Button variant="secondary" disabled={busy}>Save changes</Button><Button type="button" variant="secondary" onClick={del} disabled={busy}>Delete</Button></div>
    </form>
  );
}

export default function FaqManager() {
  const { data, reload } = useLoad('/platform/faqs');
  const { run, busy } = useAction();
  const [f, setF] = useState(BLANK);
  if (!data) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async (e) => { e.preventDefault(); if (await run(() => api.post('/platform/faqs', payload(f)))) { setF(BLANK); reload(); } };

  return (
    <>
      <PageHeader badge="Platform workspace" title="FAQs" subtitle="Questions shown on the public FAQ page. Lower order numbers appear first; hidden questions are not shown to visitors." />
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="h-fit">
          <PanelTitle title="Add a question" />
          <form onSubmit={add} className="space-y-4">
            <Field label="Category" required maxLength={60} value={f.category} onChange={set('category')} />
            <Field label="Question" required maxLength={300} value={f.question} onChange={set('question')} />
            <TextArea label="Answer" required rows={4} maxLength={4000} value={f.answer} onChange={set('answer')} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Order" inputMode="numeric" value={f.sort_order} onChange={set('sort_order')} />
              <Select label="Visibility" value={f.is_published} onChange={set('is_published')}><option value="1">Published</option><option value="0">Hidden</option></Select>
            </div>
            <Button disabled={busy}>Add FAQ</Button>
          </form>
        </Card>
        <div className="space-y-3">
          {data.faqs.length === 0 && <Card className="text-sm text-slate-500">No FAQs yet. Add one, or run <code>flask --app run seed-faqs</code> to load the starter set.</Card>}
          {data.faqs.map((faq) => <FaqRow key={`${faq.id}-${faq.question}-${faq.answer.length}`} faq={faq} onDone={reload} />)}
        </div>
      </div>
    </>
  );
}
