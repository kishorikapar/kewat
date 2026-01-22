'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { formatNprFromPaisa } from '@/lib/money';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
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
  status: 'recorded' | 'verified' | 'rejected';
  occurredAt: Date;
};

export default function MemberReportPage() {
  return (
    <ProtectedRoute requiredRole={['member']}>
      <MemberReport />
    </ProtectedRoute>
  );
}

function MemberReport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const memberId = user?.uid || '';

  const [entries, setEntries] = useState<LedgerEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;

    const q = query(collection(firebaseFirestore, 'ledgerEntries'), where('memberId', '==', memberId));
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
              status: (data.status || 'recorded') as any,
              occurredAt: (data.occurredAt as Timestamp)?.toDate?.() ? (data.occurredAt as Timestamp).toDate() : new Date(),
            } as LedgerEntryRow;
          })
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

        setEntries(rows);
        setLoading(false);
      },
      (err) => {
        console.error('member ledgerEntries listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [memberId]);

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
      <div>
        <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">{language === 'ne' ? 'सदस्य' : 'Member'}</p>
        <h1 className="text-3xl font-semibold text-white">{language === 'ne' ? 'मेरो रिपोर्ट' : 'My Report'}</h1>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'यो पृष्ठ पढ्न मात्र हो।' : 'This page is view-only.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={language === 'ne' ? 'दिएको (Loan)' : 'Disbursed'} value={formatNprFromPaisa(totals.disbursed)} />
        <StatCard label={language === 'ne' ? 'फिर्ता' : 'Repaid'} value={formatNprFromPaisa(totals.repaid)} />
        <StatCard label={language === 'ne' ? 'बाकी' : 'Outstanding'} value={formatNprFromPaisa(totals.outstanding)} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'लेजर सूची' : 'Ledger Entries'}
        </div>

        {loading ? (
          <div className="px-6 py-6 text-slate-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">No entries yet.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800 hover:bg-slate-950/30">
                  <td className="px-6 py-3 text-sm text-slate-200">{e.occurredAt.toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm text-white">{e.type === 'disbursement' ? 'Loan' : 'Repayment'}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-white">{formatNprFromPaisa(e.amountPaisa)}</td>
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
