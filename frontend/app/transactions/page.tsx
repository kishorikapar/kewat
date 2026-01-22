'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { getApiUrl } from '@/lib/api';
import { formatNprFromPaisa, nprToPaisa } from '@/lib/money';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firebaseFirestore } from '@/lib/firebaseClient';
import Link from 'next/link';

type EntryType = 'disbursement' | 'repayment';

type MemberRow = {
  userId: string;
  displayName?: string;
  email?: string;
};

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

  const [groupId, setGroupId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [adminGroups, setAdminGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [type, setType] = useState<EntryType>('disbursement');
  const [amountNpr, setAmountNpr] = useState<number>(0);
  const [ratePercent, setRatePercent] = useState<number>(25);
  const [signedBy, setSignedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    if (!user) return;

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
        setGroupId((current) => {
          if (current && groupIds.includes(current)) return current;
          return groupIds[0] || '';
        });
      },
      (err) => {
        console.error('groups listener error:', err);
        setAdminGroups([]);
        setGroupsLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    const q = query(
      collection(firebaseFirestore, 'memberships'),
      where('groupId', '==', groupId),
      where('role', '==', 'member'),
      orderBy('displayName')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            userId: String(data.userId || ''),
            displayName: data.displayName ? String(data.displayName) : undefined,
            email: data.email ? String(data.email) : undefined,
          } as MemberRow;
        });
        setMembers(rows);
        setMembersLoading(false);

        if (rows.length > 0 && !rows.find((m) => m.userId === memberId)) {
          setMemberId(rows[0].userId);
        }
      },
      (err) => {
        console.error('members listener error:', err);
        setMembers([]);
        setMembersLoading(false);
      }
    );

    return () => unsub();
  }, [groupId, memberId]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);

    try {
      const uploaded: string[] = [];
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary upload is not configured');
      }

      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
        if (data?.secure_url) uploaded.push(String(data.secure_url));
      }

      setEvidenceUrls((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const idToken = await user?.getIdToken();

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
      setEvidenceUrls([]);
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
          {language === 'ne' ? 'समूह' : 'Group'}
          {adminGroups.length > 0 ? (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              disabled={groupsLoading}
            >
              {adminGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder={language === 'ne' ? 'समूह ID' : 'Group ID'}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
            />
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          {language === 'ne' ? 'सदस्य' : 'Member'}
          <div className="flex items-center gap-2">
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              disabled={membersLoading || members.length === 0}
            >
              {members.length === 0 ? (
                <option value="">
                  {membersLoading
                    ? language === 'ne'
                      ? 'लोड हुँदैछ...'
                      : 'Loading...'
                    : language === 'ne'
                    ? 'कुनै सदस्य छैन'
                    : 'No members found'}
                </option>
              ) : (
                members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName || member.email || member.userId}
                  </option>
                ))
              )}
            </select>
            <Link href="/admin/members" className="text-xs text-emerald-300 hover:text-emerald-200">
              {language === 'ne' ? 'नयाँ सदस्य' : 'Add member'}
            </Link>
          </div>
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

        <div className="md:col-span-2 space-y-3">
          <div className="text-sm text-slate-300">{language === 'ne' ? 'प्रमाण फोटो' : 'Evidence photos'}</div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white cursor-pointer">
              {language === 'ne' ? 'क्यामेरा/ग्यालरी' : 'Camera/Gallery'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
            {uploading ? <span className="text-sm text-slate-400">{language === 'ne' ? 'अपलोड हुँदैछ...' : 'Uploading...'}</span> : null}
          </div>
          {evidenceUrls.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {evidenceUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <img src={url} alt="Evidence" className="h-40 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setEvidenceUrls((prev) => prev.filter((_, i) => i !== index))}
                    className="mt-2 text-xs text-red-300 hover:text-red-200"
                  >
                    {language === 'ne' ? 'हटाउनुहोस्' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {language === 'ne' ? 'अहिले कुनै प्रमाण छैन।' : 'No evidence uploaded yet.'}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || uploading || !groupId || !memberId || amountPaisa <= 0 || !signedBy}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50 md:col-span-2"
        >
          {loading ? (language === 'ne' ? 'सेभ हुँदैछ...' : 'Saving...') : language === 'ne' ? 'सेभ गर्नुहोस्' : 'Save Entry'}
        </button>
      </form>
    </section>
  );
}