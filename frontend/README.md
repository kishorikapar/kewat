# Frontend

This directory will house the Next.js (App Router) client for the ledger experience. Core tasks include:
- Initialize a TypeScript + Tailwind project.
- Add Firebase client initialization (`firebase.config.ts` + context/provider wrappers).
- Build pages for groups, memberships, transactions, proof uploads (using `react-dropzone`), and interest settings.
- Integrate real-time Firestore listeners, UTC timestamps with `date-fns`, and exports (`papaparse`, `pdf-lib`).
- Wire in notification badges and audit trail displays.