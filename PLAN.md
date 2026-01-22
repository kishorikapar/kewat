# Kewat Group Ledger Execution Plan

## Objective
Provide an end-to-end blueprint and working kickoff for the Kewat Group Ledger, ensuring every layer—from secret provisioning to exports and notifications—follows the DAG sequencing inferred from the clarified requirements.

## DAG Nodes & Dependencies
1. **Requirements & Clarification** (completed) – Captures goals, vault needs, and expectations (`CLARIFICATION.md`). No predecessors.
2. **Environment & Secrets** (depends on Node 1) – Provision Firebase/Cloudinary credentials, document `vault_requirements`, draft Firestore security rules, and outline hosting/deployment configs. Outputs: `env/` manifest, security rule draft, secrets governance plan.
3. **Backend Core Services** (depends on Node 2) – Build Vercel serverless functions with RBAC enforcement, invite-code generation, audit logging, compound-interest recalculations, notification scaffolding, and Cloudinary signed-upload helpers. Include integration with Firestore triggers for aggregates and export helpers (CSV/PDF via `papaparse` and `pdf-lib`).
4. **Frontend Platform** (depends on Nodes 1 & 3) – Next.js (App Router) app using `react-dropzone`, `date-fns`, Firebase Web SDK, and TailwindCSS to manage groups, memberships, transactions, proofs, and interest settings; includes auth flows, modals, and dashboards.
5. **Realtime Sync & Notifications** (depends on Nodes 3 & 4) – Implement `notifications` collection, Firebase Cloud Messaging hooks, UTC timestamp enforcement, and Firestore listeners that keep balances/interest synchronized; persistence of immutable audit trail metadata for each flow.
6. **QA, Export, & Delivery** (depends on Nodes 3–5) – E2E tests, export validation (CSV/PDF), deployment automation, and README/docs for developers/operators.

### DAG Edges
- `1 → 2` (env prep requires clarified requirements)
- `2 → 3` and `2 → 4` (servers and clients rely on secrets/config)
- `3 → 4` and `3 → 5` (backend services power frontend and notifications)
- `4 → 5` (frontend needs reactivity/notifications)
- `{3,4,5} → 6` (QA/exports/delivery need stable backend/frontend/features)

## Immediate Execution Plan
1. **Lock Node 2 deliverables** (current focus)
   - Define structure for storing required secrets/credentials and security rules.
   - Lay out environment manifest and a `vault_requirements` snippet (already captured in `CLARIFICATION.md`).
   - Identify required Firebase collections, indexes, and initial sample documents for development/testing.
2. **Kickoff Node 3 prep**
   - Create directory `backend/functions` with README and placeholder config for Firebase Admin SDK.
   - Draft RBAC matrix detailing who can read/write each collection and which serverless endpoint enforces it.
3. **Kickoff Node 4 prep**
   - Create directory `frontend/app` skeleton with base `page.tsx` and `layout.tsx` placeholders referencing Next.js App Router structure.
   - Establish Tailwind + Firebase client setup in `frontend/lib/firebase.ts`.

## Quick Wins & Deliverables
- Provide `CLARIFICATION.md` (done).
- Generate this `PLAN.md` to capture dependencies and next steps.
- Create supporting README(s) and placeholder directories so the implementation phases have structure to land inside.

## Next Steps
1. Build the environment/secret manifest (Node 2) and secure storage plan.
2. Scaffold backend and frontend directories with README + initial configuration.
3. Start implementing backend services and frontend screens in tandem, respecting the DAG order.