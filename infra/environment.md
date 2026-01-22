# Environment & Secrets Manifest

This document outlines the Firebase and Cloudinary environment variables referenced by `CLARIFICATION.md` and used across the backend functions and frontend client.

| Variable | Purpose | Source |
| --- | --- | --- |
| `FIREBASE_API_KEY` | Initializes Firebase Web SDK for Auth/Firestore | Firebase Console → Project settings |
| `FIREBASE_AUTH_DOMAIN` | Domain for Firebase Auth | Firebase Console → Project settings |
| `FIREBASE_PROJECT_ID` | Primary identifier for Firestore + Auth | Firebase Console → General settings |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket for proofs/backups | Firebase Console → Storage settings |
| `FIREBASE_MESSAGING_SENDER_ID` | Required for FCM registration | Firebase Console → General settings |
| `FIREBASE_APP_ID` | Bootstraps Firebase app | Firebase Console → General settings |
| `FIREBASE_MEASUREMENT_ID` | Analytics ID (optional) | Firebase Console → General settings |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for backend API (Vercel functions) | Vercel project URL |
| `FIREBASE_SERVICE_ACCOUNT` | JSON key used by Admin SDK | Firebase Console → Service accounts |
| `CLOUDINARY_CLOUD_NAME` | Cloud identifier for proof uploads | Cloudinary Dashboard → Account details |
| `CLOUDINARY_API_KEY` | API key for signed uploads | Cloudinary Dashboard → Account details |
| `CLOUDINARY_API_SECRET` | Secret to sign upload requests | Cloudinary Dashboard → Account details |
| `FCM_SERVER_KEY` | Server key used with Firebase Cloud Messaging APIs | Firebase Console → Project settings → Cloud Messaging |
| `DEV_EMAILS` | Comma-separated developer emails allowed to claim dev role | Manual configuration |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for backend API (Vercel functions) | Vercel project URL |

## Usage Notes
- Store secrets securely (Vault, environment variables, or Vercel environment settings) and never commit actual values.
- Backend Admin SDK functions load `FIREBASE_SERVICE_ACCOUNT`, signed Cloudinary requests use the Cloudinary credentials, and export helpers rely on the Firebase IDs.
- Frontend initialization only uses the client-side Firebase values; proof upload flows only touch Cloudinary credentials via signed URLs produced by the server functions.