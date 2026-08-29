/**
 * Form state, component prop types, and small utility aliases.
 */
import type { Currency } from './core';
import type { Party } from './party';
import type { PaymentRecord } from './financial';
import type { TimelineEvent } from './timeline';
import type { ExecutionFile } from './executionFile';

// ═══════════════════════════════════════════════════════════════════════════
// FORM STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionFormData {
    directorate: string;
    fileNumber: string;
    claimType: string;
    documentType: string;
    documentDate: string;
    executionDate: string;
    
    creditors: Party[];
    debtors: Party[];
    
    debtAmount: string;
    currency: Currency;
    courtFees: string;
    lawyerFees: string;
    
    // Alimony specific
    alimonyChildrenCount?: string;
    alimonyWifeAmount?: string;
    alimonyChildAmount?: string;
    
    // Document specific
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    
    paperNumber?: string;
    paperIssueDate?: string;
    paperDueDate?: string;
    paperDrawer?: string;
    paperDrawee?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL/COMPONENT PROPS TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionDashboardProps {
    file?: ExecutionFile;
    executionId?: string;
    onClose: () => void;
    onUpdate?: (file: ExecutionFile) => void;
    /** مغادرة للرئيسية — تُستخدم أثناء الهيكل الفوري قبل الجسم الحي */
    onExitToHome?: () => void;
}

export interface FinancialOperationsCenterProps {
    executionId: string;
    debtAmount: number;
    courtFees: number;
    directorateFees: number;
    clientFees: number;
    lawyerFees: number;
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    remaining: number;
    currency: Currency;
    onPayment: (payment: PaymentRecord) => void;
}

export interface TimelineEventCardProps {
    event: TimelineEvent;
    onUpdate?: (event: TimelineEvent) => void;
    onDelete?: (eventId: string) => void;
}

export interface PartyCardProps {
    party: Party;
    type: 'creditor' | 'debtor';
    onUpdate?: (party: Party) => void;
    onDelete?: (partyId: string | number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// ═══════════════════════════════════════════════════════════════════════════
