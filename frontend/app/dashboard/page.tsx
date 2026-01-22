'use client';

import { useAuth } from '@/lib/authContext';
import { useLanguage } from '@/lib/languageContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, role, loading } = useAuth();
  const { language } = useLanguage();

  if (loading) {
    return <div className="text-white">Loading dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">{language === 'ne' ? 'कृपया लग इन गर्नुहोस्' : 'Please sign in'}</h1>
        <Link href="/auth/signin" className="inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {language === 'ne' ? 'लग इन गर्नुहोस्' : 'Sign in'}
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.4rem] text-emerald-400">
          {language === 'ne' ? 'भूमिका' : 'Role'}: {role}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
          {language === 'ne' ? 'स्वागत छ' : 'Welcome'}, {user.displayName || user.email}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {language === 'ne'
            ? 'तलका बटनबाट आवश्यक काम छान्नुहोस्।'
            : 'Choose what you need from the buttons below.'}
        </p>
      </div>

      {role === 'member' && <MemberDashboard userId={user.uid} />}
      {role === 'admin' && <AdminDashboard />}
      {role === 'dev' && <DevDashboard />}
    </section>
  );
}

function MemberDashboard({ userId }: { userId: string }) {
  const { language } = useLanguage();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'मेरो रिपोर्ट' : 'My Report'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'तपाईंको स्थिति, बाँकी, र इतिहास (पढ्न मात्र)।'
            : 'Your status, outstanding amount, and history (view only).'}
        </p>
        <Link href="/member/report" className="mt-4 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {language === 'ne' ? 'रिपोर्ट हेर्नुहोस्' : 'View Report'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'समुदाय च्याट' : 'Community Chat'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'समुदायसँग कुरा गर्नुहोस्।' : 'Chat with the community.'}
        </p>
        <Link href="/community" className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'च्याट खोल्नुहोस्' : 'Open Chat'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'सूचना' : 'Announcements'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'समूहका आधिकारिक सूचनाहरू हेर्नुहोस्।' : 'View official announcements.'}
        </p>
        <Link href="/announcements" className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'सूचना हेर्नुहोस्' : 'View Announcements'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'समूह जानकारी' : 'Group Info'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'समूहको जानकारी हेर्नुहोस्।'
            : 'See your group info.'}
        </p>
        <button className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'समूह हेर्नुहोस्' : 'View Group'}
        </button>
      </article>
    </div>
  );
}

function AdminDashboard() {
  const { language } = useLanguage();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'सदस्य अभिलेख' : 'Member Records'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'सदस्यका रेकर्ड जाँच र सुधार।'
            : 'Review and update member records.'}
        </p>
        <Link href="/admin/records" className="mt-4 inline-block rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
          {language === 'ne' ? 'व्यवस्थापन' : 'Manage'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'सदस्य व्यवस्थापन' : 'Member Management'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'नयाँ सदस्य थप्नुहोस्।'
            : 'Add new members easily.'}
        </p>
        <Link href="/admin/members" className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'सदस्यहरू' : 'Manage Members'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'समुदाय च्याट' : 'Community Chat'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'समुदायसँग कुरा गर्नुहोस्।' : 'Chat with the community.'}
        </p>
        <Link href="/community" className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'च्याट खोल्नुहोस्' : 'Open Chat'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'सूचना' : 'Announcements'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne' ? 'आधिकारिक सूचना पोस्ट वा हेर्नुहोस्।' : 'Post or view official announcements.'}
        </p>
        <Link href="/announcements" className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'सूचना' : 'Announcements'}
        </Link>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'ब्याज सेटिङ' : 'Interest Settings'}</h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'ब्याज दर र पुनःगणना तालिका मिलाउनुहोस्।'
            : 'Configure compound interest rates and recalculation schedules.'}
        </p>
        <button className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'सेटिङ' : 'Configure'}
        </button>
      </article>

      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold text-white">{language === 'ne' ? 'रिपोर्ट निर्यात' : 'Export Reports'}</h2>
        <p className="mt-2 text-slate-300">{language === 'ne' ? 'CSV वा PDF रिपोर्ट निकाल्नुहोस्।' : 'Generate CSV and PDF ledger exports.'}</p>
        <button className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-white">
          {language === 'ne' ? 'निर्यात' : 'Export'}
        </button>
      </article>
    </div>
  );
}

function DevDashboard() {
  const { language } = useLanguage();
  return (
    <div className="space-y-6">
      <article className="rounded-2xl border border-emerald-500 bg-emerald-950/20 p-6">
        <h2 className="text-2xl font-semibold text-emerald-400">
          {language === 'ne' ? 'डेभलपर नियन्त्रण प्यानल' : 'Developer Control Panel'}
        </h2>
        <p className="mt-2 text-slate-300">
          {language === 'ne'
            ? 'RBAC, अडिट लग र सिस्टम नियन्त्रण।'
            : 'Full system access including RBAC management, audit logs, and advanced features.'}
        </p>
      </article>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/dev/admins" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:border-emerald-500">
          <h3 className="font-semibold text-white">{language === 'ne' ? 'एडमिन अनुमति' : 'Admin Access'}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'ne' ? 'प्रशासक इमेल थप/हटाउनुहोस्' : 'Manage admin allowlist' }
          </p>
        </Link>

        <Link href="/community" className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:border-emerald-500">
          <h3 className="font-semibold text-white">{language === 'ne' ? 'समुदाय सन्देश' : 'Community Broadcast'}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'ne' ? 'समुदायलाई सन्देश पठाउनुहोस्' : 'Send messages to members and admins'}
          </p>
        </Link>

        <button className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:border-emerald-500">
          <h3 className="font-semibold text-white">Audit Logs</h3>
          <p className="mt-1 text-sm text-slate-400">View immutable system activity logs</p>
        </button>

        <button className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left hover:border-emerald-500">
          <h3 className="font-semibold text-white">System Health</h3>
          <p className="mt-1 text-sm text-slate-400">Monitor Firestore, FCM, and storage</p>
        </button>
      </div>
    </div>
  );
}
