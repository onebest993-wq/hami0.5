/**
 * Pure case transforms for CriminalCase — shared primitives used across the
 * caseTransform* domain modules (stamping, detention helpers, status mapping).
 * None of these touch the Zustand store directly.
 */
import type {
    CriminalCase,
    CriminalCaseStage,
    CriminalDefendant,
    DefendantStatus,
    DetentionHistory,
    LawyerRequest,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';
import {
    isValidCriminalStage,
} from './criminalStageUtils';

export function isCourtStageValue(v: string): v is CriminalCaseStage {
    return isValidCriminalStage(v);
}

export function readDetentionHistoryLog(defendant: CriminalDefendant): DetentionHistory[] {
    return Array.isArray(defendant.detentionHistoryLog) ? defendant.detentionHistoryLog : [];
}

export function findOpenDetentionHistoryIndex(history: DetentionHistory[]): number {
    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item && typeof item === 'object' && !String(item.endDate ?? '').trim()) {
            return i;
        }
    }
    return -1;
}

export function readLawyerRequestDefendantIds(request: LawyerRequest): string[] {
    const rawIds = Array.isArray(request.defendantIds) ? request.defendantIds : [];
    return rawIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
}

export function requiresDetentionAuthority(status: DefendantStatus | ''): boolean {
    return status === 'موقوف' || status === 'ملقى القبض عليه' || status === 'psychiatric_eval' || status === 'juvenile_detention';
}

export function requiresDetentionExpiryDate(status: DefendantStatus | ''): boolean {
    return status === 'موقوف';
}

export function stampProceduralNodeId(item: TimelineEvent, nodeId: string): TimelineEvent;
export function stampProceduralNodeId(item: LawyerRequest, nodeId: string): LawyerRequest;
export function stampProceduralNodeId<T extends { proceduralNodeId?: string }>(item: T, nodeId: string): T;
export function stampProceduralNodeId<T extends { proceduralNodeId?: string }>(item: T, nodeId: string): T {
    if (!nodeId) return item;
    return { ...item, proceduralNodeId: nodeId };
}

export function normalizeReferralDefendantIds(target: CriminalCase, defendantIds: string[]): {
    allDefIds: string[];
    scopedIds: string[];
    remainingIds: string[];
    isPartialReferral: boolean;
} {
    const allDefIds = (Array.isArray(target.defendants) ? target.defendants : [])
        .map((d) => String(d.id ?? '').trim())
        .filter((x) => x.length > 0);
    const scopedIds = (Array.isArray(defendantIds) ? defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter((x) => x.length > 0 && allDefIds.includes(x));
    const remainingIds = allDefIds.filter((id) => !scopedIds.includes(id));
    const isPartialReferral = scopedIds.length > 0 && remainingIds.length > 0;
    return { allDefIds, scopedIds, remainingIds, isPartialReferral };
}

/** يستبعد أحداث التايم لاين التجريبية/الميتة عند التحميل من التخزين المحلي. */
export function mapDecisionStatusToDefendantStatus(status: StageConclusion['defendantStatusAtDecision']): DefendantStatus {
    if (status === 'detained') return 'موقوف';
    if (status === 'fugitive') return 'هارب';
    return 'مكفل';
}
