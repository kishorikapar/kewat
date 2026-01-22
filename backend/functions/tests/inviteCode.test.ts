import { createMocks } from 'node-mocks-http';
import handler from '../api/inviteCode';

// Mock Firebase Admin
jest.mock('../lib/firebaseAdmin', () => ({
  firebaseAdmin: {
    firestore: jest.fn(() => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue({ id: 'mock-log-id' })
    }))
  }
}));

describe('/api/invite-code', () => {
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

  it('should reject requests without authentication', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { groupId: 'group-1' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('should return 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'DELETE'
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});

describe('/api/invite-code validation', () => {
  it('should validate expired invite codes', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { code: 'EXPIRED123' }
    });

    // Mock expired code
    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          expiresAt: { toDate: () => new Date(Date.now() - 1000) }
        })
      })
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(410);
  });
});
