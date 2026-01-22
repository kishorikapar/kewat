'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { getApiUrl } from '@/lib/api';
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc, getDocs } from 'firebase/firestore';
import Link from 'next/link';

interface AdminTransaction {
  id: string;
  amountCents: number;
  userId: string;
  groupId: string;
  description: string;
  status: 'recorded' | 'verified' | 'rejected';
  proofUrl?: string;
  createdAt: Date;
}

function formatCents(value: number) {
  return (value / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function AdminRecordsWithFirestore() {
  const { user, role, loading } = useAuth();
  const { language } = useLanguage();
  const [records, setRecords] = useState<AdminTransaction[]>([]);
  const [fbLoading, setFbLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AdminTransaction | null>(null);
  const [editStatus, setEditStatus] = useState<AdminTransaction['status']>('recorded');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // TODO: Fetch list of groups the admin belongs to
  const adminGroups = ['group-1', 'group-2'];

  useEffect(() => {
    if (!loading || !user || (role !== 'admin' && role !== 'dev')) return;

    if (!selectedGroup) {
      setSelectedGroup(adminGroups[0] || '');
      return;
    }

    // Set up real-time listener for all transactions in the group
    const q = query(collection(firebaseFirestore, 'transactions'), where('groupId', '==', selectedGroup));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate()
        })) as AdminTransaction[];

        txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setRecords(txs);
        setFbLoading(false);

        if (!selectedMember && txs.length > 0) {
          setSelectedMember(txs[0].userId);
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setFbLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role, loading, selectedGroup]);

  useEffect(() => {
    if (!selectedMember) {
      setSelectedRecord(null);
      return;
    }

    const memberRecords = records.filter((record) => record.userId === selectedMember);
    const nextRecord = memberRecords[0] || null;
    setSelectedRecord(nextRecord);
    if (nextRecord) {
      setEditStatus(nextRecord.status);
      setEditDescription(nextRecord.description || '');
    }
  }, [records, selectedMember]);

  if (loading) {
    return <div className="text-white">Authenticating...</div>;
  }

  if (role !== 'admin' && role !== 'dev') {
    return <div className="text-red-400">Access denied. Admin or Developer privileges required.</div>;
  }

  const handleExport = async (format: 'csv' | 'pdf' | 'both') => {
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch(getApiUrl('/api/export'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-token': JSON.stringify({ role, uid: user?.uid })
        },
        body: JSON.stringify({ groupId: selectedGroup, format })
      });

      if (!response.ok) {
        alert('Export failed');
        return;
      }

      const data = await response.json();

      if (format === 'csv' || format === 'both') {
        const blob = new Blob([data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger-${selectedGroup}-${new Date().toISOString()}.csv`;
        a.click();
      }

      if ((format === 'pdf' || format === 'both') && data.pdfBase64) {
        const binaryString = atob(data.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger-${selectedGroup}-${new Date().toISOString()}.pdf`;
        a.click();
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed');
    }
  };

  const memberSummaries = records.reduce((acc, record) => {
    if (!acc[record.userId]) {
      acc[record.userId] = { userId: record.userId, count: 0, totalCents: 0 };
    }
    acc[record.userId].count += 1;
    acc[record.userId].totalCents += record.amountCents;
    return acc;
  }, {} as Record<string, { userId: string; count: number; totalCents: number }>);

  const members = Object.values(memberSummaries).sort((a, b) => b.totalCents - a.totalCents);
  const selectedMemberRecords = selectedMember
    ? records.filter((record) => record.userId === selectedMember)
    : [];

  const handleSave = async () => {
    if (!selectedRecord) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateDoc(doc(firebaseFirestore, 'transactions', selectedRecord.id), {
        status: editStatus,
        description: editDescription,
        updatedAt: Timestamp.now()
      });

      const adminSnapshot = await getDocs(
        query(
          collection(firebaseFirestore, 'memberships'),
          where('groupId', '==', selectedGroup),
          where('role', 'in', ['admin', 'dev'])
        )
      );

      const recipientIds = adminSnapshot.docs
        .map((docItem) => docItem.data().userId || docItem.id.split('_')[0])
        .filter(Boolean);

      await fetch(getApiUrl('/api/notify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-token': JSON.stringify({ role, uid: user?.uid })
        },
        body: JSON.stringify({
          groupId: selectedGroup,
          title: 'Record Updated',
          message: `Record for ${selectedRecord.userId} was updated by admin.`,
          recipientIds: recipientIds.length > 0 ? recipientIds : undefined
        })
      });

      setSaveMessage(language === 'ne' ? 'सुरक्षित गरियो।' : 'Changes saved.');
    } catch (error) {
      console.error('Update error:', error);
      setSaveMessage(language === 'ne' ? 'सुरक्षित गर्न सकेन।' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            {language === 'ne' ? 'सदस्य अभिलेख ड्यासबोर्ड' : 'Member Records Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'ne'
              ? 'सदस्य छान्नुहोस्, अनि रेकर्ड हेर्नुहोस्।'
              : 'Pick a member, then choose a record.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
            Export CSV
          </button>
          <button onClick={() => handleExport('pdf')} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {adminGroups.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              selectedGroup === group ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 text-white'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {fbLoading ? (
        <div className="text-center text-slate-300">{language === 'ne' ? 'लोड हुँदैछ...' : 'Loading records...'}</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">{language === 'ne' ? 'अहिलेसम्म कुनै अभिलेख छैन।' : 'No records in this group yet.'}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-300">{language === 'ne' ? 'सदस्य सूची' : 'Members'}</h2>
            <div className="mt-3 space-y-2">
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => setSelectedMember(member.userId)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                    selectedMember === member.userId
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">{member.userId.substring(0, 12)}</p>
                    <Link
                      href={`/admin/members/${member.userId}`}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Details
                    </Link>
                  </div>
                  <p className="text-xs text-slate-400">
                    {member.count} {language === 'ne' ? 'रेकर्ड' : 'records'} · {formatCents(member.totalCents)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-sm font-semibold text-slate-300">{language === 'ne' ? 'रेकर्ड सूची' : 'Records'}</h2>
              <div className="mt-4 space-y-3">
                {selectedMemberRecords.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedRecord?.id === record.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">{formatCents(record.amountCents)}</p>
                      <p className="text-xs text-slate-400">{record.createdAt.toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs uppercase text-slate-400">{record.status}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {language === 'ne' ? 'रेकर्ड विवरण' : 'Record Details'}
                </h2>
                {selectedRecord?.proofUrl && (
                  <a
                    href={selectedRecord.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-400"
                  >
                    {language === 'ne' ? 'प्रमाण हेर्नुहोस्' : 'View Proof'}
                  </a>
                )}
              </div>

              {selectedRecord ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Member</p>
                      <p className="text-sm text-white">{selectedRecord.userId}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Amount</p>
                      <p className="text-sm text-white">{formatCents(selectedRecord.amountCents)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase text-slate-500">{language === 'ne' ? 'स्थिति छान्नुहोस्' : 'Choose status'}</label>
                    <select
                      aria-label={language === 'ne' ? 'स्थिति' : 'Status'}
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as AdminTransaction['status'])}
                      className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
                    >
                      <option value="recorded">recorded</option>
                      <option value="verified">verified</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase text-slate-500">{language === 'ne' ? 'विवरण' : 'Description'}</label>
                    <textarea
                      aria-label={language === 'ne' ? 'विवरण' : 'Description'}
                      placeholder={language === 'ne' ? 'विवरण लेख्नुहोस्...' : 'Write details...'}
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
                    />
                  </div>

                  {saveMessage && <p className="text-sm text-emerald-300">{saveMessage}</p>}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {saving ? (language === 'ne' ? 'सुरक्षित हुँदैछ...' : 'Saving...') : language === 'ne' ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">{language === 'ne' ? 'रेकर्ड छान्नुहोस्।' : 'Select a record to edit.'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
