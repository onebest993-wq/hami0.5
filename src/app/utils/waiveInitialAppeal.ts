// @ts-nocheck
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    newEventId,
    resolveAppealBaseBranch,
    resolveHarmedPartyAppealActor,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { dispatchDecisionsReload, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

export type WaiveInitialAppealApplyResult = {
    ok: boolean;
    mergedRowId?: string;
    title?: string;
    message?: string;
};

function isAppealPipelineOpen(hub: Decision): boolean {
    if (hub.appealStatus === 'tadhallum_filed' || hub.appealStatus === 'tamyeez_filed') return true;
    if (hub.appealPhase === 'grievance' || hub.appealPhase === 'cassation') return true;
    if (Boolean(hub.activeAppealCopyId)) return true;
    if (Boolean(hub.awaitingCassationEntryBy)) return true;
    return false;
}

/** قرار المنفذ لصالح مقدّم الطلب — لا نستبدل موقف الطرف الذي له حق الطعن */
export function canWaiveFavorableExecutorOutcome(
    hub: Decision,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    const ex = hub.executorOutcome;
    if (ex !== 'approved' && ex !== 'alternative') return false;
    const harmed = resolveHarmedPartyAppealActor(hub, perspective);
    if (perspective === 'creditor_agent' && hub.appealRequestOrigin === 'creditor_side') {
        return harmed !== 'debtor';
    }
    if (perspective === 'debtor_agent' && hub.appealRequestOrigin === 'debtor_side') {
        return harmed !== 'lawyer';
    }
    return false;
}

/** هل يمكن للطرف المتضرر (وكيل الدائن) الاستغناء عن التظلم والتمييز قبل تقديمهما */
export function canWaiveInitialAppeal(
    hub: Decision,
    _all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (hub.noAppealChosen === true) return false;
    if (hub.appealStatus === 'final') return false;
    if (isAppealPipelineOpen(hub)) return false;

    if (canWaiveFavorableExecutorOutcome(hub, perspective)) {
        return true;
    }

    if (hub.appealRequestOrigin === 'executor_side') {
        if (hub.manualExecutorLedgerEntry) return false;
        const branch = resolveAppealBaseBranch(hub);
        if (perspective === 'debtor_agent') {
            return branch === 'after_approval';
        }
        return branch === 'after_rejection';
    }

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

export function buildWaiveInitialAppealPatch(
    hub: Decision,
    opts?: { favorable?: boolean }
): Partial<Decision> {
    const sealedAt = new Date().toISOString();
    const favorable = opts?.favorable === true;
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: favorable ? 'FINAL_ACCEPTED' : 'FINAL_REJECTED',
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

    const perspective = input.appealPerspective ?? 'creditor_agent';
    const favorable = canWaiveFavorableExecutorOutcome(row, perspective);
    const patch = buildWaiveInitialAppealPatch(row, { favorable });
    const outcomeLine = favorable
        ? 'لا حاجة للطعن — القرار لمصلحتنا وأُغلقت دورة الطلب دون انتظار مهلة الطرف الآخر.'
        : perspective === 'debtor_agent'
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

    writeExecutorDecisionsUnionForExecution(
        executionId,
        next as unknown as Record<string, unknown>[],
        readExecutionDataForDomainGate(executionId)
    );
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
