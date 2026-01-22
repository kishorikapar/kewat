import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireDev(req: NextRequest) {
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

async function getJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireDev(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const firestore = firebaseAdmin.firestore();
    const snapshot = await firestore.collection('adminAllowlist').get();
    const admins = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ admins }, { status: 200 });
  } catch (error) {
    console.error('Admin allowlist GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireDev(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await getJsonBody(req);
    const email = body?.email;
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();
    const firestore = firebaseAdmin.firestore();
    await firestore.collection('adminAllowlist').doc(normalized).set({
      email: normalized,
      addedBy: authResult.decoded.uid,
      addedAt: admin.firestore.Timestamp.now(),
    });

    await firestore.collection('auditLogs').add({
      action: 'admin_allowlist_added',
      actor: authResult.decoded.uid,
      details: { email: normalized },
      timestamp: admin.firestore.Timestamp.now(),
      role: authResult.decoded.role || 'dev',
    });

    return NextResponse.json({ success: true, email: normalized }, { status: 200 });
  } catch (error) {
    console.error('Admin allowlist POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireDev(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await getJsonBody(req);
    const email = body?.email;
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();
    const firestore = firebaseAdmin.firestore();
    await firestore.collection('adminAllowlist').doc(normalized).delete();

    await firestore.collection('auditLogs').add({
      action: 'admin_allowlist_removed',
      actor: authResult.decoded.uid,
      details: { email: normalized },
      timestamp: admin.firestore.Timestamp.now(),
      role: authResult.decoded.role || 'dev',
    });

    return NextResponse.json({ success: true, email: normalized }, { status: 200 });
  } catch (error) {
    console.error('Admin allowlist DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
