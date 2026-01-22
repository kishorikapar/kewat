import './global.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/authContext';
import { LanguageProvider } from '@/lib/languageContext';
import { TopBar } from '@/components/TopBar';

export const metadata = {
  title: 'Kewat Group Ledger',
  description: 'Mobile-first collaborative ledger for community groups.'
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <LanguageProvider>
          <AuthProvider>
            <div className="max-w-6xl mx-auto px-4">
              <TopBar />
              {children}
            </div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}