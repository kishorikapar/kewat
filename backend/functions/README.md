# Backend Functions

Directory for Vercel serverless functions that wrap Firebase Admin SDK functionality. Planned functions:
- `/api/invite-code`: generates/validates shareable invite codes with rate limits.
- `/api/proof-upload`: issues signed Cloudinary upload params, stores proof metadata in Firestore.
- `/api/export`: aggregates transactions and uses `papaparse`/`pdf-lib` to deliver CSV/PDF for admins.
- `/api/interest-recalc`: recalculates balances using `compoundInterestSettings` and writes audit logs.
- `/api/notify`: sends Firebase Cloud Messaging payloads via `FCM_SERVER_KEY` and mirrors entries into `notifications`.

Each function:
1. Verifies `request.auth.token` and custom claims to enforce `dev > admin > member` roles.
2. Uses the Admin SDK `FIREBASE_SERVICE_ACCOUNT` to interact with Firestore and Auth.
3. Writes to `auditLogs` with immutable metadata for tracing.
4. Emits aggregate metrics/exports via background workers whenever needed.

## Next Steps
1. Create a shared `backend/functions/lib/firebaseAdmin.ts` to initialize the SDK once.
2. Stub function entrypoints with high-level TODOs for HTTP methods and validation.
3. Document environment variables required (`FIREBASE_SERVICE_ACCOUNT`, `CLOUDINARY_*`, `FCM_SERVER_KEY`).