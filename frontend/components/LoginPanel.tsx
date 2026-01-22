'use client';

import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';
import { getApiUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/lib/languageContext';

interface LoginPanelProps {
  showHeader?: boolean;
}

export function LoginPanel({ showHeader = true }: LoginPanelProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const devEmails = (process.env.NEXT_PUBLIC_DEV_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const idToken = await result.user.getIdToken();
      await fetch(getApiUrl('/api/claimRole'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      const tokenResult = await result.user.getIdTokenResult(true);
      const email = (result.user.email || '').toLowerCase();
      const role = (tokenResult.claims.role as string | undefined) || 'member';

      if (!devEmails.includes(email) && role === 'member') {
        await signOut(firebaseAuth);
        setError(language === 'ne'
          ? 'गुगल लग इन केवल प्रशासक/डेभलपरका लागि हो।'
          : 'Google login is only for admins or developers.');
        return;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-900/40">
      {showHeader && (
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'प्रवेश' : 'Sign In'}</h2>
          <p className="text-sm text-slate-400">
            {language === 'ne' ? 'कृपया आफ्नो प्रकार छान्नुहोस्।' : 'Choose your access type to continue.'}
          </p>
        </div>
      )}

      {error && <div className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</div>}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {loading ? (language === 'ne' ? 'लग इन हुँदैछ...' : 'Signing in...') : language === 'ne' ? 'प्रशासक (गुगल) लग इन' : 'Admin Login (Google)'}
      </button>

      <div className="my-6 border-t border-slate-800" />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">{language === 'ne' ? 'सदस्य लग इन' : 'Member Login'}</h3>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={language === 'ne' ? 'इमेल' : 'Email'}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={language === 'ne' ? 'पासवर्ड' : 'Password'}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
        />
        <button
          onClick={handleMemberSignIn}
          disabled={loading || !email || !password}
          className="w-full rounded-full border border-slate-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? (language === 'ne' ? 'लग इन हुँदैछ...' : 'Signing in...') : language === 'ne' ? 'सदस्य लग इन' : 'Login as Member'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        {language === 'ne'
          ? 'प्रशासक पहुँचका लागि डेभलपरले अनुमति दिनुपर्छ।'
          : 'Admins must be allowlisted by the developer.'}
      </p>
    </article>
  );
}
