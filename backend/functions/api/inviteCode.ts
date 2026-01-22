import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import { requireRole } from '../lib/rbac';
import admin from 'firebase-admin';
import crypto from 'crypto';

const INVITE_CODE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_INVITES_PER_DAY = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreate(req, res);
  } else if (req.method === 'GET') {
    return handleValidate(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    let token;
    const tokenHeader = req.headers['x-user-token'] as string | undefined;
    if (tokenHeader) {
      try {
        token = JSON.parse(tokenHeader);
      } catch {
        return res.status(400).json({ error: 'Invalid token payload' });
      }
    }

    const role = requireRole(token, ['admin', 'dev']);
    if (!role) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const { groupId } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!uid || !groupId) {
      return res.status(400).json({ error: 'Missing uid or groupId' });
    }

    const firestore = firebaseAdmin.firestore();

    // Check rate limit for the day
    const today = new Date().toISOString().split('T')[0];
    const rateKey = `${uid}_${groupId}_${today}`;
    const rateDoc = await firestore.collection('inviteCodeRateLimits').doc(rateKey).get();
    const rateCount = rateDoc.exists ? rateDoc.data()?.count || 0 : 0;

    if (rateCount >= MAX_INVITES_PER_DAY) {
      return res.status(429).json({ error: 'Rate limit exceeded: max 10 invites per day' });
    }

    // Generate invite code (alphanumeric, 8 chars)
    const code = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8);
    const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS);

    // Store in Firestore
    await firestore.collection('inviteCodes').doc(code).set({
      code,
      groupId,
      createdBy: uid,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false,
      usedBy: null,
      usedAt: null
    });

    // Increment rate limit counter
    await firestore.collection('inviteCodeRateLimits').doc(rateKey).set(
      { count: rateCount + 1, updatedAt: admin.firestore.Timestamp.now() },
      { merge: true }
    );

    // Audit log
    await firestore.collection('auditLogs').add({
      action: 'invite_code_created',
      actor: uid,
      groupId,
      details: { code, expiresAt: expiresAt.toISOString() },
      timestamp: admin.firestore.Timestamp.now(),
      role
    });

    res.status(200).json({ inviteCode: code, expiresAt: expiresAt.toISOString() });
  } catch (error: any) {
    console.error('Invite code creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleValidate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const firestore = firebaseAdmin.firestore();
    const codeDoc = await firestore.collection('inviteCodes').doc(code as string).get();

    if (!codeDoc.exists) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const codeData = codeDoc.data();
    if (!codeData) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if expired
    if (codeData.expiresAt.toDate() < new Date()) {
      return res.status(410).json({ error: 'Invite code expired' });
    }

    // Check if already used
    if (codeData.used) {
      return res.status(409).json({ error: 'Invite code already used' });
    }

    res.status(200).json({
      valid: true,
      groupId: codeData.groupId,
      expiresAt: codeData.expiresAt.toDate().toISOString()
    });
  } catch (error: any) {
    console.error('Invite code validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}