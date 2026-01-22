import { createMocks } from 'node-mocks-http';
import handler from '../api/proofUpload';

jest.mock('../lib/firebaseAdmin');

describe('/api/proof-upload', () => {
  it('should reject if user is not a group member', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-token': JSON.stringify({ role: 'member' })
      },
      body: { groupId: 'group-1' }
    });

    // Mock membership check - user not found
    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false })
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
  });

  it('should return signed Cloudinary params for valid members', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'mock-cloud';
    process.env.CLOUDINARY_API_KEY = 'mock-key';
    process.env.CLOUDINARY_API_SECRET = 'mock-secret';

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-user-id': 'user-123',
        'x-user-token': JSON.stringify({ role: 'member' })
      },
      body: { groupId: 'group-1' }
    });

    // Mock successful membership and proof creation
    jest.spyOn(require('../lib/firebaseAdmin').firebaseAdmin, 'firestore').mockReturnValueOnce({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ role: 'member' }) }),
      set: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined)
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.signature).toBeDefined();
    expect(data.apiKey).toBeDefined();
    expect(data.proofId).toBeDefined();
  });
});
