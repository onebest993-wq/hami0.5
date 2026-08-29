/**
 * Execution document / deed / commercial paper types.
 */

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type DocumentType = 
    | 'civil_judgment'
    | 'sharia_deed'
    | 'commercial_paper'
    | 'promissory_note';

export interface DocumentDetails {
    type: DocumentType;
    number: string;
    date: string;
    issuingCourt: string;
    registerNumber?: string;
}

// Sharia Deed Specific
export interface ShariaDeedDetails extends DocumentDetails {
    type: 'sharia_deed';
    shariaDeedNumber: string;
    shariaRegisterNumber: string;
    shariaIssueDate: string;
    shariaIssuingCourt: string;
}

// Commercial Paper Specific
export interface CommercialPaperDetails extends DocumentDetails {
    type: 'commercial_paper';
    paperNumber: string;
    paperIssueDate: string;
    paperDueDate: string;
    paperDrawer: string;
    paperDrawee: string;
}
