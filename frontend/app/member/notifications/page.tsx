'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';

type NotificationRow = {
  id: string;
  groupId: string;
  title: string;
  message: string;
  createdAt: Date;
  status: string;
  data?: any;
};

export default function MemberNotificationsPage() {
  return (
    <ProtectedRoute requiredRole={['member']}>
      <MemberNotifications />
    </ProtectedRoute>
  );
}

function MemberNotifications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const q = query(
      collection(firebaseFirestore, 'notifications'),
      where('recipientIds', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            groupId: String(data.groupId || ''),
            title: String(data.title || ''),
            message: String(data.message || ''),
            createdAt: (data.createdAt as Timestamp)?.toDate?.() ? (data.createdAt as Timestamp).toDate() : new Date(),
            status: String(data.status || ''),
            data: data.data || undefined,
          } as NotificationRow;
        });

        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error('notifications listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">{language === 'ne' ? 'सदस्य' : 'Member'}</p>
        <h1 className="text-3xl font-semibold text-white">{language === 'ne' ? 'सूचना' : 'Notifications'}</h1>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'तपाईंलाई आएका रिमाइन्डर र सूचना।' : 'Your reminders and updates.'}
        </p>
      </div>

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <article key={n.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{n.title}</h2>
                  <p className="mt-1 text-sm text-slate-300">{n.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{n.createdAt.toLocaleDateString()}</p>
                  <p className="text-xs uppercase text-slate-500">{n.status}</p>
                </div>
              </div>

              {n.data?.type === 'monthly_reminder' && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200">
                  <p>Period: {n.data.periodKey}</p>
                  <p>Principal: NPR {(Number(n.data.principalOutstandingPaisa || 0) / 100).toFixed(2)}</p>
                  <p>Interest: NPR {(Number(n.data.interestPaisa || 0) / 100).toFixed(2)}</p>
                  <p className="font-semibold">Total Due: NPR {(Number(n.data.totalDuePaisa || 0) / 100).toFixed(2)}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
