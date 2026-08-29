/**
 * Execution archive file and related coercive / seizure types.
 */

import type { BaseFile } from './base';
import type { Party } from './party';
import type { Payment } from './financial';

export interface ExecutionArchiveFile extends BaseFile {
    type: ExecutionType;
    directorate: string;
    creditors: Party[];
    debtors: Party[];
    totalAmount: number;
    paidAmount?: number;
    remainingAmount?: number;
    payments?: Payment[];
    assets?: SeizedAsset[];
    notifications?: NotificationRecord[];
    imprisonmentData?: ImprisonmentData;
    /** Optional UI/draft fields used by execution creation wizard (persisted as metadata). */
    claimType?: string;
    chequeBankName?: string;
    chequeIssueDate?: string;
    chequeNumber?: string;
    docNumber?: string;
    foreignData?: Record<string, unknown>;
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    shariaDeedDetails?: string;
    alimony?: unknown;
    monthlyAlimony?: number;
    includesSleepover?: boolean;
    furnitureValue?: number;
    furnitureDetails?: string;
    includeLawyerFees?: boolean;
    lawyerFeesAmount?: number;
    dueDate?: string;
    executionTarget?: string;
    dowryReason?: string;
    guardianshipDetails?: string;
    applicant?: string;
    respondent?: string;
    initiatorRole?: string;
    classification?: string;
    clientFeesAmount?: number;
    creditor?: string | Party;
    debtor?: string | Party;
    fileNumber?: string;
    fileYear?: string | number;
    docType?: string;
    executionBasis?: string;
    relationship?: string;
    linkedDebtor?: string | Party;
}

export type ExecutionType = 'civil' | 'sharia' | 'mutawaa';

export interface SeizedAsset {
    id: string;
    type: AssetType;
    description: string;
    estimatedValue: number;
    status: AssetStatus;
    seizureDate: string;
    notes?: string;
}

export type AssetType = 'real_estate' | 'vehicle' | 'bank_account' | 'salary' | 'other';
export type AssetStatus = 'seized' | 'sold' | 'released' | 'pending';

export interface NotificationRecord {
    id: string;
    type: NotificationType;
    recipient: string;
    date: string;
    status: NotificationStatus;
    notes?: string;
}

export type NotificationType = 'initial' | 'reminder' | 'final' | 'execution';
export type NotificationStatus = 'sent' | 'delivered' | 'failed';

export interface ImprisonmentData {
    status: ImprisonmentStatus;
    startDate?: string;
    endDate?: string;
    reason?: string;
    facility?: string;
}

export type ImprisonmentStatus = 'none' | 'pending' | 'active' | 'completed';
