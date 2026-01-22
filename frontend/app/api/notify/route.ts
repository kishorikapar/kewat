import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

function parseToken(headerValue: string | null) {
  if (!headerValue) return null;
  try {
    return JSON.parse(headerValue);
  } catch {
    return null;
  }
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function requireRole(token: any, roles: string[]) {
  if (!token || !token.role) return false;
  return roles.includes(token.role);
}

export async function POST(req: NextRequest) {
  try {
    let role: string | undefined;
    let uid: string | undefined;

    const bearer = getBearerToken(req);
    if (bearer) {
      const decoded = await firebaseAdmin.auth().verifyIdToken(bearer);
      role = (decoded.role as string | undefined) || undefined;
      uid = decoded.uid;
    } else {
      const token = parseToken(req.headers.get('x-user-token'));
      if (!requireRole(token, ['admin', 'dev'])) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
      role = token?.role;
      uid = req.headers.get('x-user-id') || undefined;
    }

    const body = await req.json().catch(() => null);
    const { message, groupId, recipientIds, title, data } = body || {};

    const type = typeof data?.type === 'string' ? String(data.type) : undefined;

    // Community chat uses notifications as an in-app broadcast feed; members may write to it.
    if (type === 'community') {
      // ok for member/admin/dev
    } else {
      if (!role || !['admin', 'dev'].includes(role)) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
    }

    const normalizedGroupId = type === 'community' ? 'global' : groupId;

    if (!message || !normalizedGroupId) {
      return NextResponse.json({ error: 'Missing message or groupId' }, { status: 400 });
    }

    const firestore = firebaseAdmin.firestore();

    const notifDoc = await firestore.collection('notifications').add({
      groupId: normalizedGroupId,
      title: title || 'Kewat Ledger',
      message,
      recipientIds: recipientIds || [],
      data: data || {},
      createdAt: admin.firestore.Timestamp.now(),
      sentAt: null,
      readBy: [],
      status: 'pending'
    });

    const tokensToSend: string[] = [];

    if (recipientIds && recipientIds.length > 0) {
      for (const memberId of recipientIds) {
        const tokenSnap = await firestore.collection('fcmTokens').doc(memberId).get();
        if (tokenSnap.exists && tokenSnap.data()?.token) {
          tokensToSend.push(tokenSnap.data()?.token as string);
        }
      }
    } else {
      const membersSnap = await firestore.collection('memberships').where('groupId', '==', normalizedGroupId).get();
      for (const memberDoc of membersSnap.docs) {
        const memberId = memberDoc.data().userId || memberDoc.id.split('_')[0];
        const tokenSnap = await firestore.collection('fcmTokens').doc(memberId).get();
        if (tokenSnap.exists && tokenSnap.data()?.token) {
          tokensToSend.push(tokenSnap.data()?.token as string);
        }
      }
    }

    let sentCount = 0;
    const errors: string[] = [];

    if (FCM_SERVER_KEY) {
      for (const tokenValue of tokensToSend) {
        try {
          const fcmRes = await fetch(FCM_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${FCM_SERVER_KEY}`
            },
            body: JSON.stringify({
              to: tokenValue,
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
            errors.push(`Token ${tokenValue.substring(0, 10)}...: ${fcmRes.statusText}`);
          }
        } catch (err) {
          errors.push(`Token ${tokenValue.substring(0, 10)}...: ${err}`);
        }
      }
    }

    await firestore.collection('notifications').doc(notifDoc.id).update({
      sentAt: admin.firestore.Timestamp.now(),
      status: sentCount > 0 ? 'sent' : 'stored',
      sentCount
    });

    await firestore.collection('auditLogs').add({
      action: 'notification_sent',
      actor: uid,
      groupId: normalizedGroupId,
      details: { notificationId: notifDoc.id, sentCount, errors },
      timestamp: admin.firestore.Timestamp.now(),
      role
    });

    return NextResponse.json({
      success: true,
      notificationId: notifDoc.id,
      sentCount,
      totalRecipients: tokensToSend.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
