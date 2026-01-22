import Link from 'next/link';

const groups = [
  { name: 'Amanah Women', balance: 421300, members: 12 },
  { name: 'Kewat Logistics', balance: 980500, members: 8 }
];

function formatCents(value: number) {
  return (value / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function GroupsPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">Groups</h1>
        <Link href="/groups/new" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          Create group
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <article key={group.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">{group.members} members</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{group.name}</h2>
            <p className="mt-1 text-slate-300">Balance: {formatCents(group.balance)}</p>
            <div className="mt-4 flex gap-3">
              <button className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold uppercase text-slate-950">
                View ledger
              </button>
              <button className="rounded-full border border-slate-700 px-4 py-1 text-xs text-white">Manage members</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}