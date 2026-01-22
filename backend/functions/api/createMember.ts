import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import admin from 'firebase-admin';

function getBearerToken(req: NextApiRequest) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireAdmin(req: NextApiRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) {
    return { error: 'Missing auth token', status: 401 } as const;
  }

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'admin' && decoded.role !== 'dev') {
    return { error: 'Admin privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { email, password, displayName, groupId } = req.body;
    if (!email || !password || !displayName || !groupId) {
      return res.status(400).json({ error: 'Missing email, password, displayName, or groupId' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    let userRecord;
    try {
      userRecord = await firebaseAdmin.auth().createUser({
        email: normalizedEmail,
        password: String(password),
        displayName: String(displayName)
      });
    } catch (error: any) {
      if (error?.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }

    await firebaseAdmin.auth().setCustomUserClaims(userRecord.uid, { role: 'member' });

    const memberDocId = `${userRecord.uid}_${groupId}`;
    await firebaseAdmin.firestore().collection('memberships').doc(memberDocId).set({
      userId: userRecord.uid,
      groupId,
      role: 'member',
      email: normalizedEmail,
      displayName: String(displayName),
      balanceCents: 0,
      joinedAt: admin.firestore.Timestamp.now()
    });

    await firebaseAdmin.firestore().collection('auditLogs').add({
      action: 'member_created',
      actor: authResult.decoded.uid,
      groupId,
      details: { userId: userRecord.uid, email: normalizedEmail, displayName },
      timestamp: admin.firestore.Timestamp.now(),
      role: authResult.decoded.role || 'admin'
    });

    return res.status(200).json({
      success: true,
      userId: userRecord.uid,
      email: normalizedEmail,
      groupId
    });
  } catch (error: any) {
    console.error('Create member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
