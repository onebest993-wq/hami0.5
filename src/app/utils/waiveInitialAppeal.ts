// @ts-nocheck
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    newEventId,
    resolveHarmedPartyAppealActor,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { dispatchDecisionsReload, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';
import SecureStoreService from '@/app/services/SecureStoreService';

export type WaiveInitialAppealApplyResult = {
    ok: boolean;
    mergedRowId?: string;
    title?: string;
    message?: string;
};

/** هل يمكن للطرف المتضرر (وكيل الدائن) الاستغناء عن التظلم والتمييز قبل تقديمهما */
export function canWaiveInitialAppeal(
    hub: Decision,
    _all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (hub.noAppealChosen === true) return false;
    if (hub.appealStatus === 'final') return false;
    if (hub.appealRequestOrigin === 'executor_side') return false;
    if (hub.appealStatus === 'tadhallum_filed' || hub.appealStatus === 'tamyeez_filed') return false;
    if (hub.appealPhase === 'grievance' || hub.appealPhase === 'cassation') return false;
    if (Boolean(hub.activeAppealCopyId)) return false;
    if (Boolean(hub.awaitingCassationEntryBy)) return false;
    const harmed = resolveHarmedPartyAppealActor(hub, perspective);
    if (perspective === 'debtor_agent') {
        return harmed === 'debtor';
    }
    if (harmed === 'lawyer') return true;
    /** طلب كفيل ضامن — إغلاق الدورة من محضر المتابعة دون طعن بعد رفض المنفذ */
    if (
        hub.requestKind === 'guarantor_request' &&
        hub.executorOutcome === 'rejected'
    ) {
        return true;
    }
    return false;
}

export function buildWaiveInitialAppealPatch(_hub: Decision): Partial<Decision> {
    const sealedAt = new Date().toISOString();
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: 'FINAL_REJECTED',
        appealActor: null,
        appealMethod: null,
        awaitingCassationEntryBy: null,
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        requestCycleSuperseded: true,
        requestCycleSupersededAt: sealedAt,
        isArchived: true,
    };
}

/** تسجيل «لا حاجة للطعن» — إغلاق مهلة الطعن دون تظلم أو تمييز */
export function applyWaiveInitialAppealForExecution(input: {
    executionId: string | undefined;
    decisionId: string | undefined;
    appealPerspective?: AppealUiPerspective;
}): WaiveInitialAppealApplyResult {
    const executionId = String(input.executionId ?? '').trim();
    const decisionId = String(input.decisionId ?? '').trim();
    if (!executionId || !decisionId) {
        return { ok: false, message: 'معرّف التنفيذ أو القرار غير صالح.' };
    }

    const decisions = readExecutorDecisionsArray(executionId) as Decision[];
    const row = decisions.find((d) => String(d.id ?? '').trim() === decisionId);
    if (!row) {
        return { ok: false, message: 'لم يُعثر على بطاقة القرار.' };
    }

    if (!canWaiveInitialAppeal(row, decisions, input.appealPerspective ?? 'creditor_agent')) {
        return { ok: false, message: 'لا يمكن إتمام الاستغناء عن الطعن في هذه الحالة.' };
    }

    const patch = buildWaiveInitialAppealPatch(row);
    const perspective = input.appealPerspective ?? 'creditor_agent';
    const outcomeLine =
        perspective === 'debtor_agent'
            ? 'لا حاجة للطعن — قُبل قرار المنفذ دون تظلم أو تمييز من موكّلنا وأُغلقت المهلة.'
            : 'لا حاجة للطعن — قُبل قرار المنفذ دون تقديم تظلم أو تمييز وأُغلقت دورة الطلب.';
    const logEntry = {
        id: newEventId(),
        at: new Date().toISOString(),
        message: outcomeLine,
        tone: 'slate' as const,
    };

    const next = decisions.map((d): Decision => {
        if (d.id !== row.id) return d;
        return {
            ...d,
            ...patch,
            appealTimelineLogs: [
                ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                logEntry,
            ],
        };
    });

    writeExecutorDecisionsArray(executionId, next as unknown as Record<string, unknown>[]);
    dispatchDecisionsReload();

    const mergedRow = next.find((x) => x.id === row.id);
    if (mergedRow) {
        applyPersonalCoerciveAppealClosure({
            executionId,
            row: mergedRow as unknown as Record<string, unknown>,
            allDecisions: next as unknown as Record<string, unknown>[],
        });
        applyEvictionAppealClosure({
            executionId,
            row: mergedRow as unknown as Record<string, unknown>,
            allDecisions: next as unknown as Record<string, unknown>[],
        });
    }

    return {
        ok: true,
        mergedRowId: row.id,
        title: String(row.title ?? 'قرار المنفذ'),
        message: outcomeLine,
    };
}
