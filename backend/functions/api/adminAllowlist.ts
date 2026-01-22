import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import admin from 'firebase-admin';

function getBearerToken(req: NextApiRequest) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireDev(req: NextApiRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) {
    return { error: 'Missing auth token', status: 401 } as const;
  }

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'dev') {
    return { error: 'Developer privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authResult = await requireDev(req);
    if ('error' in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { decoded } = authResult;
    const firestore = firebaseAdmin.firestore();

    if (req.method === 'GET') {
      const snapshot = await firestore.collection('adminAllowlist').get();
      const admins = snapshot.docs.map((doc) => doc.data());
      return res.status(200).json({ admins });
    }

    if (req.method === 'POST') {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      const normalized = String(email).trim().toLowerCase();
      await firestore.collection('adminAllowlist').doc(normalized).set({
        email: normalized,
        addedBy: decoded.uid,
        addedAt: admin.firestore.Timestamp.now()
      });

      await firestore.collection('auditLogs').add({
        action: 'admin_allowlist_added',
        actor: decoded.uid,
        details: { email: normalized },
        timestamp: admin.firestore.Timestamp.now(),
        role: decoded.role || 'dev'
      });

      return res.status(200).json({ success: true, email: normalized });
    }

    if (req.method === 'DELETE') {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      const normalized = String(email).trim().toLowerCase();
      await firestore.collection('adminAllowlist').doc(normalized).delete();

      await firestore.collection('auditLogs').add({
        action: 'admin_allowlist_removed',
        actor: decoded.uid,
        details: { email: normalized },
        timestamp: admin.firestore.Timestamp.now(),
        role: decoded.role || 'dev'
      });

      return res.status(200).json({ success: true, email: normalized });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin allowlist error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
