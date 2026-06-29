import type {
    CriminalCase,
    ExhibitLifecycleStatus,
    InvestigationLog,
    Statement,
} from './criminalCaseModel';
import { isStatementFromUnknownDefendant } from './criminalUnknownDefendant';
import {
    investigationLogsMutationBlocked,
    investigationStatementsMutationBlocked,
} from './investigationDefendantPurge';
import { resolveCurrentJourneyNodeId } from './stageJourney';

export type InvestigationMutationResult =
    | { ok: true; nextCase: CriminalCase }
    | { ok: false; reason: 'blocked' | 'not_found' | 'invalid' | 'unknown_defendant' };

export type InvestigationLetterCompletionPayload = {
    responseNotes?: string;
    receivedDate?: string;
};

function stampProceduralNodeId<T extends { proceduralNodeId?: string }>(item: T, nodeId: string): T {
    if (!nodeId) return item;
    return { ...item, proceduralNodeId: nodeId };
}

/** يُطبّق إدراج إفادة على لقطة إضبارة — منطق store `addStatement`. */
export function applyStatementInsertion(
    target: CriminalCase,
    statement: Statement,
): InvestigationMutationResult {
    if (investigationStatementsMutationBlocked(target)) {
        return { ok: false, reason: 'blocked' };
    }
    if (isStatementFromUnknownDefendant(statement, target.defendants)) {
        return { ok: false, reason: 'unknown_defendant' };
    }
    const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
    const stamped = stampProceduralNodeId(statement, nodeId);
    return {
        ok: true,
        nextCase: {
            ...target,
            statements: [...(target.statements ?? []), stamped],
        },
    };
}

/** يُطبّق تحديث إفادة — منطق store `updateStatement`. */
export function applyStatementUpdate(
    target: CriminalCase,
    statementId: string,
    updatedData: Partial<Omit<Statement, 'id'>>,
): InvestigationMutationResult {
    if (investigationStatementsMutationBlocked(target)) {
        return { ok: false, reason: 'blocked' };
    }
    const list = Array.isArray(target.statements) ? target.statements : [];
    const idx = list.findIndex((s) => s.id === statementId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const next = list.map((s, i) => {
        if (i !== idx) return s;
        const nextRatified =
            updatedData.isJudiciallyRatified === true
                ? true
                : updatedData.isJudiciallyRatified === false
                  ? undefined
                  : (s as Statement).isJudiciallyRatified === true
                    ? true
                    : undefined;
        const isRatified = (s as Statement).isJudiciallyRatified === true;
        const patch = isRatified
            ? {
                  notes: updatedData.notes,
                  isJudiciallyRatified: updatedData.isJudiciallyRatified,
              }
            : updatedData;
        return { ...s, ...patch, isJudiciallyRatified: nextRatified, id: s.id };
    });
    return {
        ok: true,
        nextCase: { ...target, statements: next },
    };
}

/** يُطبّق إدراج سجل تحقيق — منطق store `addInvestigationLog`. */
export function applyInvestigationLogInsertion(
    target: CriminalCase,
    log: InvestigationLog,
): InvestigationMutationResult {
    if (investigationLogsMutationBlocked(target)) {
        return { ok: false, reason: 'blocked' };
    }
    return {
        ok: true,
        nextCase: {
            ...target,
            investigationLogs: [...(target.investigationLogs ?? []), log],
        },
    };
}

/** يُطبّق تحديث سجل تحقيق — منطق store `updateInvestigationLog`. */
export function applyInvestigationLogUpdate(
    target: CriminalCase,
    logId: string,
    updatedData: Partial<Omit<InvestigationLog, 'id'>>,
): InvestigationMutationResult {
    if (investigationLogsMutationBlocked(target)) {
        return { ok: false, reason: 'blocked' };
    }
    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
    const idx = list.findIndex((l) => l.id === logId);
    if (idx < 0) return { ok: false, reason: 'not_found' };
    const next = list.map((l, i) => (i === idx ? { ...l, ...updatedData, id: l.id } : l));
    return {
        ok: true,
        nextCase: { ...target, investigationLogs: next },
    };
}

export type InvestigationLetterCompletionResult =
    | { ok: true; nextCase: CriminalCase }
    | { ok: false; error: string };

/** يُكمل كتاب/تقرير تحقيق — منطق store `completeInvestigationLetter`. */
export function applyCompleteInvestigationLetter(
    target: CriminalCase,
    logId: string,
    payload: InvestigationLetterCompletionPayload,
): InvestigationLetterCompletionResult {
    if (investigationLogsMutationBlocked(target)) {
        return { ok: false, error: 'الإضبارة مقفلة.' };
    }
    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
    const idx = list.findIndex((l) => l.id === logId);
    if (idx < 0) {
        return { ok: false, error: 'السجل غير موجود.' };
    }
    const current = list[idx]!;
    const cat = String(current.category ?? '');
    if (cat !== 'official_letter' && cat !== 'forensic_report') {
        return { ok: false, error: 'هذا الإجراء ليس من ديوان المخاطبات.' };
    }
    if (current.status === 'response_received') {
        return { ok: false, error: 'تم تسجيل الورود مسبقاً.' };
    }
    const receivedAt =
        String(payload.receivedDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const notes = String(payload.responseNotes ?? '').trim();
    const next = list.map((l, i) =>
        i === idx
            ? {
                  ...l,
                  status: 'response_received' as const,
                  responseReceivedAt: receivedAt,
                  responseNotes: notes || l.responseNotes,
                  details: notes
                      ? `${String(l.details ?? '').trim()}\n\n📥 ورود التقرير (${receivedAt}): ${notes}`.trim()
                      : l.details,
              }
            : l,
    );
    return {
        ok: true,
        nextCase: { ...target, investigationLogs: next },
    };
}

export type InvestigationExhibitLifecycleResult =
    | { ok: true; nextCase: CriminalCase }
    | { ok: false; error: string };

/** يُحدّث دورة حياة مبرز — منطق store `updateInvestigationLogExhibitLifecycle`. */
export function applyInvestigationLogExhibitLifecycleUpdate(
    target: CriminalCase,
    logId: string,
    lifecycle: ExhibitLifecycleStatus,
): InvestigationExhibitLifecycleResult {
    if (investigationLogsMutationBlocked(target)) {
        return { ok: false, error: 'الإضبارة مقفلة.' };
    }
    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
    const idx = list.findIndex((l) => l.id === logId);
    if (idx < 0) {
        return { ok: false, error: 'السجل غير موجود.' };
    }
    const current = list[idx]!;
    const cat = String(current.category ?? '');
    if (cat !== 'exhibit_seizure' && cat !== 'site_inspection') {
        return { ok: false, error: 'هذا السجل ليس من خزانة المبرزات.' };
    }
    const next = list.map((l, i) => (i === idx ? { ...l, exhibitLifecycle: lifecycle } : l));
    return {
        ok: true,
        nextCase: { ...target, investigationLogs: next },
    };
}
