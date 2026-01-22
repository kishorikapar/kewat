export type LedgerEntryType = 'disbursement' | 'repayment';

export type LedgerEntryStatus = 'recorded' | 'verified' | 'rejected';

export interface LedgerEntry {
  id: string;
  groupId: string;
  memberId: string; // borrower
  type: LedgerEntryType;
  amountPaisa: number;
  interestRateBps: number; // 25% => 2500 bps
  signedBy: string;
  notes?: string;
  evidenceUrls?: string[];
  status: LedgerEntryStatus;
  occurredAt: Date;
  createdAt: Date;
  createdBy: string;
}

export interface MemberProfile {
  id: string;
  groupId: string;
  displayName: string;
  email?: string;
  joinedAt?: Date;
}

export interface InterestSettings {
  groupId: string;
  rateBps: number; // default 2500
  updatedAt: Date;
  updatedBy: string;
}
