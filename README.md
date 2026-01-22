# Kewat Group Ledger

This repository defines the Kewat Group Ledger project, a collaborative mobile-first ledger system built on Next.js, Firebase, and Cloudinary. The documentation files (`CLARIFICATION.md` and `PLAN.md`) capture the product goals, security posture, DAG-based execution plan, and the vault requirements for provisioning.

## Repository Structure
- `CLARIFICATION.md`: High-level requirements, stack, and vault secrets list.
- `PLAN.md`: DAG-driven roadmap with dependencies, milestones, and immediate next steps.
- `frontend/`: Placeholder for the Next.js App Router client.
- `backend/`: Placeholder for Vercel serverless functions (Admin SDK helpers).
- `infra/`: Placeholder for deployment descriptors, security rules, or automation scripts.

## Initial Steps
1. Review `PLAN.md` to understand node dependencies and short-term priorities.
2. Populate `infra/` with Firebase configurations and Firestore security rules drafts.
3. Begin implementing `backend/` functions for RBAC, proof uploads, exports, and notifications.
4. Concurrently, scaffold the `frontend/` app with Next.js pages/components tied into the Firebase Web SDK.

## Quick Commands
Use the following as a reminder; adapt the Firebase CLI and Next.js tasks when ready:
```
npx firebase login
npx create-next-app@latest frontend --typescript --tailwind
```# kewat

## Vercel Deployment Guide
This app is a Next.js App Router project inside `frontend/`.

### Vercel Settings
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Required Environment Variables
Add these in Vercel → Project → Settings → Environment Variables (no quotes needed unless specified):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_DEV_EMAILS`
- `DEV_EMAILS`
- `FIREBASE_SERVICE_ACCOUNT` (paste the **full JSON** as a single line)

### Optional Environment Variables
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `NEXT_PUBLIC_API_BASE_URL`
- `FCM_SERVER_KEY`

### Notes
- Keep `.env.local` and any secret files **out of Git**.
- Use `frontend/.env.example` as the template for local dev.
