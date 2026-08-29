/**
 * Case (lawsuit) file, stage, timeline, and attachment types.
 */

import type { BaseFile } from './base';
import type { Party } from './party';
import type { FinancialData } from './financial';
import type { CourtInfo } from './court';

export interface CaseFile extends BaseFile {
    type: CaseType;
    subType?: CaseSubType;
    parties: Party[];
    stages?: Stage[];
    financials?: FinancialData;
    court?: CourtInfo;
    caseNumber?: string;
    filingDate?: string;
}

export type CaseType = 'civil' | 'sharia' | 'criminal' | 'administrative';

export type CaseSubType =
    | 'urgent'
    | 'acknowledgment'
    | 'discovery'
    | 'state_order'
    | 'alimony'
    | 'inheritance'
    | 'divorce'
    | 'custody';

export interface Stage {
    id: string;
    title: string;
    description?: string;
    type: StageType;
    status: StageStatus;
    createdAt: string;
    completedAt?: string;
    timeline?: TimelineEvent[];
    attachments?: Attachment[];
    notes?: string;
}

export type StageType =
    | 'filing'
    | 'hearing'
    | 'judgment'
    | 'appeal'
    | 'execution'
    | 'settlement'
    | 'investigation';

export type StageStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    date: string;
    author?: string;
    isDeleted?: boolean;
    attachments?: Attachment[];
}

export type TimelineEventType =
    | 'note'
    | 'hearing'
    | 'decision'
    | 'document'
    | 'payment'
    | 'notification'
    | 'task';

export interface Attachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url?: string;
    uploadedAt: string;
    uploadedBy?: string;
}
