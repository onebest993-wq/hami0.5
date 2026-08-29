import type { ExecutionFile } from '@/app/types/execution';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRowReliable,
} from '@/app/utils/executorSeizureDecisionQueue';

export type ExecutionFileLike = Partial<ExecutionFile> & {
    id?: string;
    directorate?: string;
    debtorCourt?: string;
    creditors?: unknown[];
    debtors?: unknown[];
    debtAmount?: number;
    claimType?: string;
    timelineEvents?: Array<{ metadata?: { decisionRowId?: string } }>;
    delegationTargetDirectorate?: string;
};

export type DecisionPayload = {
    kind?: string;
    targetType?: string;
    targetId?: string;
    [key: string]: unknown;
};

export function asExecutionFiles(raw: unknown): ExecutionFileLike[] {
    return Array.isArray(raw) ? (raw as ExecutionFileLike[]) : [];
}

export function parseDecisionPayload(payloadRaw: string): DecisionPayload | null {
    try {
        const parsed: unknown = JSON.parse(payloadRaw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as DecisionPayload;
    } catch {
        return null;
    }
}

export function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const childIdx = key.indexOf('__child__');
    const subIdx = key.indexOf('__sub__');
    const idx =
        childIdx >= 0 && subIdx >= 0 ? Math.min(childIdx, subIdx) : childIdx >= 0 ? childIdx : subIdx;
    const base = (idx >= 0 ? key.slice(0, idx) : key).trim();
    if (!base || base === 'default' || base === 'undefined' || base === 'null') return '';
    return base;
}

export function markDossierSpecialFollowupApplied(executionId: string, decisionRowId: string): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionRowId || '').trim();
    if (!exId || !did) return;
    const ts = new Date().toISOString();
    patchExecutorDecisionRowReliable(exId, did, { specialFollowupAppliedAt: ts });
    dispatchDecisionsReload();
}

export function dispatchToast(msg: string, type: 'success' | 'warning' | 'info' = 'success') {
    try {
        window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message: msg, type } }));
    } catch {
        /* ignore */
    }
}
