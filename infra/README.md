# Infra

This directory will keep deployment descriptors, security rules, and automation.
- Draft Firestore security rules that gate reads/writes via membership roles.
- Store Terraform/CLI scripts (if needed) to provision Firebase and Cloudinary resources.
- Capture deployment steps for Vercel (frontend + Admin SDK functions) and Firestore indexes.
- Outline secrets management workflow referencing the `vault_requirements` block.