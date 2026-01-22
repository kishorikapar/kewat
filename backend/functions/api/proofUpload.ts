import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import { requireRole } from '../lib/rbac';
import admin from 'firebase-admin';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { groupId, folder, maxBytes } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!uid || !groupId) {
      return res.status(400).json({ error: 'Missing uid or groupId' });
    }

    let token;
    const tokenHeader = req.headers['x-user-token'] as string | undefined;
    if (tokenHeader) {
      try {
        token = JSON.parse(tokenHeader);
      } catch {
        return res.status(400).json({ error: 'Invalid token payload' });
      }
    }

    const role = requireRole(token, ['member', 'admin', 'dev']);
    if (!role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const firestore = firebaseAdmin.firestore();

    // Verify user is a member of the group
    const membershipDoc = await firestore
      .collection('memberships')
      .doc(`${uid}_${groupId}`)
      .get();

    if (!membershipDoc.exists) {
      return res.status(403).json({ error: 'User is not a member of this group' });
    }

    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary configuration missing' });
    }

    // Generate Cloudinary signed upload parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const folder_name = folder || `kewat/${groupId}`;
    const paramsToSign = {
      timestamp,
      folder: folder_name,
      resource_type: 'auto'
    };

    // Sort params alphabetically and create signature
    const paramsStr = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(paramsStr + CLOUDINARY_API_SECRET)
      .digest('hex');

    // Store proof metadata placeholder (actual file URL added after upload)
    const proofId = crypto.randomUUID();
    await firestore.collection('proofs').doc(proofId).set({
      proofId,
      userId: uid,
      groupId,
      status: 'pending_upload',
      createdAt: admin.firestore.Timestamp.now(),
      uploadedAt: null,
      cloudinaryUrl: null,
      transactionId: null
    });

    // Audit log
    await firestore.collection('auditLogs').add({
      action: 'proof_upload_initiated',
      actor: uid,
      groupId,
      details: { proofId, timestamp },
      timestamp: admin.firestore.Timestamp.now(),
      role
    });

    res.status(200).json({
      signature,
      timestamp,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      folder: folder_name,
      proofId,
      uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
    });
  } catch (error: any) {
    console.error('Proof upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}