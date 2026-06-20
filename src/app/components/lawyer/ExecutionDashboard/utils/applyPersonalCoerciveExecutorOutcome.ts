// @ts-nocheck
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import {
    EXECUTION_FILES_STORAGE_KEY,
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { storageCache } from '@/app/utils/storageCache';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { stripPendingLabelsFromExecutorSubject } from '@/app/utils/executorDecisionTitles';
import {
    closePersonalCoerciveSubtypeDecisionCycle,
    getExecutorDecisionRowById,
    patchExecutorDecisionRowReliable,
    resolveExecutorDecisionRowContext,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';

export const HAMI_APPEND_EXECUTION_TIMELINE = 'hami-append-execution-timeline';

function normalizeBaseDossierIdFromDecisionsKey(rawKey: string | undefined): string {
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

export function persistExecutionPatch(executionId: string, patch: Record<string, unknown>): void {
    if (!executionId || Object.keys(patch).length === 0) return;
    const dossierId = normalizeBaseDossierIdFromDecisionsKey(executionId) || executionId;
    const store = useExecutionDashboardStore.getState();
    const curId = String(store.currentFile?.id || '').trim();
    if (curId && curId === dossierId) {
        store.updateCurrentFile(patch as Partial<ExecutionFile>);
        return;
    }
    try {
        const all = loadExecutionFilesRaw() as ExecutionFile[];
        const idx = all.findIndex((f) => String(f?.id || '').trim() === dossierId);
        if (idx < 0) return;
        all[idx] = { ...all[idx], ...patch } as ExecutionFile;
        saveExecutionFilesRaw(all);
        const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
        if (Array.isArray(cache)) {
            const arr = cache as ExecutionFile[];
            const cIdx = arr.findIndex((f) => String(f?.id || '').trim() === dossierId);
            if (cIdx >= 0) {
                arr[cIdx] = { ...arr[cIdx], ...patch } as ExecutionFile;
                storageCache.set(EXECUTION_FILES_STORAGE_KEY, arr);
            }
        }
    } catch {
        /* ignore */
    }
}

/** دمج آثار قرار المنفذ على ملف التنفيذ — يُعاد للدمج عبر persistExecutionMerge أيضاً */
export function buildPersonalCoerciveExecutionMerge(input: {
    subtype: PersonalCoerciveSubtype;
    resolution: 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    decisionId?: string;
}): Record<string, unknown> {
    const { subtype, resolution } = input;
    const merge: Record<string, unknown> = {};

    if (resolution === 'withdrawn') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = false;
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.investigation_court_withdrawn_at = new Date().toISOString();
                merge.investigationCourtRequested = false;
                merge.investigationMemoIssued = false;
                merge.investigationPathDebtorPresent = false;
                merge.personal_arrest_investigation_session_open = false;
                merge.personal_arrest_warrant_stage = 'none';
                merge.debtor_wanted_arrest_warrant = false;
                merge.debtor_arrest_warrant_cleared_after_custody = false;
                merge.forced_bring_in_personal_outcome = null;
                merge.debtorEvaded = false;
                break;
            default:
                break;
        }
        return merge;
    }

    if (resolution === 'approved' || resolution === 'alternative') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = true;
                merge.travel_ban_withdrawn_at = null;
                break;
            case 'forced_bring_in':
                merge.forcedAttendanceIssued = true;
                merge.activeNoticeState = 'forced_attendance';
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.personal_arrest_warrant_stage = 'pending_court';
                merge.personal_arrest_investigation_session_open = true;
                merge.investigationCourtRequested = true;
                merge.investigation_court_withdrawn_at = null;
                break;
            case 'executive_detention':
            case 'executive_dossier_presentation':
                merge.executive_detention_judge_outcome = null;
                merge.personal_coercive_cycle_closed_at = null;
                merge.executive_dossier_phase = 'handed_to_judge';
                if (String(input.decisionId || '').trim()) {
                    merge.executive_detention_judge_eligible_decision_id = String(input.decisionId).trim();
                }
                break;
            default:
                break;
        }
    } else if (resolution === 'rejected') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = false;
                break;
            case 'forced_bring_in':
                merge.forcedAttendanceIssued = false;
                merge.activeNoticeState = null;
                merge.forced_bring_in_personal_outcome = null;
                merge.forced_bring_in_personal_followup_logged = false;
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.investigationCourtRequested = false;
                merge.personal_arrest_investigation_session_open = false;
                merge.personal_arrest_warrant_stage = 'none';
                merge.debtor_wanted_arrest_warrant = false;
                break;
            case 'executive_detention':
            case 'executive_dossier_presentation':
                merge.executive_detention_judge_outcome = null;
                merge.executive_dossier_phase = null;
                break;
            case 'executive_detention_judge':
                merge.executive_detention_judge_outcome = null;
                merge.executive_detention_judge_decision_id = null;
                merge.executive_detention_judge_eligible_decision_id = null;
                merge.executive_detention_judge_rejection_reason = null;
                merge.executive_dossier_phase = null;
                break;
            default:
                break;
        }
    }

    return merge;
}

export function buildPersonalCoerciveExecutorTimelinePayload(input: {
    resolution: 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    title: string;
    body?: string;
    decisionId: string;
    executorNote?: string;
}): {
    event: Omit<TimelineEvent, 'id'>;
    mergePatch?: Record<string, unknown>;
} {
    const today = getLocalTodayYmd();
    const ts = new Date().toISOString();
    const titleClean = stripPendingLabelsFromExecutorSubject(input.title) || input.title;
    const noteTrim = String(input.executorNote || '').trim();
    const trimmedBody = String(input.body || '').trim();

    let timelineTitle = '';
    let timelineDescription: string | undefined;
    if (input.resolution === 'approved') {
        timelineTitle = `✅ موافقة المنفذ: ${titleClean}`;
        timelineDescription = noteTrim || undefined;
    } else if (input.resolution === 'rejected') {
        timelineTitle = `❌ رفض الطلب: ${titleClean}`;
        timelineDescription = noteTrim || undefined;
    } else if (input.resolution === 'withdrawn') {
        timelineTitle = `↩️ تنازل/سحب الطلب: ${titleClean}`;
        timelineDescription =
            'أُلغي الطلب من جانب المحامي — يمكن إعادة التقديم عند الحاجة وفق المسار.';
    } else {
        timelineTitle = `🔄 قرار بديل: ${titleClean}`;
        timelineDescription = noteTrim || undefined;
    }

    return {
        event: {
            date: today,
            timestamp: ts,
            title: timelineTitle,
            description: timelineDescription,
            type: 'decision',
            source: 'القرارات والطعون',
            metadata: {
                timelineThreadKey: `executor_decision:${input.decisionId}`,
                decisionRowId: input.decisionId,
                originalRequestBody: trimmedBody ? trimmedBody.slice(0, 8000) : undefined,
                executorResolution: input.resolution,
            },
        },
    };
}

/** يُستمع له في ExecutionDashboard لدمج السجل مع persistExecutionMerge */
export function dispatchExecutionTimelineAppend(detail: {
    executionId: string;
    event: Omit<TimelineEvent, 'id'>;
    mergePatch?: Record<string, unknown>;
}): void {
    try {
        window.dispatchEvent(
            new CustomEvent(HAMI_APPEND_EXECUTION_TIMELINE, {
                detail,
            })
        );
    } catch {
        /* ignore */
    }
}

export function applyPersonalCoerciveExecutorOutcome(input: {
    executionId: string | undefined;
    subtype: PersonalCoerciveSubtype;
    resolution: 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    decisionId?: string;
}): Record<string, unknown> {
    const executionId = String(input.executionId || '').trim();
    const merge = buildPersonalCoerciveExecutionMerge({
        subtype: input.subtype,
        resolution: input.resolution,
        decisionId: input.decisionId,
    });
    if (executionId) persistExecutionPatch(executionId, merge);
    return merge;
}

function readDecisionRowMeta(
    executionId: string,
    decisionId: string
): { title: string; body: string; subtype: PersonalCoerciveSubtype | '' } {
    const row = getExecutorDecisionRowById(executionId, decisionId) as
        | {
              title?: string;
              body?: string;
              personalCoerciveSubtype?: string;
          }
        | null;
    return {
        title: String(row?.title || 'طلب للمنفذ').trim(),
        body: String(row?.body || '').trim(),
        subtype: String(row?.personalCoerciveSubtype || '').trim() as PersonalCoerciveSubtype | '',
    };
}

/** موافقة/رفض من الاختصار المدمج — بطاقة القرارات + ملف التنفيذ + السجل الزمني */
export function finalizePersonalCoerciveExecutorDecision(input: {
    executionId: string;
    decisionId: string;
    outcome: 'approved' | 'rejected';
    personalCoerciveSubtype?: string;
    executorNote?: string;
    suppressNavigatorToast?: boolean;
}): boolean {
    const executionId = String(input.executionId || '').trim();
    const decisionId = String(input.decisionId || '').trim();
    if (!executionId || !decisionId) return false;
    const nowIso = new Date().toISOString();
    const outcome = input.outcome;

    const meta = readDecisionRowMeta(executionId, decisionId);
    const subtype = String(input.personalCoerciveSubtype || meta.subtype || '').trim() as PersonalCoerciveSubtype;

    const executorRowPatch: Record<string, unknown> = {
        executorOutcome: outcome,
        status: outcome === 'rejected' ? 'rejected' : 'accepted',
        appealPhase: null,
        appealBaseBranch: outcome === 'rejected' ? 'after_rejection' : 'after_approval',
        resolvedAt: nowIso,
        ...(String(input.executorNote || '').trim()
            ? { executorNote: String(input.executorNote).trim() }
            : {}),
    };
    if (
        (subtype === 'executive_detention' || subtype === 'executive_dossier_presentation') &&
        outcome === 'approved'
    ) {
        executorRowPatch.appealStatus = 'final';
        executorRowPatch.noAppealChosen = true;
        executorRowPatch.executorDetentionHandedToJudge = true;
        executorRowPatch.dossierPresentationClosed = true;
    } else {
        executorRowPatch.appealStatus = 'pending';
    }
    const patched = patchExecutorDecisionRowReliable(executionId, decisionId, executorRowPatch);
    if (!patched.ok) return false;
    const storageExecutionId =
        String(patched.storageExecutionId || executionId).trim() ||
        String(resolveExecutorDecisionRowContext(executionId, decisionId)?.storageExecutionId || executionId).trim() ||
        executionId;

    if (!subtype) return true;

    const mergePatch = applyPersonalCoerciveExecutorOutcome({
        executionId: storageExecutionId,
        subtype,
        resolution: outcome,
        decisionId,
    });

    const rowMeta = readDecisionRowMeta(storageExecutionId, decisionId);
    const { event } = buildPersonalCoerciveExecutorTimelinePayload({
        resolution: outcome,
        title: rowMeta.title || meta.title,
        body: rowMeta.body || meta.body,
        decisionId,
        executorNote: input.executorNote,
    });
    dispatchExecutionTimelineAppend({
        executionId: storageExecutionId,
        event,
        mergePatch,
    });

    if (subtype === 'travel_ban' && outcome === 'approved') {
        const row = getExecutorDecisionRowById(storageExecutionId, decisionId) as
            | { personalCoerciveDebtorKey?: string }
            | null;
        const debtorKey = String(row?.personalCoerciveDebtorKey || '').trim();
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: storageExecutionId,
            subtype: 'travel_ban',
            debtorKey: debtorKey || undefined,
        });
    }

    dispatchPersonalCoerciveOutcomeEvent({
        executionId: storageExecutionId,
        decisionId,
        outcome,
        subtype,
        suppressNavigatorToast: input.suppressNavigatorToast,
    });
    return true;
}

/** تنازل/سحب — يحدّث البطاقة نفسها ولا يستبدلها */
export function syncPersonalCoerciveWithdrawn(input: {
    executionId: string;
    decisionId: string;
    subtype: PersonalCoerciveSubtype;
    extraMerge?: Record<string, unknown>;
}): void {
    const executionId = String(input.executionId || '').trim();
    const decisionId = String(input.decisionId || '').trim();
    if (!executionId || !decisionId) return;
    const now = new Date().toISOString();

    patchExecutorDecisionRow(executionId, decisionId, {
        lawyerWithdrawn: true,
        executorOutcome: 'withdrawn',
        personalCoerciveWithdrawnAt: now,
        appealStatus: 'final',
        appealPhase: null,
    });

    const meta = readDecisionRowMeta(executionId, decisionId);
    const baseMerge = buildPersonalCoerciveExecutionMerge({
        subtype: input.subtype,
        resolution: 'withdrawn',
    });
    const mergePatch = { ...baseMerge, ...(input.extraMerge || {}) };
    persistExecutionPatch(executionId, mergePatch);

    const { event } = buildPersonalCoerciveExecutorTimelinePayload({
        resolution: 'withdrawn',
        title: meta.title,
        body: meta.body,
        decisionId,
    });
    dispatchExecutionTimelineAppend({
        executionId,
        event,
        mergePatch,
    });

    dispatchPersonalCoerciveOutcomeEvent({
        executionId,
        decisionId,
        outcome: 'withdrawn',
        subtype: input.subtype,
    });
}

export function dispatchPersonalCoerciveOutcomeEvent(input: {
    executionId: string;
    decisionId: string;
    outcome: 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    subtype?: PersonalCoerciveSubtype;
    suppressNavigatorToast?: boolean;
}): void {
    try {
        window.dispatchEvent(
            new CustomEvent('hami-execution-decision-outcome', {
                detail: {
                    executionId: input.executionId,
                    decisionId: input.decisionId,
                    requestKind: 'personal_coercive',
                    outcome: input.outcome,
                    personalCoerciveSubtype: input.subtype,
                    suppressNavigatorToast: input.suppressNavigatorToast === true,
                },
            })
        );
    } catch {
        /* ignore */
    }
}

export function isPersonalCoerciveDecisionWithdrawn(row: Record<string, unknown> | null | undefined): boolean {
    if (!row) return false;
    if ((row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) return true;
    return String((row as { executorOutcome?: string }).executorOutcome || '') === 'withdrawn';
}
