import { createMocks } from 'node-mocks-http';
import handler from '../api/export';

jest.mock('../lib/firebaseAdmin');
jest.mock('papaparse', () => ({
  unparse: jest.fn(() => 'csv-content')
}));
jest.mock('pdf-lib');

describe('/api/export', () => {
  it('should reject requests without admin role', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-token': JSON.stringify({ role: 'member' })
      },
      body: { groupId: 'group-1', format: 'csv' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('should generate CSV export successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: { groupId: 'group-1', format: 'csv' }
    });

    // Mock Firestore responses
    const firestoreMock = {
      collection: jest.fn((name: string) => {
        if (name === 'transactions') {
          return {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  id: 'tx-1',
                  data: () => ({
                    amountCents: 5000,
                    userId: 'user-123',
                    createdAt: { toDate: () => new Date() }
                  })
                }
              ]
            })
          };
        }

        if (name === 'groups') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ data: () => ({ name: 'Group 1' }) })
            })
          };
        }

        if (name === 'auditLogs') {
          return { add: jest.fn().mockResolvedValue(undefined) };
        }

        return { doc: jest.fn().mockReturnThis() };
      })
    };

    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce(firestoreMock);

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.csv).toBeDefined();
  });

  it('should reject missing groupId', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: {}
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });
});
