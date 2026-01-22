# Production Readiness Assessment

## Status: **STAGING - NOT PRODUCTION READY**

The Kewat Group Ledger has been scaffolded and populated with foundational features, but requires several hardening steps before production deployment to normal users, admins, and developers.

---

## ✅ Completed

### Authentication & Authorization
- ✅ Firebase Auth with Google Sign-In integrated
- ✅ Role detection (dev/admin/member) via custom claims in ID token
- ✅ `AuthProvider` context and `useAuth()` hook for role-aware UI rendering
- ✅ Firestore Security Rules with membership-based RBAC and member privacy enforcement
- ✅ Protected routes component to gate pages by role

### Frontend
- ✅ Next.js App Router with TypeScript/Tailwind scaffolding
- ✅ Personalized dashboards for Member, Admin, and Dev roles
- ✅ Sign-in flow using Google OAuth
- ✅ Member records page (member-only) showing personal transaction entries
- ✅ Admin records page (admin/dev-only) with full ledger visibility and actions (verify, reject, export)
- ✅ Navigation component and feature cards
- ✅ Environment configuration templates

### Backend Infrastructure
- ✅ Firebase Admin SDK initializer for serverless functions
- ✅ RBAC utilities (`getRoleFromToken`, `requireRole`)
- ✅ Serverless API stubs for invite codes, proof uploads, exports, notifications, and interest recalculations
- ✅ TypeScript configurations for both frontend and backend
- ✅ Package manifests with core dependencies (firebase, next.js, papaparse, pdf-lib, etc.)

### Secrets & Environment
- ✅ Firebase Web SDK keys loaded into `frontend/.env.local`
- ✅ Firebase Admin SDK credentials in `backend/functions/.env`
- ✅ Cloudinary credentials registered and available to backend functions

---

## ⚠️ Critical TODOs Before Production

### 1. Backend API Implementation
- [ ] **Invite Code Endpoint** (`/api/invite-code`)
  - Implement deterministic code generation or UUID-based codes
  - Add rate limiting and expiration (recommend 7-14 days TTL)
  - Store in Firestore `inviteCodes` collection with admin-scoped reads
  - Validate group membership and role before issuance

- [ ] **Proof Upload Endpoint** (`/api/proof-upload`)
  - Implement Cloudinary signed upload parameter generation
  - Store proof metadata (URL, member UID, group ID, timestamp) in Firestore
  - Add file-size/MIME-type validation
  - Enforce user membership verification before issuing upload signature

- [ ] **Export Endpoint** (`/api/export`)
  - Fetch all transactions for a group
  - Generate CSV using `papaparse` with columns: [Date, Member, Amount, Status, Proof URL]
  - Generate PDF using `pdf-lib` with headers, branding, and signatures
  - Cache exports temporarily in Firebase Storage to avoid re-generation
  - Audit-log all exports with exporter UID and timestamp

- [ ] **Interest Recalculation** (`/api/interest-recalc`)
  - Read `compoundInterestSettings` doc for the group
  - Apply compound interest formula to balances (recommend: daily or monthly schedule)
  - Update member balances atomically with a transaction
  - Write immutable audit log entries for transparency
  - Send notification to all members post-recalculation

- [ ] **Notifications** (`/api/notify`)
  - Query FCM tokens for members in a group
  - Send payloads via FCM server API
  - Mirror notification records in `notifications` collection
  - Persist sent/read status for UI feedback

### 2. Firestore Collections & Initialization
- [ ] Create and document initial Firestore schema:
  - `groups/{groupId}` – group metadata (name, createdAt, createdBy, status)
  - `memberships/{uid}_${groupId}` – member role, balance, joinedAt
  - `transactions/{txId}` – amount (cents), userId, groupId, timestamp (UTC), proofUrl, status
  - `proofs/{proofId}` – cloudinaryUrl, txId, uploadedBy, uploadedAt
  - `auditLogs/{logId}` – action, actor (uid), groupId, details, timestamp
  - `compoundInterestSettings/{groupId}` – rate, frequency, lastRun, nextRun
  - `notifications/{notifId}` – message, recipients (uid array), read status, sentAt

- [ ] Seed initial dev/admin accounts with custom claims:
  ```bash
  firebase auth:set-custom-claims <dev-uid> --claims '{"role":"dev"}'
  firebase auth:set-custom-claims <admin-uid> --claims '{"role":"admin"}'
  ```

### 3. Frontend Data Binding & Real-Time Sync
- [ ] Wire transaction/record pages to Firestore listeners using `onSnapshot()`
- [ ] Implement Firestore query filters:
  - Members: `where('userId', '==', currentUser.uid)`
  - Admins: `where('groupId', '==', adminGroupId)`
- [ ] Add optimistic UI updates (immediate feedback on create/update, rollback on failure)
- [ ] Implement date-fns UTC handling for all timestamps in forms and displays
- [ ] Test integer-cent precision by submitting 100 cents = $1.00

### 4. Security & Auditing
- [ ] Deploy Firestore Security Rules to production (currently in `infra/firestore.rules`)
- [ ] Enable Firestore audit logging (via Google Cloud Console)
- [ ] Set up Cloud Monitoring alerts for:
  - Quota violations (reads/writes per day)
  - Authentication failures (>5 per minute)
  - Unusual access patterns (dev account accessing member data unexpectedly)
- [ ] Rotate Cloudinary API secret quarterly
- [ ] Implement rate limiting on backend endpoints (e.g., max 5 exports per hour, max 100 transactions per day per member)

### 5. Testing
- [ ] Unit tests for RBAC helpers (`requireRole`, `isOwnRecord`)
- [ ] Integration tests for each API endpoint (happy path + error cases)
- [ ] E2E tests for complete member/admin workflows:
  - Member signs in → logs transaction → uploads proof
  - Admin signs in → reviews records → exports CSV/PDF
  - Dev signs in → recalculates interest → sends notification
- [ ] Load test: simulate 50+ concurrent users logging transactions
- [ ] Security tests: attempt unauthorized access (member tries to view another member's data)

### 6. Documentation & Deployment
- [ ] Write developer onboarding guide (how to set up local Firebase emulator, run tests)
- [ ] Create admin guide (how to invite users, manage roles, interpret audit logs)
- [ ] Create member guide (how to log transactions, upload proofs, view balance)
- [ ] Automate Vercel deployment with GitHub Actions:
  - On push to `main`: run tests, lint, build, and deploy
  - Set environment variables in Vercel dashboard before first deployment
- [ ] Test Vercel Cold Starts with real load (serverless functions should respond <2 sec)
- [ ] Set up Vercel Analytics and error logging (e.g., Sentry integration)

### 7. Observability & Compliance
- [ ] Enable Cloud Logging for all Firestore reads/writes and Admin API calls
- [ ] Set up metrics dashboard (transactions per day, avg balance, member count)
- [ ] Implement data retention policy: archive audit logs > 1 year to Cloud Storage
- [ ] Add GDPR compliance features:
  - User data export endpoint (downloads all personal records as JSON/CSV)
  - User deletion flow (soft-delete from app, hard-delete from Firestore after 30 days)
- [ ] Regular backups: configure Firebase automated daily backups to a separate Cloud Storage bucket

---

## 🔍 Current Limitations

1. **No Offline Support** – App requires internet; no local sync caching (consider Redux/Zustand + idb for future)
2. **No Real-Time Notifications** – FCM integration is stubbed; users must refresh to see new data
3. **No Bulk Operations** – Members can only log one transaction at a time; no CSV import
4. **No Multi-Group Support** – UI assumes user is in one group; needs refactor for multiple memberships
5. **No Partial Visibility** – Admins see all member balances; no role-specific field masking
6. **No Custom Interest Formulas** – Only supports simple compound interest; no advanced financial models

---

## 🎯 Recommended Timeline

1. **Week 1:** Implement backend API endpoints and Firestore data binding
2. **Week 2:** Write unit/integration tests and harden security rules
3. **Week 3:** E2E testing, documentation, and internal UAT with admins
4. **Week 4:** Deploy to staging, fix bugs, then roll out to production with a small cohort (5-10 users)
5. **Week 5+:** Monitor metrics, collect feedback, iterate on UX/features

---

## 🚀 Deployment Checklist

Before launching to production:
- [ ] Firebase project configured with Firestore, Auth, Storage, Cloud Messaging
- [ ] Security rules deployed and tested in Emulator
- [ ] All backend endpoints implemented and tested locally
- [ ] Frontend environment variables loaded from Vercel secrets
- [ ] Google OAuth consent screen configured in Firebase Console
- [ ] Error handling and user-friendly messaging for all API failures
- [ ] Audit logging enabled for all admin/dev actions
- [ ] Rate limiting and quota alerts set up
- [ ] User onboarding flow tested end-to-end
- [ ] Admins trained on dashboard and export features
- [ ] 24/7 support plan in place for production issues

---

## Summary

The ledger is **architecturally sound** and follows best practices (RBAC via custom claims, Firestore security rules, immutable audit logs). However, it requires significant engineering effort to bridge the gap between "working skeleton" and "production-ready system." The items above prioritize security, reliability, and user experience.

**Recommendation:** Deploy to staging for 1-2 weeks of internal testing before any external user rollout.
