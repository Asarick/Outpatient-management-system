import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ROLE_NAMES, initials } from '../utils.js';

const HOSPITAL = ['receptionist', 'nurse', 'doctor', 'billing', 'admin'];
const LINKS = [
  { to: '/applications', label: 'Applications', icon: '▤', roles: ['platform_admin'] },
  { to: '/organizations', label: 'Organizations', icon: '▦', roles: ['platform_admin'] },
  { to: '/inquiries', label: 'Inquiries', icon: '✉', roles: ['platform_admin'] },
  { to: '/faq-manager', label: 'FAQs', icon: '?', roles: ['platform_admin'] },
  { to: '/dashboard', label: 'Overview', icon: '⌂', roles: HOSPITAL },
  { to: '/patients', label: 'Patients', icon: '◎', roles: HOSPITAL },
  { to: '/queue', label: 'Visit queue', icon: '≋', roles: ['receptionist', 'nurse', 'doctor', 'admin'], live: true },
  { to: '/billing', label: 'Billing & checkout', icon: 'K', roles: ['receptionist', 'billing', 'admin'] },
  { to: '/admin', label: 'Staff & pricing', icon: '⚙', roles: ['admin'] },
];

const TITLES = {
  '/organizations': 'Organizations', '/applications': 'Hospital applications', '/inquiries': 'Inquiries', '/faq-manager': 'FAQs', '/dashboard': 'Overview', '/patients': 'Patients', '/queue': 'Visit queue',
  '/billing': 'Billing & checkout', '/admin': 'Staff & pricing', '/change-password': 'Change password',
};

function Toast() {
  const { toast, setToast } = useAuth();
  useEffect(() => {
    if (!toast || toast.sticky) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  const error = toast.type === 'error';
  return (
    <div className={`mb-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
      <div className="break-words">{toast.message}</div>
      <button onClick={() => setToast(null)} className="shrink-0 text-xs font-semibold opacity-60 hover:opacity-100">Dismiss</button>
    </div>
  );
}

export { Toast };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const canSearch = HOSPITAL.includes(user.role);
  const title = pathname.startsWith('/visits/') ? 'Visit report' : TITLES[pathname] || 'VitalHub';

  const search = (e) => {
    e.preventDefault();
    navigate(`/patients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <div className="app-shell min-h-screen lg:flex">
      <aside className="flex w-full shrink-0 flex-col bg-[#101c35] text-white lg:fixed lg:inset-y-0 lg:w-[248px]">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-xl font-bold shadow-lg shadow-blue-500/25">+</div>
          <div>
            <div className="text-[17px] font-semibold tracking-tight">Vital<span className="text-blue-400">Hub</span></div>
            <div className="text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">Care, connected</div>
          </div>
        </div>
        <div className="px-5 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Workspace</div>
        <nav className="space-y-1 px-3">
          {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'} flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition`
              }
            >
              <span className="grid h-6 w-6 place-items-center text-lg">{l.icon}</span>
              {l.label}
              {l.live && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/[.06] p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-400/20 text-xs font-semibold text-blue-200">{initials(user.name)}</div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{user.name}</div>
                <div className="text-[11px] text-slate-400">{ROLE_NAMES[user.role] || 'Staff'}</div>
              </div>
            </div>
          </div>
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-white">↗ &nbsp; Sign out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-9">
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-[10px] font-semibold uppercase tracking-[.15em] text-slate-400">
              {user.organization_name || 'VitalHub platform'} · {ROLE_NAMES[user.role]}
            </div>
            <div className="text-[15px] font-semibold text-slate-800">{title}</div>
          </div>
          {canSearch && (
            <form onSubmit={search} className="flex min-w-0 flex-1 sm:max-w-xs">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-3 grid place-items-center text-sm text-slate-400">⌕</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search patient name, ID"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs placeholder:text-slate-400"
                />
              </div>
            </form>
          )}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {['receptionist', 'nurse', 'doctor', 'admin'].includes(user.role) && (
              <NavLink to="/queue" title="Visit queue" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 hover:bg-slate-50">🔔</NavLink>
            )}
            <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">{initials(user.name)}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-9">
          <Toast />
          <Outlet />
        </main>
        <footer className="px-5 pb-7 text-center text-[11px] text-slate-400 md:px-9">VitalHub · Outpatient care, connected</footer>
      </div>
    </div>
  );
}
