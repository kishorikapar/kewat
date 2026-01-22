import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import { requireRole } from '../lib/rbac';
import admin from 'firebase-admin';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

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

    const { message, groupId, recipientIds, title, data } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!message || !groupId) {
      return res.status(400).json({ error: 'Missing message or groupId' });
    }

    const firestore = firebaseAdmin.firestore();

    // Store notification in Firestore
    const notifDoc = await firestore.collection('notifications').add({
      groupId,
      title: title || 'Kewat Ledger',
      message,
      recipientIds: recipientIds || [],
      data: data || {},
      createdAt: admin.firestore.Timestamp.now(),
      sentAt: null,
      readBy: [],
      status: 'pending'
    });

    // Fetch FCM tokens for recipients (if any)
    const tokensToSend: string[] = [];

    if (recipientIds && recipientIds.length > 0) {
      for (const memberId of recipientIds) {
        const tokenSnap = await firestore.collection('fcmTokens').doc(memberId).get();
        if (tokenSnap.exists && tokenSnap.data()?.token) {
          tokensToSend.push(tokenSnap.data()?.token as string);
        }
      }
    } else {
      // Broadcast to all group members if no specific recipients
      const membersSnap = await firestore
        .collection('memberships')
        .where('groupId', '==', groupId)
        .get();

      for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.data().userId || memberDoc.id.split('_')[0];
        const tokenSnap = await firestore.collection('fcmTokens').doc(memberId).get();
        if (tokenSnap.exists && tokenSnap.data()?.token) {
          tokensToSend.push(tokenSnap.data()?.token as string);
        }
      }
    }

    // Send via FCM (with error handling)
    let sentCount = 0;
    const errors: string[] = [];

    for (const token of tokensToSend) {
      try {
        const fcmRes = await fetch(FCM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${FCM_SERVER_KEY}`
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: title || 'Kewat Ledger',
              body: message
            },
            data: data || {}
          })
        });

        if (fcmRes.ok) {
          sentCount++;
        } else {
          errors.push(`Token ${token.substring(0, 10)}...: ${fcmRes.statusText}`);
        }
      } catch (err) {
        errors.push(`Token ${token.substring(0, 10)}...: ${err}`);
      }
    }

    // Update notification status
    await firestore.collection('notifications').doc(notifDoc.id).update({
      sentAt: admin.firestore.Timestamp.now(),
      status: sentCount > 0 ? 'sent' : 'failed',
      sentCount
    });

    // Audit log
    await firestore.collection('auditLogs').add({
      action: 'notification_sent',
      actor: uid,
      groupId,
      details: { notificationId: notifDoc.id, sentCount, errors },
      timestamp: admin.firestore.Timestamp.now(),
      role: token?.role || 'unknown'
    });

    res.status(200).json({
      success: true,
      notificationId: notifDoc.id,
      sentCount,
      totalRecipients: tokensToSend.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}