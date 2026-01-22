import admin from 'firebase-admin';

declare const global: typeof globalThis & {
  firebaseAdminApp?: admin.app.App;
};

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || '';

if (!serviceAccountJson) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
}

const serviceAccount = JSON.parse(serviceAccountJson);

if (!global.firebaseAdminApp) {
  global.firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firebaseAdmin = global.firebaseAdminApp;
