import { formatDateToLocalYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';

/** Payload from SmartJudgmentModal / validation pipeline. */
export type JudgmentPayload = {
    date?: string;
    type?: string;
    form?: string;
    decision?: string;
    action?: string;
    judgmentType?: string;
    judgmentForm?: string;
    judgmentDate?: string;
    notes?: string;
    nextStage?: string;
    openAppealTransitionModal?: boolean;
    openObjectionModal?: boolean;
    [key: string]: unknown;
};

export type AppealTransitionPayload = {
    appealType: string;
    appellant: string;
    filingDate: string;
    newCaseNumber: string;
    notes: string;
};

export type CrossAppealPayload = {
    filingDate: string;
    receiptNumber: string;
    notes: string;
};

export type StageTransitionPayload = {
    newStage: string;
    newCourt: string;
    newCaseNo: string;
    appellant: string;
    result: string;
    date: string;
    [key: string]: unknown;
};

export type SmartFileAttachment = {
    id?: string;
    isActive?: boolean;
    status?: string;
    attachedProperty?: string;
    judgmentSyncDate?: string;
    judgmentSyncNote?: string;
    [key: string]: unknown;
};

export function str(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

export function parseJudgmentDateInput(judgmentDate: unknown): Date {
    const jdRaw = str(judgmentDate).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(jdRaw)) {
        return parseLocalNotificationDate(jdRaw);
    }
    if (judgmentDate instanceof Date && !Number.isNaN(judgmentDate.getTime())) {
        return judgmentDate;
    }
    if (typeof judgmentDate === 'number') {
        return new Date(judgmentDate);
    }
    const parsed = new Date(str(judgmentDate));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function addDaysYmd(base: Date, days: number): string {
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return formatDateToLocalYmd(result);
}

export function prependTimeline(
    stage: CaseStage,
    event: TimelineEvent,
): TimelineEvent[] {
    return [event, ...(stage.timeline ?? [])];
}

export function stageAttachments(stage: CaseStage): SmartFileAttachment[] {
    if (!Array.isArray(stage.attachments)) return [];
    return stage.attachments as SmartFileAttachment[];
}
