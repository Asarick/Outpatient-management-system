import { useState } from 'react';

/** Accessible question/answer list. `items`: [{ id, question, answer }] */
export default function Accordion({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <div key={it.id}>
            <h3>
              <button
                type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : it.id)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-semibold text-slate-900 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                {it.question}
                <span aria-hidden className={`text-xl font-light text-slate-400 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
              </button>
            </h3>
            <div className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-5 text-sm leading-7 text-slate-600">{it.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
