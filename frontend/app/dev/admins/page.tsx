'use client';

import { useAuth } from '@/lib/authContext';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { getApiUrl } from '@/lib/api';
import { useLanguage } from '@/lib/languageContext';

interface AdminEntry {
  email: string;
  addedAt?: { seconds: number; nanoseconds: number };
  addedBy?: string;
}

export default function DevAdminsPage() {
  return (
    <ProtectedRoute requiredRole={['dev']}>
      <DevAdminsContent />
    </ProtectedRoute>
  );
}

function DevAdminsContent() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parseJsonSafe = (raw: string) => {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return { error: 'Server returned an invalid response. Check API configuration.' };
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(getApiUrl('/api/adminAllowlist'), {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      const raw = await res.text();
      const data = parseJsonSafe(raw);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load admins');
      }
      setAdmins(data.admins || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchAdmins();
  }, [user]);

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(getApiUrl('/api/adminAllowlist'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ email })
      });
      const raw = await res.text();
      const data = parseJsonSafe(raw);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add admin');
      }
      setSuccess(`Added ${data.email}`);
      setEmail('');
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (removeEmail: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(getApiUrl('/api/adminAllowlist'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ email: removeEmail })
      });
      const raw = await res.text();
      const data = parseJsonSafe(raw);
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove admin');
      }
      setSuccess(`Removed ${data.email}`);
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">Developer</p>
        <h1 className="text-3xl font-semibold text-white">
          {language === 'ne' ? 'प्रशासक अनुमति सूची' : 'Admin Allowlist'}
        </h1>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'गुगल लग इनका लागि प्रशासक इमेल थप्नुहोस्।' : 'Add admin emails that can sign in with Google.'}
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-200">{success}</div>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3">
        <label className="text-sm text-slate-400">{language === 'ne' ? 'प्रशासक इमेल' : 'Admin email'}</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !email}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {language === 'ne' ? 'प्रशासक थप्नुहोस्' : 'Add Admin'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-300">
          {language === 'ne' ? 'हालका प्रशासक' : 'Current Admins'}
        </div>
        {loading ? (
          <div className="px-6 py-6 text-slate-400">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="px-6 py-6 text-slate-400">No admin emails allowlisted yet.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {admins.map((admin) => (
              <li key={admin.email} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm text-white">{admin.email}</p>
                  {admin.addedBy && <p className="text-xs text-slate-500">Added by {admin.addedBy}</p>}
                </div>
                <button
                  onClick={() => handleRemove(admin.email)}
                  className="text-sm text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
