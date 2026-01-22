export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireAdmin(req: NextRequest) {
  const bearer = getBearerToken(req);
  if (!bearer) return { error: 'Missing auth token', status: 401 } as const;

  const decoded = await firebaseAdmin.auth().verifyIdToken(bearer);
  const role = (decoded.role as string | undefined) || 'member';
  if (role !== 'admin' && role !== 'dev') {
    return { error: 'Admin privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

function asString(v: any) {
  return String(v ?? '').trim();
}

export async function GET(req: NextRequest) {
  try {
    // Allow all signed-in users to read announcements.
    const bearer = getBearerToken(req);
    if (!bearer) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });

    await firebaseAdmin.auth().verifyIdToken(bearer);

    const groupId = req.nextUrl.searchParams.get('groupId') || 'global';
    const snap = await firebaseAdmin
      .firestore()
      .collection('announcements')
      .where('groupId', '==', groupId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ items }, { status: 200 });
  } catch (error: any) {
    console.error('announcements GET error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const groupId = asString(body?.groupId) || 'global';
    const title = asString(body?.title) || 'Announcement';
    const message = asString(body?.message);

    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    const docRef = await firebaseAdmin.firestore().collection('announcements').add({
      groupId,
      title,
      message,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: authResult.decoded.uid,
      createdByEmail: typeof authResult.decoded.email === 'string' ? authResult.decoded.email : null,
      createdByName: typeof authResult.decoded.name === 'string' ? authResult.decoded.name : null,
    });

    await firebaseAdmin.firestore().collection('auditLogs').add({
      action: 'announcement_created',
      actor: authResult.decoded.uid,
      groupId,
      details: { announcementId: docRef.id, title },
      timestamp: admin.firestore.Timestamp.now(),
      role: (authResult.decoded.role as string | undefined) || 'admin',
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error: any) {
    console.error('announcements POST error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 });
  }
}
