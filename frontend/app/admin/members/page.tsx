'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { getApiUrl } from '@/lib/api';
import { useLanguage } from '@/lib/languageContext';
import { useState } from 'react';

export default function AdminMembersPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'dev']}>
      <AdminMembersContent />
    </ProtectedRoute>
  );
}

function AdminMembersContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreateMember = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(getApiUrl('/api/createMember'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ email, password, displayName, groupId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create member');
      }
      setSuccess(`Created ${data.email}`);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setGroupId('');
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">
          {language === 'ne' ? 'नयाँ सदस्य खाता' : 'Create Member Account'}
        </h1>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'सदस्यको नाम र पासवर्ड सेट गर्नुहोस्।' : 'Set member name and password for login.'}
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">{success}</div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={language === 'ne' ? 'पूरा नाम' : 'Full name'}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
          />
          <input
            type="text"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            placeholder={language === 'ne' ? 'समूह ID' : 'Group ID'}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={language === 'ne' ? 'सदस्य इमेल' : 'Member email'}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={language === 'ne' ? 'अस्थायी पासवर्ड' : 'Temporary password'}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <button
          onClick={handleCreateMember}
          disabled={loading || !email || !password || !displayName || !groupId}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? (language === 'ne' ? 'बन्दैछ...' : 'Creating...') : language === 'ne' ? 'सदस्य बनाउनुहोस्' : 'Create Member'}
        </button>
      </div>
    </section>
  );
}
