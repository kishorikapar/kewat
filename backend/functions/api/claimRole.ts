import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import admin from 'firebase-admin';

const DEV_EMAILS = (process.env.DEV_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function getBearerToken(req: NextApiRequest) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = (decoded.email || '').toLowerCase();
    const uid = decoded.uid;

    if (!email) {
      return res.status(400).json({ error: 'User email not available' });
    }

    let assignedRole: 'dev' | 'admin' | 'member' = 'member';

    if (DEV_EMAILS.includes(email)) {
      assignedRole = 'dev';
    } else {
      const allowlistDoc = await firebaseAdmin.firestore().collection('adminAllowlist').doc(email).get();
      if (allowlistDoc.exists) {
        assignedRole = 'admin';
      }
    }

    const currentRole = decoded.role as string | undefined;
    if (currentRole !== assignedRole) {
      await firebaseAdmin.auth().setCustomUserClaims(uid, { role: assignedRole });
    }

    await firebaseAdmin.firestore().collection('auditLogs').add({
      action: 'role_claimed',
      actor: uid,
      details: { email, assignedRole },
      timestamp: admin.firestore.Timestamp.now(),
      role: assignedRole
    });

    return res.status(200).json({ role: assignedRole });
  } catch (error: any) {
    console.error('Claim role error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
