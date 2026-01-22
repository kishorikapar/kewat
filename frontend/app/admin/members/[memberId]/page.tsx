'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
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

type MembershipRow = {
  userId: string;
  groupId: string;
  role: 'member' | 'admin' | 'dev';
  email?: string;
  displayName?: string;
};

export default function AdminMemberDetailPage({ params }: { params: { memberId: string } }) {
  return (
    <ProtectedRoute requiredRole={['admin', 'dev']}>
      <AdminMemberDetail memberId={params.memberId} />
    </ProtectedRoute>
  );
}

function AdminMemberDetail({ memberId }: { memberId: string }) {
  const { user, role, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [entries, setEntries] = useState<LedgerEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [adminGroups, setAdminGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [memberProfile, setMemberProfile] = useState<{ displayName?: string; email?: string } | null>(null);

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
    if (!selectedGroup) return;

    const q = query(
      collection(firebaseFirestore, 'memberships'),
      where('userId', '==', memberId),
      where('groupId', '==', selectedGroup)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const row = snap.docs[0]?.data() as any;
        if (!row) {
          setMemberProfile(null);
          return;
        }
        setMemberProfile({
          displayName: row.displayName ? String(row.displayName) : undefined,
          email: row.email ? String(row.email) : undefined,
        });
      },
      (err) => {
        console.error('member membership listener error:', err);
        setMemberProfile(null);
      }
    );

    return () => unsub();
  }, [memberId, selectedGroup]);

  useEffect(() => {
    if (!selectedGroup) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firebaseFirestore, 'ledgerEntries'),
      where('memberId', '==', memberId),
      where('groupId', '==', selectedGroup)
    );
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
        setLoading(false);
      }
    );

    return () => unsub();
  }, [memberId, selectedGroup]);

  const totals = useMemo(() => {
    const disbursed = entries
      .filter((e) => e.status !== 'rejected' && e.type === 'disbursement')
      .reduce((sum, e) => sum + e.amountPaisa, 0);
    const repaid = entries
      .filter((e) => e.status !== 'rejected' && e.type === 'repayment')
      .reduce((sum, e) => sum + e.amountPaisa, 0);
    const outstanding = Math.max(0, disbursed - repaid);
    return { disbursed, repaid, outstanding };
  }, [entries]);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Admin</p>
          <h1 className="text-3xl font-semibold text-white">
            {language === 'ne' ? 'सदस्य विवरण' : 'Member Detail'}
          </h1>
          <div className="mt-2 space-y-1 text-slate-300">
            <div>
              {language === 'ne' ? 'सदस्य UID' : 'Member UID'}: <span className="text-white">{memberId}</span>
            </div>
            {memberProfile?.displayName ? (
              <div>
                {language === 'ne' ? 'नाम' : 'Name'}: <span className="text-white">{memberProfile.displayName}</span>
              </div>
            ) : null}
            {memberProfile?.email ? (
              <div>
                {language === 'ne' ? 'इमेल' : 'Email'}: <span className="text-white">{memberProfile.email}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/records" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
            {language === 'ne' ? 'रेकर्डमा फर्किनुहोस्' : 'Back to Records'}
          </Link>
          <Link href="/transactions" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
            {language === 'ne' ? 'नयाँ एन्ट्री' : 'New Entry'}
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={language === 'ne' ? 'दिएको (Loan)' : 'Disbursed'} value={formatNprFromPaisa(totals.disbursed)} />
        <StatCard label={language === 'ne' ? 'फिर्ता' : 'Repaid'} value={formatNprFromPaisa(totals.repaid)} />
        <StatCard label={language === 'ne' ? 'बाकी' : 'Outstanding'} value={formatNprFromPaisa(totals.outstanding)} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'लेजर इतिहास' : 'Ledger History'}
        </div>

        {loading ? (
          <div className="px-6 py-6 text-slate-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">No entries for this member yet.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Signed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Evidence</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800 hover:bg-slate-950/30">
                  <td className="px-6 py-3 text-sm text-slate-200">{e.occurredAt.toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm text-white">{e.type === 'disbursement' ? 'Loan' : 'Repayment'}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-white">{formatNprFromPaisa(e.amountPaisa)}</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{(e.interestRateBps / 100).toFixed(2)}%</td>
                  <td className="px-6 py-3 text-sm text-slate-200">{e.signedBy}</td>
                  <td className="px-6 py-3 text-sm">
                    {e.evidenceUrls && e.evidenceUrls.length > 0 ? (
                      <a href={e.evidenceUrls[0]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                        View
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs uppercase text-slate-300">{e.status}</td>
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
