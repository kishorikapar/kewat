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
