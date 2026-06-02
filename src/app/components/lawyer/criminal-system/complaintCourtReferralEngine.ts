import type { CriminalCase, CriminalCaseLocation, TimelineEvent } from './criminalStore';
import { isInvestigationStoredStage } from './criminalStageUtils';
import { isComplaintCourtReferralTemplate } from './proceduralRequestTypes';
import type { JudicialDecision } from '@/app/types/criminal';

export type ComplaintCourtReferralMeta = {
    priorCourtName: string;
    priorInvestigationCourtName: string;
    referredCourtName: string;
    sourceRequestId: string;
    appliedAt: string;
};

function createId(): string {
    return globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildReferralLocation(
    location: CriminalCaseLocation,
    courtName: string,
    isInvestigationStage: boolean,
): CriminalCaseLocation {
    if (isInvestigationStage) {
        return {
            ...location,
            courtName,
            investigationCourtName: courtName,
        };
    }
    return {
        ...location,
        courtName,
    };
}

export function applyComplaintCourtReferralToCase(
    caseRecord: CriminalCase,
    referredCourtName: string,
    sourceRequestId: string,
): CriminalCase {
    const name = String(referredCourtName ?? '').trim();
    const reqId = String(sourceRequestId ?? '').trim();
    if (!name || !reqId) return caseRecord;

    const isInvestigationStage = isInvestigationStoredStage(String(caseRecord.basics.stage ?? ''));
    const priorCourtName = String(caseRecord.location.courtName ?? '').trim();
    const priorInvestigationCourtName = String(caseRecord.location.investigationCourtName ?? '').trim();
    const appliedAt = new Date().toISOString().slice(0, 10);
    const nextLocation = buildReferralLocation(caseRecord.location, name, isInvestigationStage);

    const event: TimelineEvent = {
        id: createId(),
        date: appliedAt,
        type: 'decision',
        category: 'إحالة الشكوى',
        title: 'إحالة الشكوى إلى محكمة أخرى',
        description: `تمت إحالة الشكوى إلى المحكمة: ${name}`,
    };

    const events = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];

    return {
        ...caseRecord,
        location: nextLocation,
        complaintCourtReferral: {
            priorCourtName,
            priorInvestigationCourtName,
            referredCourtName: name,
            sourceRequestId: reqId,
            appliedAt,
        },
        timelineEvents: [...events, event],
    };
}

export function restoreComplaintCourtReferralOnQuash(
    caseRecord: CriminalCase,
    decisionSourceRequestId: string,
): CriminalCase {
    const snap = caseRecord.complaintCourtReferral;
    const reqId = String(decisionSourceRequestId ?? '').trim();
    if (!snap || snap.sourceRequestId !== reqId) return caseRecord;

    const restoredAt = new Date().toISOString().slice(0, 10);
    const nextLocation: CriminalCaseLocation = {
        ...caseRecord.location,
        courtName: snap.priorCourtName,
        investigationCourtName: snap.priorInvestigationCourtName,
    };

    const event: TimelineEvent = {
        id: createId(),
        date: restoredAt,
        type: 'decision',
        category: 'نقض تمييزي',
        title: 'استعادة اسم المحكمة بعد نقض الإحالة',
        description: `أُعيد اسم المحكمة إلى: ${snap.priorInvestigationCourtName || snap.priorCourtName || '—'}`,
    };

    const events = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];

    return {
        ...caseRecord,
        location: nextLocation,
        complaintCourtReferral: undefined,
        timelineEvents: [...events, event],
    };
}

export function isQuashCassationAppealResult(result: string | undefined): boolean {
    const key = String(result ?? '').trim();
    return key === 'quash_dismissal' || key === 'quash_remand' || key === 'quash_modify';
}

export function shouldRestoreCourtAfterReferralQuash(
    decision: Pick<JudicialDecision, 'proceduralTemplate' | 'title' | 'sourceRequestId'>,
    caseRecord: CriminalCase,
    appealResult: string | undefined,
): boolean {
    if (!isQuashCassationAppealResult(appealResult)) return false;
    const template = String(decision.proceduralTemplate ?? decision.title ?? '').trim();
    if (!isComplaintCourtReferralTemplate(template)) return false;
    const reqId = String(decision.sourceRequestId ?? '').trim();
    if (!reqId) return false;
    return caseRecord.complaintCourtReferral?.sourceRequestId === reqId;
}
