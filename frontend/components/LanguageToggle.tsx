'use client';

import { useLanguage } from '@/lib/languageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 p-1 text-xs">
      <button
        onClick={() => setLanguage('en')}
        className={`rounded-full px-3 py-1 font-semibold transition ${
          language === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-200 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ne')}
        className={`rounded-full px-3 py-1 font-semibold transition ${
          language === 'ne' ? 'bg-emerald-500 text-slate-950' : 'text-slate-200 hover:text-white'
        }`}
      >
        नेपाली
      </button>
    </div>
  );
}
