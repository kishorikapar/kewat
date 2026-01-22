export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin } from '@/lib/firebaseAdmin';

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

async function requireSignedIn(req: NextRequest) {
  const bearer = getBearerToken(req);
  if (!bearer) return { error: 'Missing auth token', status: 401 } as const;

  const decoded = await firebaseAdmin.auth().verifyIdToken(bearer);
  return { decoded } as const;
}

function asString(v: any) {
  return String(v ?? '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSignedIn(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);
    const title = asString(body?.title) || 'Community';
    const message = asString(body?.message);

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const role = (authResult.decoded.role as string | undefined) || 'member';
    const createdBy = authResult.decoded.uid;
    const createdByEmail = typeof authResult.decoded.email === 'string' ? authResult.decoded.email : undefined;
    const createdByName = typeof authResult.decoded.name === 'string' ? authResult.decoded.name : undefined;

    const docRef = await firebaseAdmin.firestore().collection('communityMessages').add({
      title,
      message,
      role,
      createdBy,
      createdByEmail: createdByEmail || null,
      createdByName: createdByName || null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error: any) {
    console.error('communityMessage POST error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 });
  }
}
