'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useLanguage } from '@/lib/languageContext';
import { useAuth } from '@/lib/authContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { formatNprFromPaisa } from '@/lib/money';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type EntryType = 'disbursement' | 'repayment';

type LedgerEntryRow = {
  id: string;
  groupId: string;
  memberId: string;
  type: EntryType;
  amountPaisa: number;
  interestRateBps: number;
  signedBy: string;
  notes?: string | null;
  evidenceUrls?: string[];
  status: 'recorded' | 'verified' | 'rejected';
  occurredAt: Date;
};

type MemberSummary = {
  memberId: string;
  entryCount: number;
  disbursedPaisa: number;
  repaidPaisa: number;
  outstandingPaisa: number;
  lastActivityAt?: Date;
};

type MemberIdentity = {
  userId: string;
  displayName?: string;
  email?: string;
};

export default function AdminMonitoringPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'dev']}>
      <AdminMonitoringContent />
    </ProtectedRoute>
  );
}

function AdminMonitoringContent() {
  const { user, role, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [adminGroups, setAdminGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [entries, setEntries] = useState<LedgerEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [memberIdentities, setMemberIdentities] = useState<Record<string, MemberIdentity>>({});
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'admin' && role !== 'dev')) {
      setAdminGroups([]);
      setSelectedGroup('');
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    const q = query(
      collection(firebaseFirestore, 'memberships'),
      where('userId', '==', user.uid),
      where('role', 'in', ['admin', 'dev'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const groupIds = snap.docs
          .map((d) => String((d.data() as any).groupId || ''))
          .filter(Boolean);

        groupIds.sort();
        setAdminGroups(groupIds);
        setGroupsLoading(false);

        setSelectedGroup((current) => {
          if (current && groupIds.includes(current)) return current;
          return groupIds[0] || '';
        });
      },
      (err) => {
        console.error('memberships listener error:', err);
        setAdminGroups([]);
        setSelectedGroup('');
        setGroupsLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, user, role]);

  useEffect(() => {
    if (!selectedGroup) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(firebaseFirestore, 'ledgerEntries'), where('groupId', '==', selectedGroup));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              groupId: String(data.groupId || ''),
              memberId: String(data.memberId || ''),
              type: (data.type || 'disbursement') as EntryType,
              amountPaisa: Number(data.amountPaisa || 0),
              interestRateBps: Number(data.interestRateBps || 0),
              signedBy: String(data.signedBy || ''),
              notes: data.notes ?? null,
              evidenceUrls: Array.isArray(data.evidenceUrls) ? (data.evidenceUrls as string[]) : [],
              status: (data.status || 'recorded') as any,
              occurredAt: (data.occurredAt as Timestamp)?.toDate?.() ? (data.occurredAt as Timestamp).toDate() : new Date(),
            } as LedgerEntryRow;
          })
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

        setEntries(rows);
        setLoading(false);
      },
      (err) => {
        console.error('ledgerEntries listener error:', err);
        setEntries([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedGroup) {
      setMemberIdentities({});
      setMembersLoading(false);
      return;
    }

    setMembersLoading(true);
    const q = query(
      collection(firebaseFirestore, 'memberships'),
      where('groupId', '==', selectedGroup),
      where('role', '==', 'member')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, MemberIdentity> = {};
        for (const d of snap.docs) {
          const data = d.data() as any;
          const uid = String(data.userId || '').trim();
          if (!uid) continue;
          map[uid] = {
            userId: uid,
            displayName: data.displayName ? String(data.displayName) : undefined,
            email: data.email ? String(data.email) : undefined,
          };
        }
        setMemberIdentities(map);
        setMembersLoading(false);
      },
      (err) => {
        console.error('memberships (member list) listener error:', err);
        setMemberIdentities({});
        setMembersLoading(false);
      }
    );

    return () => unsub();
  }, [selectedGroup]);

  const summaries = useMemo(() => {
    const byMember: Record<string, MemberSummary> = {};

    for (const e of entries) {
      if (e.status === 'rejected') continue;
      if (!byMember[e.memberId]) {
        byMember[e.memberId] = {
          memberId: e.memberId,
          entryCount: 0,
          disbursedPaisa: 0,
          repaidPaisa: 0,
          outstandingPaisa: 0,
        };
      }
      const m = byMember[e.memberId];
      m.entryCount += 1;
      if (!m.lastActivityAt || e.occurredAt > m.lastActivityAt) {
        m.lastActivityAt = e.occurredAt;
      }
      if (e.type === 'disbursement') m.disbursedPaisa += e.amountPaisa;
      if (e.type === 'repayment') m.repaidPaisa += e.amountPaisa;
    }

    for (const m of Object.values(byMember)) {
      m.outstandingPaisa = Math.max(0, m.disbursedPaisa - m.repaidPaisa);
    }

    const list = Object.values(byMember).sort((a, b) => {
      if (b.outstandingPaisa !== a.outstandingPaisa) return b.outstandingPaisa - a.outstandingPaisa;
      const bTime = b.lastActivityAt?.getTime?.() ?? 0;
      const aTime = a.lastActivityAt?.getTime?.() ?? 0;
      return bTime - aTime;
    });

    const needle = filter.trim().toLowerCase();
    if (!needle) return list;

    return list.filter((m) => {
      const id = m.memberId.toLowerCase();
      const identity = memberIdentities[m.memberId];
      const name = (identity?.displayName || '').toLowerCase();
      const email = (identity?.email || '').toLowerCase();
      return id.includes(needle) || name.includes(needle) || email.includes(needle);
    });
  }, [entries, filter, memberIdentities]);

  const totals = useMemo(() => {
    const disbursed = summaries.reduce((sum, s) => sum + s.disbursedPaisa, 0);
    const repaid = summaries.reduce((sum, s) => sum + s.repaidPaisa, 0);
    const outstanding = summaries.reduce((sum, s) => sum + s.outstandingPaisa, 0);
    return { disbursed, repaid, outstanding };
  }, [summaries]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Admin</p>
          <h1 className="text-3xl font-semibold text-white">{language === 'ne' ? 'मनिटरिङ ड्यासबोर्ड' : 'Monitoring Dashboard'}</h1>
          <p className="mt-2 text-slate-300">
            {language === 'ne' ? 'समूह अनुसार सदस्यहरुको स्थिति हेर्नुहोस्।' : 'See per-member status for a group.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/transactions" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
            {language === 'ne' ? 'नयाँ एन्ट्री' : 'New Entry'}
          </Link>
          <Link href="/admin/members" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
            {language === 'ne' ? 'सदस्य खाता' : 'Create Member'}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {groupsLoading ? (
          <div className="text-sm text-slate-400">Loading groups…</div>
        ) : adminGroups.length === 0 ? (
          <div className="text-sm text-slate-400">No admin groups found for your account.</div>
        ) : (
          adminGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                selectedGroup === group ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 text-white'
              }`}
            >
              {group}
            </button>
          ))
        )}
        <div className="flex-1" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={language === 'ne' ? 'UID/नाम/इमेल खोज्नुहोस्' : 'Search by UID / name / email'}
          className="w-full md:w-[320px] rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
          aria-label="Search by member UID"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={language === 'ne' ? 'दिएको (Loan)' : 'Disbursed'} value={formatNprFromPaisa(totals.disbursed)} />
        <StatCard label={language === 'ne' ? 'फिर्ता' : 'Repaid'} value={formatNprFromPaisa(totals.repaid)} />
        <StatCard label={language === 'ne' ? 'बाकी' : 'Outstanding'} value={formatNprFromPaisa(totals.outstanding)} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'सदस्य सूची' : 'Members'}
        </div>

        {membersLoading ? (
          <div className="px-6 py-3 text-sm text-slate-400">Loading members…</div>
        ) : null}

        {loading ? (
          <div className="px-6 py-6 text-slate-400">Loading...</div>
        ) : summaries.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">No ledger entries found for this group.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Outstanding</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Disbursed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Repaid</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Entries</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Last Activity</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400">Open</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((m) => (
                <tr key={m.memberId} className="border-b border-slate-800 hover:bg-slate-950/30">
                  <td className="px-6 py-3">
                    <div className="text-sm font-semibold text-white">
                      {memberIdentities[m.memberId]?.displayName || m.memberId}
                    </div>
                    <div className="text-xs text-slate-400">
                      {memberIdentities[m.memberId]?.email ? memberIdentities[m.memberId]?.email : m.memberId}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-white">{formatNprFromPaisa(m.outstandingPaisa)}</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{formatNprFromPaisa(m.disbursedPaisa)}</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{formatNprFromPaisa(m.repaidPaisa)}</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{m.entryCount}</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{m.lastActivityAt ? m.lastActivityAt.toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/admin/members/${encodeURIComponent(m.memberId)}`}
                      className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-white"
                    >
                      {language === 'ne' ? 'विवरण' : 'Details'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-[0.3rem] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
