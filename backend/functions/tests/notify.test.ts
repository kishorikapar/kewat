import { createMocks } from 'node-mocks-http';
import handler from '../api/notify';

jest.mock('../lib/firebaseAdmin');

describe('/api/notify', () => {
  it('should reject requests without admin role', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-token': JSON.stringify({ role: 'member' })
      },
      body: { groupId: 'group-1', title: 'Test' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('should reject if message missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: { groupId: 'group-1' }
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('should successfully send FCM notifications to group members', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    (global as any).fetch = fetchMock;

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: {
        groupId: 'group-1',
        title: 'Interest Calculated',
        message: 'Your interest has been recalculated',
        recipientIds: ['user-1', 'user-2']
      }
    });

    const firestoreMock = {
      collection: jest.fn((name: string) => {
        if (name === 'notifications') {
          return {
            add: jest.fn().mockResolvedValue({ id: 'notif-1' }),
            doc: jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue(undefined) })
          };
        }

        if (name === 'fcmTokens') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ token: 'fcm-token-1' }) })
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
    expect(data.sentCount).toBe(2);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('should handle partial FCM failures gracefully', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    (global as any).fetch = fetchMock;

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'admin-123',
        'x-user-token': JSON.stringify({ role: 'admin' })
      },
      body: {
        groupId: 'group-1',
        title: 'Test',
        message: 'Partial failure test',
        recipientIds: ['user-1', 'user-2']
      }
    });

    const firestoreMock = {
      collection: jest.fn((name: string) => {
        if (name === 'notifications') {
          return {
            add: jest.fn().mockResolvedValue({ id: 'notif-1' }),
            doc: jest.fn().mockReturnValue({ update: jest.fn().mockResolvedValue(undefined) })
          };
        }

        if (name === 'fcmTokens') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ token: 'fcm-token-1' }) })
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
    expect(data.errors).toBeDefined();
    expect(data.errors.length).toBeGreaterThan(0);
  });
});
