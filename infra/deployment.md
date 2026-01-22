# Deployment & Provisioning Workflow

## Firebase Project Initialization
1. Create a Firebase project with Firestore, Auth (Google sign-in), Storage, and Cloud Messaging enabled.
2. Issue a service account key (`FIREBASE_SERVICE_ACCOUNT`) scoped to Firestore/Admin privileges and store it in your vault.
3. Run `firebase init` (or Terraform) to deploy Firestore indexes, `firestore.rules`, and default collections.
4. Flag the developer account with the highest custom claim (`role: 'dev'`) using the Admin SDK and store their UID in vault notes.

## Cloudinary Proof Uploads
1. Create a Cloudinary account and capture `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
2. Implement a signed upload flow inside `/backend/functions/api/proofUpload`. The client consumes the signed parameters to send media directly to Cloudinary.

## Vercel Deployment
1. Link the GitHub repository (this project) to Vercel and configure the `frontend` project as a Next.js app.
2. Add environment variables (Firebase client + Cloudinary public keys) prefixed with `NEXT_PUBLIC_...`.
3. Add serverless function environment variables (`FIREBASE_SERVICE_ACCOUNT`, `CLOUDINARY_API_SECRET`, `FCM_SERVER_KEY`) via Vercel dashboard or CLI.
4. Configure deployment hooks to run `npm install` in both the frontend and backend directories, and ensure `tsc` is invoked for backend functions before deployment.

## Security Rule Verification
- Use the Firebase Emulator Suite to test reads/writes across each collection, verifying the `firestore.rules` logic for `groups`, `memberships`, `transactions`, `proofs`, `auditLogs`, `notifications`, and `compoundInterestSettings`.
- Add automated unit tests later to simulate requests from `dev`, `admin`, and `member` accounts to avoid regression.