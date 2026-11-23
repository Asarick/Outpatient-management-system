import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { SITE } from '../siteConfig.js';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/faqs', label: 'FAQs' },
  { to: '/contact', label: 'Contact' },
];

export function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="VitalHub home">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-lg font-bold text-white">+</span>
      <span className={`font-display text-[19px] font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>VitalHub</span>
    </Link>
  );
}

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useLocation(); // re-render on navigation so the mobile menu closes via the links below
  const workspace = user ? (user.role === 'platform_admin' ? '/organizations' : '/dashboard') : null;
  const link = ({ isActive }) => `text-sm font-medium transition ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {workspace ? (
              <Link to={workspace} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700">Open your workspace</Link>
            ) : (
              <>
                <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
                <Link to="/apply" className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">Apply for a hospital account</Link>
              </>
            )}
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 md:hidden" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)}>
            <span className="text-lg leading-none">{open ? '×' : '≡'}</span>
          </button>
        </div>
        {open && (
          <nav className="border-t border-slate-100 bg-white px-5 py-4 md:hidden" aria-label="Mobile" onClick={() => setOpen(false)}>
            <div className="flex flex-col gap-4">
              {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
              {workspace ? <Link to={workspace} className="text-sm font-semibold text-blue-700">Open your workspace</Link> : (
                <>
                  <Link to="/login" className="text-sm font-medium text-slate-600">Sign in</Link>
                  <Link to="/apply" className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Apply for a hospital account</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-[#101c35] text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Outpatient care, connected. One workspace for registration, triage, consultation and billing.</p>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-semibold text-white">Explore</div>
            <ul className="space-y-2 text-slate-400">
              <li><Link className="hover:text-white" to="/about">About VitalHub</Link></li>
              <li><Link className="hover:text-white" to="/faqs">Frequently asked questions</Link></li>
              <li><Link className="hover:text-white" to="/contact">Contact us</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-semibold text-white">For hospitals</div>
            <ul className="space-y-2 text-slate-400">
              <li><Link className="hover:text-white" to="/apply">Apply for an account</Link></li>
              <li><Link className="hover:text-white" to="/apply/status">Check application status</Link></li>
              <li><Link className="hover:text-white" to="/login">Staff sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-[11px] text-slate-500">© {new Date().getFullYear()} {SITE.name} · {SITE.location}</div>
      </footer>
    </div>
  );
}
