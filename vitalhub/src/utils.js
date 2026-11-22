export const money = (v) =>
  'KSh ' + Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');

export const fmtDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('en-US', opts) : '—';
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
export const fmtDateTime = (iso) => (iso ? `${fmtDate(iso)} · ${fmtTime(iso)}` : '—');

export const ROLE_NAMES = {
  platform_admin: 'Platform admin',
  receptionist: 'Reception',
  nurse: 'Nursing',
  doctor: 'Medical',
  billing: 'Billing',
  admin: 'Administration',
};

export const STATUS_LABEL = {
  checked_in: 'Waiting for triage',
  triaged: 'Waiting for doctor',
  awaiting_billing: 'Ready for billing',
  awaiting_payment: 'Payment due',
  completed: 'Completed',
};

export const STATUS_CLASS = {
  checked_in: 'bg-amber-50 text-amber-700',
  triaged: 'bg-blue-50 text-blue-700',
  awaiting_billing: 'bg-violet-50 text-violet-700',
  awaiting_payment: 'bg-orange-50 text-orange-700',
  completed: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  pending: 'bg-slate-100 text-slate-600',
};
