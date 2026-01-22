import { createMocks } from 'node-mocks-http';
import handler from '../api/interestRecalc';

jest.mock('../lib/firebaseAdmin');

describe('/api/interest-recalc', () => {
  it('should reject requests without admin role', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-token': JSON.stringify({ role: 'member' })
      },
      body: { groupId: 'group-1' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('should reject if interest settings not found', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: { groupId: 'group-1' }
    });

    // Mock settings not found
    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false })
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('should successfully recalculate interest for group members', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: { groupId: 'group-1' }
    });

    const firestoreMock = {
      collection: jest.fn((name: string) => {
        if (name === 'compoundInterestSettings') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ annualRate: 5, frequency: 'monthly' })
              })
            })
          };
        }

        if (name === 'memberships') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                docs: [
                  {
                    id: 'user-1_group-1',
                    data: () => ({ balanceCents: 10000, userId: 'user-1', groupId: 'group-1' })
                  }
                ]
              })
            }),
            doc: jest.fn().mockReturnValue({})
          };
        }

        if (name === 'auditLogs' || name === 'notifications') {
          return { add: jest.fn().mockResolvedValue(undefined) };
        }

        return { doc: jest.fn().mockReturnThis() };
      }),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      }))
    };

    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce(firestoreMock);

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.recalculated).toBe(true);
  });
});
