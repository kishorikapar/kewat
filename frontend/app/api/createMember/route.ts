import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireAdmin(req: NextRequest) {
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

async function getJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await getJsonBody(req);
    const { email, password, displayName, groupId } = body || {};
    if (!email || !password || !displayName || !groupId) {
      return NextResponse.json({ error: 'Missing email, password, displayName, or groupId' }, { status: 400 });
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
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
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
      balancePaisa: 0,
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

    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
      email: normalizedEmail,
      groupId
    });
  } catch (error: any) {
    console.error('Create member error:', error);

    const message = String(error?.message || 'Internal server error');
    const code = error?.code ? String(error.code) : undefined;
    const status = code === 'auth/invalid-credential' || code === 'app/invalid-credential' ? 500 : 500;

    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: message,
        code,
      },
      { status }
    );
  }
}
