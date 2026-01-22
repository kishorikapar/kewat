import admin from 'firebase-admin';

declare const global: typeof globalThis & {
  firebaseAdminApp?: admin.app.App;
};

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!global.firebaseAdminApp) {
  global.firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firebaseAdmin = global.firebaseAdminApp;