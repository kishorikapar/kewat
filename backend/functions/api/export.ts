import { NextApiRequest, NextApiResponse } from 'next';
import { firebaseAdmin } from '../lib/firebaseAdmin';
import parse from 'papaparse';
import { PDFDocument, rgb } from 'pdf-lib';
import admin from 'firebase-admin';
import { requireRole } from '../lib/rbac';

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

    const { groupId, format } = req.body;
    const uid = req.headers['x-user-id'] as string | undefined;

    if (!groupId) {
      return res.status(400).json({ error: 'Missing groupId' });
    }

    const firestore = firebaseAdmin.firestore();

    // Fetch all transactions for the group
    const txSnapshot = await firestore
      .collection('transactions')
      .where('groupId', '==', groupId)
      .orderBy('createdAt', 'desc')
      .get();

    const transactions = txSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString()
    }));

    // Fetch group metadata
    const groupDoc = await firestore.collection('groups').doc(groupId).get();
    const groupData = groupDoc.data() || { name: groupId };

    // Build CSV
    const csvData = transactions.map((tx: any) => ({
      Date: tx.createdAt,
      'Member ID': tx.userId,
      'Amount (cents)': tx.amountCents,
      Status: tx.status || 'recorded',
      'Proof URL': tx.proofUrl || '-',
      Description: tx.description || ''
    }));

    const csv = parse.unparse(csvData);

    // Build PDF if requested
    let pdfBase64 = null;
    if (format === 'pdf' || format === 'both') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { height } = page.getSize();

      // Add title
      page.drawText(`Kewat Ledger Export - ${groupData.name}`, {
        x: 50,
        y: height - 50,
        size: 18,
        color: rgb(0, 0, 0)
      });

      // Add metadata
      page.drawText(`Generated: ${new Date().toISOString()}`, {
        x: 50,
        y: height - 80,
        size: 10,
        color: rgb(0.5, 0.5, 0.5)
      });

      page.drawText(`Total Transactions: ${transactions.length}`, {
        x: 50,
        y: height - 100,
        size: 10,
        color: rgb(0.5, 0.5, 0.5)
      });

      // Add table header
      const tableY = height - 140;
      page.drawText('Date', { x: 50, y: tableY, size: 10 });
      page.drawText('Member', { x: 150, y: tableY, size: 10 });
      page.drawText('Amount', { x: 300, y: tableY, size: 10 });
      page.drawText('Status', { x: 400, y: tableY, size: 10 });

      // Add rows (limit to 20 per page)
      let currentY = tableY - 20;
      transactions.slice(0, 20).forEach((tx: any) => {
        page.drawText(tx.createdAt.split('T')[0], { x: 50, y: currentY, size: 8 });
        page.drawText(tx.userId.substring(0, 12), { x: 150, y: currentY, size: 8 });
        page.drawText(`$${(tx.amountCents / 100).toFixed(2)}`, { x: 300, y: currentY, size: 8 });
        page.drawText(tx.status || 'recorded', { x: 400, y: currentY, size: 8 });
        currentY -= 15;
      });

      const pdfBytes = await pdfDoc.save();
      pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    }

    // Audit log
    await firestore.collection('auditLogs').add({
      action: 'export_generated',
      actor: uid,
      groupId,
      details: { format: format || 'csv', transactionCount: transactions.length },
      timestamp: admin.firestore.Timestamp.now(),
      role: token?.role || 'unknown'
    });

    res.status(200).json({
      success: true,
      csv,
      pdfBase64: format === 'pdf' || format === 'both' ? pdfBase64 : undefined,
      transactionCount: transactions.length
    });
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}