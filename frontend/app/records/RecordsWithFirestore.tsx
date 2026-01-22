'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import Link from 'next/link';

interface Transaction {
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

export default function RecordsPageWithFirestore() {
  const { user, role, loading } = useAuth();
  const { language } = useLanguage();
  const [records, setRecords] = useState<Transaction[]>([]);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => {
    if (!loading || !user || role !== 'member') return;

    // Set up real-time listener for user's transactions
    const q = query(collection(firebaseFirestore, 'transactions'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate()
        })) as Transaction[];

        txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setRecords(txs);
        setFbLoading(false);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setFbLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role, loading]);

  if (loading) {
    return <div className="text-white">Authenticating...</div>;
  }

  if (role !== 'member') {
    return <div className="text-red-400">{language === 'ne' ? 'यो पृष्ठ सदस्यका लागि मात्र हो।' : 'Access denied. This page is for members only.'}</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">{language === 'ne' ? 'मेरो अभिलेख' : 'My Records'}</h1>
        <Link href="/transactions" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {language === 'ne' ? 'नयाँ थप्नुहोस्' : 'Add New'}
        </Link>
      </div>

      {fbLoading ? (
        <div className="text-center text-slate-300">{language === 'ne' ? 'लोड हुँदैछ...' : 'Loading your records...'}</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-slate-400">{language === 'ne' ? 'अहिलेसम्म कुनै अभिलेख छैन।' : 'No records yet. Start logging transactions!'}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-950/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">{language === 'ne' ? 'मिति' : 'Date'}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">{language === 'ne' ? 'रकम' : 'Amount'}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">{language === 'ne' ? 'स्थिति' : 'Status'}</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">{language === 'ne' ? 'प्रमाण' : 'Proof'}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-950/30">
                  <td className="px-6 py-3 text-sm text-slate-200">{record.createdAt.toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-white">{formatCents(record.amountCents)}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'verified'
                          ? 'bg-emerald-950 text-emerald-200'
                          : record.status === 'rejected'
                            ? 'bg-red-950 text-red-200'
                            : 'bg-yellow-950 text-yellow-200'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {record.proofUrl ? (
                      <a href={record.proofUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                        View
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
