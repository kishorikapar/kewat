'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { getApiUrl } from '@/lib/api';
import { formatNprFromPaisa, nprToPaisa } from '@/lib/money';
import { useEffect, useMemo, useState } from 'react';

type EntryType = 'disbursement' | 'repayment';

export default function TransactionsPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'dev']}>
      <EntryForm />
    </ProtectedRoute>
  );
}

function EntryForm() {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [groupId, setGroupId] = useState('group-1');
  const [memberId, setMemberId] = useState('');
  const [type, setType] = useState<EntryType>('disbursement');
  const [amountNpr, setAmountNpr] = useState<number>(0);
  const [ratePercent, setRatePercent] = useState<number>(25);
  const [signedBy, setSignedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceUrlsText, setEvidenceUrlsText] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rateBps = useMemo(() => Math.round(ratePercent * 100), [ratePercent]);
  const amountPaisa = useMemo(() => nprToPaisa(amountNpr), [amountNpr]);

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setOccurredAt(local);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const idToken = await user?.getIdToken();
      const evidenceUrls = evidenceUrlsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(getApiUrl('/api/ledgerEntries'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          groupId,
          memberId,
          type,
          amountPaisa,
          interestRateBps: rateBps,
          signedBy,
          notes,
          evidenceUrls,
          occurredAt: new Date(occurredAt).toISOString(),
        })
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setMessage(language === 'ne' ? 'रेकर्ड थपियो।' : 'Entry saved.');
      setMemberId('');
      setSignedBy('');
      setNotes('');
      setEvidenceUrlsText('');
      setAmountNpr(0);
    } catch (err: any) {
      setMessage(err?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">
          {language === 'ne' ? 'लेजर एन्ट्री' : 'Ledger Entry'}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {language === 'ne'
            ? 'समूहले सदस्यलाई दिएको वा सदस्यले फिर्ता दिएको रकम राख्नुहोस्।'
            : 'Record money given to a member or repaid back to the group.'}
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'समूह ID (अहिले म्यानुअल)' : 'Group ID (manual for now)'}
          <input value={groupId} onChange={(e) => setGroupId(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'सदस्य UID' : 'Member UID'}
          <input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="Firebase UID" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'प्रकार' : 'Type'}
          <select value={type} onChange={(e) => setType(e.target.value as EntryType)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="disbursement">{language === 'ne' ? 'दिएको (Loan)' : 'Disbursement (Loan)'} </option>
            <option value="repayment">{language === 'ne' ? 'फिर्ता (Repayment)' : 'Repayment'} </option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'रकम (NPR)' : 'Amount (NPR)'}
          <input
            type="number"
            step="0.01"
            value={amountNpr}
            onChange={(e) => setAmountNpr(Number(e.target.value))}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          />
          <span className="text-xs text-slate-400">{formatNprFromPaisa(amountPaisa)}</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'ब्याज दर (%)' : 'Interest rate (%)'}
          <input type="number" step="0.01" value={ratePercent} onChange={(e) => setRatePercent(Number(e.target.value))} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'कसले साइन गर्‍यो' : 'Signed by'}
          <input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder={language === 'ne' ? 'नाम' : 'Name'} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'मिति/समय' : 'Date & time'}
          <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'टिप्पणी' : 'Notes'}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[90px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'प्रमाण URL (हरेक लाइनमा एउटै)' : 'Evidence URLs (one per line)'}
          <textarea value={evidenceUrlsText} onChange={(e) => setEvidenceUrlsText(e.target.value)} className="min-h-[90px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        <button
          type="submit"
          disabled={loading || !groupId || !memberId || amountPaisa <= 0 || !signedBy}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 md:col-span-2"
        >
          {loading ? (language === 'ne' ? 'सेभ हुँदैछ...' : 'Saving...') : language === 'ne' ? 'सेभ गर्नुहोस्' : 'Save Entry'}
        </button>
      </form>
    </section>
  );
}