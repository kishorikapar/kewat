import Link from 'next/link';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Groups', href: '/groups' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Reports', href: '/reports' }
];

export function NavBar() {
  return (
    <nav className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-3">
      <span className="text-sm font-semibold tracking-[0.3rem] text-slate-400">KEWAT</span>
      <div className="flex gap-4 text-sm text-slate-300">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white">
            {item.label}
          </Link>
        ))}
      </div>
      <button className="rounded-full bg-emerald-500/80 px-4 py-1 text-xs font-semibold uppercase text-slate-950">
        Sync Now
      </button>
    </nav>
  );
}