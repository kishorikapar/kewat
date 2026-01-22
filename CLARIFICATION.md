# Kewat Group Ledger

## 1. Project Goal
Deliver a secure, mobile-first ledger experience replacing paper “kewat” notebooks with a collaborative app where admins manage group membership, transactions, and proofs, while members log entries, monitor balances, and review interest settings. Key expectations include real-time sync, integer-cent precision, immutable audit trails, UTC-aware timestamps, shareable invite codes, Cloudinary-powered proof uploads, admin-triggered exports (CSV/PDF), and notification capabilities, with a single dev account holding elevated privileges.

## 2. Technical Stack
- **Frontend:** Next.js (App Router) with TypeScript, TailwindCSS, React hooks/context, `react-dropzone` for proof uploads, `date-fns` for UTC handling, `papaparse` for CSV export, and `pdf-lib`/`jsPDF` for PDF generation. Optional `react-firebase-hooks` may power live Firestore syncing.
- **Backend:** Firebase v9+ Web SDK for Auth/Firestore/Storage; Firebase Admin SDK hosted via Vercel serverless functions to enforce RBAC, manage invite codes, aggregate data, send notifications, and maintain audit logs.
- **Realtime & Storage:** Firestore collections (`groups`, `memberships`, `transactions`, `auditLogs`, `compoundInterestSettings`, `notifications`). Cloudinary handles proof image storage via signed uploads orchestrated by server functions.
- **Helpers:** Firebase Cloud Messaging for notifications, integer-cent transaction representation (`amountCents`), Firestore `Timestamp` for UTC, and backend-gated export helpers.

## 3. Security & Infrastructure
- **Authentication:** Firebase Auth with Google Sign-In; the dev account is flagged with an elevated custom claim above admins.
- **Authorization & RBAC:** Membership documents combined with custom claims define roles (`dev > admin > member`). Firestore security rules restrict collection access based on membership roles; critical operations (custom claim assignment, audit logging, aggregates, notifications, compound interest recalculations) only execute through serverless endpoints.
- **Sensitive Operations:** Centralized serverless functions enforce invariants, append immutable audit logs, orchestrate notifications, and issue Cloudinary-signed proof upload parameters.
- **Hosting:** Next.js frontend and Admin SDK functions deployed on Vercel serverless.
- **Proof Storage:** Cloudinary-backed storage with signed uploads issued from a server endpoint; the client never holds direct secrets.

## 4. Resource Provisioning (Vault)
- `FIREBASE_API_KEY`: Client-side Firebase initialization for Auth/Firestore.
- `FIREBASE_AUTH_DOMAIN`: Firebase Auth domain for the project.
- `FIREBASE_PROJECT_ID`: Firebase project identifier.
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket for assets/backups.
- `FIREBASE_MESSAGING_SENDER_ID`: Sender ID needed for Firebase Cloud Messaging registration.
- `FIREBASE_APP_ID`: Bootstraps the Firebase app.
- `FIREBASE_MEASUREMENT_ID`: Measurement ID if analytics is enabled.
- `FIREBASE_SERVICE_ACCOUNT`: JSON key for the Admin SDK (custom claims, aggregates, audit logging).
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud identifier for proof uploads.
- `CLOUDINARY_API_KEY`: Key used to generate signed upload parameters.
- `CLOUDINARY_API_SECRET`: Secret for securely signing Cloudinary requests.
- `FCM_SERVER_KEY`: Server key for Firebase Cloud Messaging to send notifications.

### Vault Requirements Block
```
{
  "vault_requirements": [
    {"name": "FIREBASE_API_KEY", "description": "Client-side Firebase initialization for Auth/Firestore", "validation_pattern": ".*"},
    {"name": "FIREBASE_AUTH_DOMAIN", "description": "Firebase Auth domain for the project", "validation_pattern": ".*"},
    {"name": "FIREBASE_PROJECT_ID", "description": "Firebase project identifier", "validation_pattern": ".*"},
    {"name": "FIREBASE_STORAGE_BUCKET", "description": "Firebase Storage bucket for assets", "validation_pattern": ".*"},
    {"name": "FIREBASE_MESSAGING_SENDER_ID", "description": "Sender ID for Firebase Cloud Messaging", "validation_pattern": ".*"},
    {"name": "FIREBASE_APP_ID", "description": "Firebase App ID for SDK bootstrapping", "validation_pattern": ".*"},
    {"name": "FIREBASE_MEASUREMENT_ID", "description": "Measurement ID if analytics is enabled", "validation_pattern": ".*"},
    {"name": "FIREBASE_SERVICE_ACCOUNT", "description": "JSON key for Firebase Admin SDK (custom claims, aggregates, audit logging)", "validation_pattern": ".*"},
    {"name": "CLOUDINARY_CLOUD_NAME", "description": "Cloudinary cloud identifier for proof uploads", "validation_pattern": ".*"},
    {"name": "CLOUDINARY_API_KEY", "description": "Cloudinary API key used for signed upload flows", "validation_pattern": ".*"},
    {"name": "CLOUDINARY_API_SECRET", "description": "Cloudinary API secret for securely signing upload requests", "validation_pattern": ".*"},
    {"name": "FCM_SERVER_KEY", "description": "Server key for Firebase Cloud Messaging to send notifications", "validation_pattern": ".*"}
  ]
}
```