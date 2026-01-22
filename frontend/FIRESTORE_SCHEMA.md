# Firestore Schema (Kewat Ledger)

This project stores money in **integer paisa** (NPR × 100).

## Collections

### `memberships`
Existing collection used for group membership + role.

Doc ID: `${userId}_${groupId}`

Fields:
- `userId`: string
- `groupId`: string
- `role`: `'member' | 'admin' | 'dev'`
- `email`: string
- `displayName`: string
- `balancePaisa` (optional): number (derived, optional cache)
- `joinedAt`: timestamp

### `adminAllowlist`
Doc ID: `email` (lowercase)

Fields:
- `email`: string
- `addedBy`: string (uid)
- `addedAt`: timestamp

### `interestSettings`
Doc ID: `groupId`

Fields:
- `groupId`: string
- `rateBps`: number (25% = 2500)
- `updatedAt`: timestamp
- `updatedBy`: string (uid)

### `ledgerEntries`
Canonical ledger records.

Doc ID: auto

Fields:
- `groupId`: string
- `memberId`: string (borrower uid)
- `type`: `'disbursement' | 'repayment'`
- `amountPaisa`: number (integer)
- `interestRateBps`: number
- `signedBy`: string (name)
- `notes`: string | null
- `evidenceUrls`: string[]
- `status`: `'recorded' | 'verified' | 'rejected'`
- `occurredAt`: timestamp
- `createdAt`: timestamp
- `createdBy`: string (uid)

## Notes
- Interest is currently stored per entry to preserve history if the group rate changes.
- Member UI is read-only and should only access its own `ledgerEntries`.
