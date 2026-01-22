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
  if (!idToken) return { error: 'Missing auth token', status: 401 } as const;

  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
  if (decoded.role !== 'admin' && decoded.role !== 'dev') {
    return { error: 'Admin privileges required', status: 403 } as const;
  }

  return { decoded } as const;
}

function asString(v: any) {
  return String(v ?? '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json().catch(() => null);

    const groupId = asString(body?.groupId);
    const memberId = asString(body?.memberId);
    const type = asString(body?.type) as 'disbursement' | 'repayment';
    const amountPaisa = Number(body?.amountPaisa);
    const interestRateBps = Number(body?.interestRateBps);
    const signedBy = asString(body?.signedBy);
    const notes = asString(body?.notes) || undefined;
    const evidenceUrls = Array.isArray(body?.evidenceUrls) ? (body.evidenceUrls as any[]).map(asString).filter(Boolean) : undefined;
    const occurredAtIso = asString(body?.occurredAt);

    if (!groupId || !memberId) return NextResponse.json({ error: 'Missing groupId or memberId' }, { status: 400 });
    if (type !== 'disbursement' && type !== 'repayment') return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    if (!Number.isFinite(amountPaisa) || amountPaisa <= 0) return NextResponse.json({ error: 'Invalid amountPaisa' }, { status: 400 });
    if (!Number.isFinite(interestRateBps) || interestRateBps < 0 || interestRateBps > 10000) {
      return NextResponse.json({ error: 'Invalid interestRateBps' }, { status: 400 });
    }
    if (!signedBy) return NextResponse.json({ error: 'Missing signedBy' }, { status: 400 });

    const occurredAt = occurredAtIso ? new Date(occurredAtIso) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: 'Invalid occurredAt' }, { status: 400 });
    }

    const docRef = await firebaseAdmin.firestore().collection('ledgerEntries').add({
      groupId,
      memberId,
      type,
      amountPaisa,
      interestRateBps,
      signedBy,
      notes: notes || null,
      evidenceUrls: evidenceUrls || [],
      status: 'recorded',
      occurredAt: admin.firestore.Timestamp.fromDate(occurredAt),
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: authResult.decoded.uid,
    });

    await firebaseAdmin.firestore().collection('auditLogs').add({
      action: 'ledger_entry_created',
      actor: authResult.decoded.uid,
      groupId,
      details: { ledgerEntryId: docRef.id, memberId, type, amountPaisa },
      timestamp: admin.firestore.Timestamp.now(),
      role: authResult.decoded.role || 'admin',
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error('ledgerEntries POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
