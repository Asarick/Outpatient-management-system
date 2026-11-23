import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Accordion from '../../components/Accordion.jsx';
import api from '../../api.js';

export default function Faqs() {
  const [faqs, setFaqs] = useState(null);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = 'FAQs | VitalHub';
    api.get('/public/faqs').then((r) => setFaqs(r.data.faqs)).catch(() => setFaqs([]));
  }, []);

  const cats = useMemo(() => ['All', ...new Set((faqs || []).map((f) => f.category))], [faqs]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (faqs || []).filter((f) => (cat === 'All' || f.category === cat) && (!term || `${f.question} ${f.answer}`.toLowerCase().includes(term)));
  }, [faqs, cat, q]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Frequently asked questions</h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">How VitalHub works, and how a hospital gets started.</p>

      <div className="mt-10 flex flex-wrap items-center gap-2">
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${cat === c ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{c}</button>
        ))}
      </div>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the questions" aria-label="Search the questions"
        className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400" />

      <div className="mt-8">
        {faqs === null ? <p className="py-10 text-sm text-slate-400">Loading…</p>
          : shown.length === 0 ? <p className="py-10 text-sm text-slate-500">No questions match. Try different words, or <Link to="/contact" className="font-semibold text-blue-700 hover:underline">ask us directly</Link>.</p>
          : <Accordion items={shown} />}
      </div>
      <div className="mt-12 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
        Did not find your answer? <Link to="/contact" className="font-semibold text-blue-700 hover:underline">Send us a message</Link>.
      </div>
    </div>
  );
}
