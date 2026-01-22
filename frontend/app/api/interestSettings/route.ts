import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireAdmin(req: NextRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) return { error: 'Missing auth token', status: 401 } as const;

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'admin' && decoded.role !== 'dev') {
    return { error: 'Admin privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const groupId = new URL(req.url).searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });

    const doc = await firebaseAdmin.firestore().collection('interestSettings').doc(groupId).get();
    const data = doc.exists ? doc.data() : null;

    return NextResponse.json(
      {
        groupId,
        rateBps: data?.rateBps ?? 2500,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('interestSettings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const groupId = body?.groupId;
    const rateBps = Number(body?.rateBps);

    if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    if (!Number.isFinite(rateBps) || rateBps < 0 || rateBps > 10000) {
      return NextResponse.json({ error: 'Invalid rateBps' }, { status: 400 });
    }

    await firebaseAdmin.firestore().collection('interestSettings').doc(String(groupId)).set(
      {
        groupId: String(groupId),
        rateBps,
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: authResult.decoded.uid,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, groupId: String(groupId), rateBps }, { status: 200 });
  } catch (error) {
    console.error('interestSettings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
