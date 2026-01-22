'use client';

import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';

export function TopBar() {
  return (
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="text-xs font-semibold tracking-[0.4rem] text-slate-300">
        KEWAT GROUP
      </Link>
      <LanguageToggle />
    </header>
  );
}
