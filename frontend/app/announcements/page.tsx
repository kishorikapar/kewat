'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { firebaseFirestore } from '@/lib/firebaseClient';
import { useLanguage } from '@/lib/languageContext';
import { getApiUrl } from '@/lib/api';
import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

type Announcement = {
  id: string;
  groupId: string;
  title: string;
  message: string;
  createdAt: Date;
  createdBy?: string | null;
  createdByEmail?: string | null;
  createdByName?: string | null;
};

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute requiredRole={['member', 'admin', 'dev']}>
      <AnnouncementsContent />
    </ProtectedRoute>
  );
}

function AnnouncementsContent() {
  const { user, role, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [groupId, setGroupId] = useState('global');
  const [adminGroups, setAdminGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [items, setItems] = useState<Announcement[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const canPost = role === 'admin' || role === 'dev';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAdminGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    const q = query(
      collection(firebaseFirestore, 'memberships'),
      where('userId', '==', user.uid),
      where('role', 'in', ['admin', 'dev', 'member'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const groups = snap.docs.map((d) => String((d.data() as any).groupId || '')).filter(Boolean);
        groups.sort();
        setAdminGroups(groups);
        setGroupsLoading(false);
        if (groups.length > 0 && groupId === 'global') {
          setGroupId(groups[0]);
        }
      },
      (err) => {
        console.error('memberships groups error:', err);
        setAdminGroups([]);
        setGroupsLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, user]);

  useEffect(() => {
    setItemsLoading(true);
    const q = query(collection(firebaseFirestore, 'announcements'), where('groupId', '==', groupId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            groupId: String(data.groupId || ''),
            title: String(data.title || ''),
            message: String(data.message || ''),
            createdAt: (data.createdAt as Timestamp)?.toDate?.() ? (data.createdAt as Timestamp).toDate() : new Date(),
            createdBy: data.createdBy ?? null,
            createdByEmail: data.createdByEmail ?? null,
            createdByName: data.createdByName ?? null,
          } as Announcement;
        });
        setItems(next);
        setItemsLoading(false);
      },
      (err) => {
        console.error('announcements listener error:', err);
        setItems([]);
        setItemsLoading(false);
      }
    );

    return () => unsub();
  }, [groupId]);

  const handlePost = async () => {
    if (!user) return;
    setSending(true);
    setStatus(null);
    try {
      const idToken = await user.getIdToken();

      const res = await fetch(getApiUrl('/api/announcements'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ groupId, title: title || 'Announcement', message }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to post announcement');

      // Also create an in-app notification for the group
      const notifRes = await fetch(getApiUrl('/api/notify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          groupId,
          title: title || 'Announcement',
          message,
          data: { type: 'announcement', groupId },
        }),
      });

      if (!notifRes.ok) {
        // Don't block the UI if notification fails; announcement is already saved.
        console.warn('notify failed', await notifRes.text());
      }

      setTitle('');
      setMessage('');
      setStatus(language === 'ne' ? 'सूचना पोस्ट भयो।' : 'Announcement posted.');
    } catch (error: any) {
      setStatus(error?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const groupOptions = useMemo(() => {
    const base = ['global'];
    for (const g of adminGroups) if (!base.includes(g)) base.push(g);
    return base;
  }, [adminGroups]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Announcements</p>
          <h1 className="text-3xl font-semibold text-white">{language === 'ne' ? 'सूचना' : 'Announcements'}</h1>
          <p className="mt-2 text-slate-300">
            {language === 'ne' ? 'समूहका आधिकारिक सूचनाहरू यहाँ देखिन्छ।' : 'Official announcements for the group show here.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white"
            aria-label="Select group"
            disabled={groupsLoading}
          >
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canPost ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div className="text-sm font-semibold text-slate-200">{language === 'ne' ? 'नयाँ सूचना' : 'New announcement'}</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={language === 'ne' ? 'शीर्षक' : 'Title'}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={language === 'ne' ? 'सन्देश...' : 'Message...'}
            className="min-h-[140px] w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
          />
          {status ? <div className="text-sm text-emerald-300">{status}</div> : null}
          <button
            onClick={handlePost}
            disabled={sending || !message}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {sending ? (language === 'ne' ? 'पोस्ट हुँदैछ...' : 'Posting...') : language === 'ne' ? 'पोस्ट गर्नुहोस्' : 'Post'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
          {language === 'ne' ? 'तपाईं यो पेज हेर्न सक्नुहुन्छ, तर पोस्ट गर्न सक्नुहुन्न।' : 'You can view announcements but cannot post.'}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'हालका सूचनाहरू' : 'Latest announcements'}
        </div>

        {itemsLoading ? (
          <div className="px-6 py-6 text-slate-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">{language === 'ne' ? 'अहिलेसम्म कुनै सूचना छैन।' : 'No announcements yet.'}</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {items.map((a) => (
              <li key={a.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{a.title}</div>
                    <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{a.message}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {a.createdAt.toLocaleString()}
                      {a.createdByName ? ` • ${a.createdByName}` : a.createdByEmail ? ` • ${a.createdByEmail}` : ''}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
