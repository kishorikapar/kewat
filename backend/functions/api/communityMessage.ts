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

    const { title, message } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const firestore = firebaseAdmin.firestore();
    const docRef = await firestore.collection('communityMessages').add({
      title: title || 'Community Update',
      message,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: uid || null
    });

    await firestore.collection('auditLogs').add({
      action: 'community_message_sent',
      actor: uid,
      details: { title: title || 'Community Update', messageLength: String(message).length },
      timestamp: admin.firestore.Timestamp.now(),
      role: token?.role || 'unknown'
    });

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (error: any) {
    console.error('Community message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
