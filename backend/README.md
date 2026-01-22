# Backend

This directory will contain Vercel serverless functions using the Firebase Admin SDK. Responsibilities:
- RBAC enforcement and custom claims management for dev/admin/member hierarchies.
- Invite code creation, redemption, and auditing.
- Cloudinary-signed upload endpoints for proof storage.
- Export helpers (CSV via `papaparse`, PDF via `pdf-lib`/`jsPDF`).
- Notification orchestration with Firebase Cloud Messaging and immutable audit logs.