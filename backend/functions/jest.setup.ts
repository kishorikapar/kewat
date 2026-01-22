jest.mock('./lib/firebaseAdmin', () => ({
  firebaseAdmin: {
    firestore: jest.fn(() => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      set: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
      update: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined)
      }))
    })),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
      setCustomUserClaims: jest.fn(),
      createUser: jest.fn()
    }))
  }
}));
