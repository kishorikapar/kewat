import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

const DEV_EMAILS = (process.env.DEV_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(req: NextRequest) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = (decoded.email || '').toLowerCase();
    const uid = decoded.uid;

    if (!email) {
      return NextResponse.json({ error: 'User email not available' }, { status: 400 });
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

    return NextResponse.json({ role: assignedRole }, { status: 200 });
  } catch (error) {
    console.error('Claim role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
