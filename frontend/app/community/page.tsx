'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { getApiUrl } from '@/lib/api';
import { useLanguage } from '@/lib/languageContext';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { firebaseFirestore } from '@/lib/firebaseClient';

interface CommunityMessage {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
}

export default function CommunityPage() {
  return (
    <ProtectedRoute requiredRole={['member', 'admin', 'dev']}>
      <CommunityContent />
    </ProtectedRoute>
  );
}

function CommunityContent() {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [recent, setRecent] = useState<CommunityMessage[]>([]);

  useEffect(() => {
    const q = query(collection(firebaseFirestore, 'communityMessages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as { title: string; message: string; createdAt: Timestamp })
      }));
      setRecent(
        docs.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          createdAt: item.createdAt?.toDate?.() || new Date()
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    setStatus(null);
    try {
      const idToken = await user.getIdToken();

      const res = await fetch(getApiUrl('/api/notify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          groupId: 'global',
          title: title || 'Community Update',
          message,
          data: { type: 'community' }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      await fetch(getApiUrl('/api/communityMessage'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ title, message })
      });

      setTitle('');
      setMessage('');
      setStatus(language === 'ne' ? 'सन्देश पठाइयो।' : 'Message sent.');
    } catch (error: any) {
      setStatus(error.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Community</p>
        <h1 className="text-3xl font-semibold text-white">
          {language === 'ne' ? 'समुदाय सूचना' : 'Community Broadcast'}
        </h1>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'सम्पूर्ण समुदायलाई सन्देश पठाउनुहोस्।'
            : 'Send messages to all members and admins.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={language === 'ne' ? 'शीर्षक' : 'Title'}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={language === 'ne' ? 'सन्देश लेख्नुहोस्...' : 'Write your message...'}
          className="min-h-[140px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        {status && <p className="text-sm text-emerald-300">{status}</p>}
        <button
          onClick={handleSend}
          disabled={!message || sending}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {sending ? (language === 'ne' ? 'पठाइँदैछ...' : 'Sending...') : language === 'ne' ? 'सन्देश पठाउनुहोस्' : 'Send Message'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'भर्खरका सन्देशहरू' : 'Recent Messages'}
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">
            {language === 'ne' ? 'अहिलेसम्म कुनै सन्देश छैन।' : 'No messages yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {recent.map((item) => (
              <li key={item.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <span className="text-xs text-slate-500">{item.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{item.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
