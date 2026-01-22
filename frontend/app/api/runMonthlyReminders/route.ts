import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireAdmin(req: NextRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) return { error: 'Missing auth token', status: 401 } as const;

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'admin' && decoded.role !== 'dev') {
    return { error: 'Admin privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId') || '';
    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

    const firestore = firebaseAdmin.firestore();

    // load current default interest
    const settingsDoc = await firestore.collection('interestSettings').doc(groupId).get();
    const defaultRateBps = settingsDoc.exists ? Number(settingsDoc.data()?.rateBps ?? 2500) : 2500;

    const now = new Date();
    const periodKey = monthKey(now);

    // fetch members of group
    const membersSnap = await firestore.collection('memberships').where('groupId', '==', groupId).where('role', '==', 'member').get();

    let created = 0;
    let skipped = 0;

    for (const memberDoc of membersSnap.docs) {
      const memberId = memberDoc.data().userId || memberDoc.id.split('_')[0];
      if (!memberId) continue;

      // calculate outstanding principal from ledgerEntries
      const entriesSnap = await firestore
        .collection('ledgerEntries')
        .where('groupId', '==', groupId)
        .where('memberId', '==', memberId)
        .get();

      let disbursed = 0;
      let repaid = 0;
      for (const e of entriesSnap.docs) {
        const data = e.data() as any;
        if (data.status === 'rejected') continue;
        const amountPaisa = Number(data.amountPaisa || 0);
        if (data.type === 'disbursement') disbursed += amountPaisa;
        if (data.type === 'repayment') repaid += amountPaisa;
      }

      const outstanding = Math.max(0, disbursed - repaid);
      if (outstanding <= 0) {
        skipped++;
        continue;
      }

      // reminder doc id ensures one reminder per member per month
      const reminderId = `${groupId}_${memberId}_${periodKey}`;
      const reminderRef = firestore.collection('monthlyReminders').doc(reminderId);
      const already = await reminderRef.get();
      if (already.exists) {
        skipped++;
        continue;
      }

      // simple monthly interest on outstanding principal
      const interestPaisa = Math.round(outstanding * (defaultRateBps / 10000));
      const totalDue = outstanding + interestPaisa;

      await reminderRef.set({
        groupId,
        memberId,
        periodKey,
        principalOutstandingPaisa: outstanding,
        interestRateBps: defaultRateBps,
        interestPaisa,
        totalDuePaisa: totalDue,
        createdAt: admin.firestore.Timestamp.now(),
        createdBy: authResult.decoded.uid,
        status: 'created',
      });

      await firestore.collection('notifications').add({
        groupId,
        title: 'Monthly Reminder',
        message: `Reminder: you have NPR ${(totalDue / 100).toFixed(2)} due (principal + interest).`,
        recipientIds: [memberId],
        data: {
          type: 'monthly_reminder',
          periodKey,
          principalOutstandingPaisa: outstanding,
          interestPaisa,
          totalDuePaisa: totalDue,
          rateBps: defaultRateBps,
        },
        createdAt: admin.firestore.Timestamp.now(),
        sentAt: null,
        readBy: [],
        status: 'stored'
      });

      created++;
    }

    await firestore.collection('auditLogs').add({
      action: 'monthly_reminders_generated',
      actor: authResult.decoded.uid,
      groupId,
      details: { periodKey, created, skipped },
      timestamp: admin.firestore.Timestamp.now(),
      role: authResult.decoded.role || 'admin'
    });

    return NextResponse.json({ success: true, groupId, periodKey, created, skipped }, { status: 200 });
  } catch (error) {
    console.error('runMonthlyReminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
