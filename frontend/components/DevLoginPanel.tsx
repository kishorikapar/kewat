'use client';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';
import { getApiUrl } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/lib/languageContext';

export function DevLoginPanel() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await result.user.getIdToken(true);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
      <h1 className="text-3xl font-semibold text-white">
        {language === 'ne' ? 'डेभलपर लग इन' : 'Developer Login'}
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        {language === 'ne' ? 'केवट समूह व्यवस्थापनको डेभलपर पहुँच।' : 'Developer access for Kewat group management.'}
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</div>}

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="mt-6 w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {loading ? (language === 'ne' ? 'लग इन हुँदैछ...' : 'Signing in...') : language === 'ne' ? 'गुगल लग इन' : 'Sign in with Google'}
      </button>
    </article>
  );
}
