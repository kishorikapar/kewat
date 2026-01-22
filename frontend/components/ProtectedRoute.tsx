'use client';

import { useAuth } from '@/lib/authContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: ('member' | 'admin' | 'dev')[] }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin');
      } else if (requiredRole && !requiredRole.includes(role as any)) {
        router.push('/dashboard');
      }
    }
  }, [user, role, loading, requiredRole, router]);

  if (loading) {
    return <div className="text-center text-white py-10">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requiredRole && !requiredRole.includes(role as any)) {
    return <div className="text-center text-red-400 py-10">Access denied</div>;
  }

  return <>{children}</>;
}
