import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import { requireRole } from '../lib/rbac';
import admin from 'firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tokenHeader = req.headers['x-user-token'] as string | undefined;
    let token;
    if (tokenHeader) {
      try {
        token = JSON.parse(tokenHeader);
      } catch {
        return res.status(400).json({ error: 'Invalid token payload' });
      }
    }

    if (!requireRole(token, ['admin', 'dev'])) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const { groupId } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!groupId) {
      return res.status(400).json({ error: 'Missing groupId' });
    }

    const firestore = firebaseAdmin.firestore();

    // Fetch interest settings for the group
    const settingsDoc = await firestore.collection('compoundInterestSettings').doc(groupId).get();

    if (!settingsDoc.exists) {
      return res.status(404).json({ error: 'Interest settings not found for group' });
    }

    const settings = settingsDoc.data() as { annualRate?: number; frequency?: string } | undefined;
    const { annualRate, frequency } = settings || {};

    if (!annualRate || !frequency) {
      return res.status(400).json({ error: 'Invalid interest settings' });
    }

    // Fetch all members in the group
    const membersSnapshot = await firestore
      .collection('memberships')
      .where('groupId', '==', groupId)
      .get();

    const members = membersSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

    if (members.length === 0) {
      return res.status(200).json({ message: 'No members in group', recalculated: 0 });
    }

    // Calculate interest for each member
    const updates: any[] = [];

    for (const member of members) {
      const currentBalance = member.balanceCents || 0;
      const ratePerPeriod = annualRate / (frequency === 'monthly' ? 12 : frequency === 'daily' ? 365 : 1);
      const periodsPerYear = frequency === 'monthly' ? 12 : frequency === 'daily' ? 365 : 1;

      // Compound interest formula: A = P(1 + r)^n
      const interest = Math.round(currentBalance * (Math.pow(1 + ratePerPeriod / 100, 1) - 1));
      const newBalance = currentBalance + interest;

      updates.push({
        memberId: member.id,
        groupId,
        oldBalance: currentBalance,
        newBalance,
        interest,
        appliedAt: admin.firestore.Timestamp.now()
      });
    }

    // Apply updates in batch
    const batch = firestore.batch();

    for (const update of updates) {
      const memberRef = firestore.collection('memberships').doc(update.memberId);
      batch.update(memberRef, { balanceCents: update.newBalance });
    }

    // Log interest recalculation
    await firestore.collection('auditLogs').add({
      action: 'interest_recalculated',
      actor: uid,
      groupId,
      details: {
        annualRate,
        frequency,
        membersAffected: members.length,
        totalInterestApplied: updates.reduce((sum, u) => sum + u.interest, 0),
        updates
      },
      timestamp: admin.firestore.Timestamp.now(),
      role: token?.role || 'unknown'
    });

    await batch.commit();

    // Send notifications (placeholder)
    await firestore.collection('notifications').add({
      groupId,
      message: `Interest recalculated for your account. New balance: $${updates[0]?.newBalance / 100}.`,
      recipientIds: members.map((m) => m.id.split('_')[0]),
      createdAt: admin.firestore.Timestamp.now(),
      read: false
    });

    res.status(200).json({
      recalculated: true,
      membersAffected: members.length,
      updates
    });
  } catch (error: any) {
    console.error('Interest recalc error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}