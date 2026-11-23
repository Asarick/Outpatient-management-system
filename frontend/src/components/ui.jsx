import { STATUS_CLASS, STATUS_LABEL } from '../utils.js';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-emerald-50 text-emerald-600',
};

export const inputCls =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300';

export function StatCard({ label, value, detail, icon, tone = 'blue' }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6">
      <div className="flex items-start justify-between">
        <div className="text-[13px] font-medium text-slate-500">{label}</div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${TONES[tone] || TONES.blue}`}>{icon}</div>
      </div>
      <div className="mt-4 text-[30px] font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

export function PanelTitle({ title, subtitle }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[16px] font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-card md:p-6 ${className}`}>{children}</section>;
}

export function TableCard({ title, subtitle, action, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 md:px-6">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-100'
      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
  return (
    <button
      type="submit"
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, className = '', ...props }) {
  return (
    <label className={`block text-xs font-medium text-slate-600 ${className}`}>
      {label}
      <input {...props} className={inputCls} />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className={`block text-xs font-medium text-slate-600 ${className}`}>
      {label}
      <select {...props} className={inputCls}>{children}</select>
    </label>
  );
}

export function TextArea({ label, className = '', ...props }) {
  return (
    <label className={`block text-xs font-medium text-slate-600 ${className}`}>
      {label}
      <textarea {...props} className={inputCls} />
    </label>
  );
}

export function Empty({ message }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-xl text-slate-300">◎</div>
      <div className="text-sm font-medium text-slate-600">{message}</div>
    </div>
  );
}

export function StatusBadge({ status, label }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${STATUS_CLASS[status] || 'bg-slate-100 text-slate-600'}`}>
      {label || STATUS_LABEL[status] || status}
    </span>
  );
}

export function PageHeader({ badge, title, subtitle, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {badge && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
            {badge}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="py-20 text-center text-sm text-slate-400">Loading…</div>;
}

export function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
}
