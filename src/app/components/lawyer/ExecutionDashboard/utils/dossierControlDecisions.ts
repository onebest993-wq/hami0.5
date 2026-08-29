import type { DossierActionType } from '../components/DossierActionTypes';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveExecutorRequestFollowupBlockFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';

const SETTLED_TIMELINE_SNIPPET_BY_TITLE: Record<string, string> = {
    'طلب توحيد الأضابير': 'تم توحيد',
    'طلب نقل الإضبارة': 'تم نقل',
    'طلب تجديد الإضبارة': 'تم تجديد',
    'طلب مخاطبة مديرية الانابة': 'تم إرسال مخاطبة',
    'طلب الإنابة التنفيذية': 'تم تفعيل الإنابة',
};

function inferDossierControlAppliedFromTimeline(
    parentExecutionId: string,
    decisionRowId: string,
    title: string
): boolean {
    const pid = String(parentExecutionId || '').trim();
    const did = String(decisionRowId || '').trim();
    const snippet = SETTLED_TIMELINE_SNIPPET_BY_TITLE[String(title || '').trim()];
    if (!pid || !did || !snippet) return false;
    try {
        const all = loadExecutionFilesRaw() as { id?: string; timelineEvents?: unknown[] }[];
        const file = all.find((f) => String(f?.id || '').trim() === pid);
        const events = Array.isArray(file?.timelineEvents) ? file.timelineEvents : [];
        return events.some((raw) => {
            const e = raw as {
                title?: string;
                metadata?: { decisionRowId?: string };
            };
            if (String(e?.metadata?.decisionRowId || '').trim() !== did) return false;
            return String(e?.title || '').includes(snippet);
        });
    } catch {
        return false;
    }
}

/** اكتملت دورة الطلب — تُخفى مرآة الموافقة ويُفتح مسار طلب جديد */
export function isDossierControlDecisionSettled(
    row: Record<string, unknown> | null | undefined,
    opts?: {
        parentExecutionId?: string;
        allDecisions?: Record<string, unknown>[];
        appealPerspective?: AppealUiPerspective;
    }
): boolean {
    if (!row) return false;
    if (String((row as { specialFollowupAppliedAt?: string }).specialFollowupAppliedAt || '').trim()) {
        return true;
    }
    if (!isExecutorRowEffectivelyApproved(row)) return false;

    const id = String((row as { id?: string }).id || '').trim();
    const title = String((row as { title?: string }).title || '').trim();
    const parentId = String(opts?.parentExecutionId || '').trim();
    if (parentId && id && inferDossierControlAppliedFromTimeline(parentId, id, title)) {
        return true;
    }

    if (isExecutorRowRejectedAndFinal(row)) {
        return false;
    }

    if (isExecutorRowEffectivelyApproved(row)) {
        const all = opts?.allDecisions;
        if (Array.isArray(all) && all.length > 0) {
            const followup = resolveExecutorRequestFollowupBlockFromRecord(
                row,
                all,
                opts?.appealPerspective ?? 'creditor_agent'
            );
            if (followup) return false;
        }
        return false;
    }

    return false;
}

export type DossierControlWorkflowPhase =
    | 'idle'
    | 'pending_executor'
    | 'approved_pending_apply'
    | 'rejected'
    | 'completed';

/** مرحلة الإجراء الحالية — لعرض «أين توقف الطلب» داخل بطاقة التحكم */
export function resolveDossierControlWorkflowPhase(
    row: Record<string, unknown> | null | undefined,
    opts?: {
        parentExecutionId?: string;
        allDecisions?: Record<string, unknown>[];
        appealPerspective?: AppealUiPerspective;
    }
): DossierControlWorkflowPhase {
    if (!row) return 'idle';
    if (
        isDossierControlDecisionSettled(row, {
            parentExecutionId: opts?.parentExecutionId,
            allDecisions: opts?.allDecisions,
            appealPerspective: opts?.appealPerspective,
        })
    ) {
        return 'completed';
    }
    if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
    const pending =
        String((row as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((row as { executorOutcome?: string }).executorOutcome ?? '') === '';
    if (pending) return 'pending_executor';
    if (isExecutorRowEffectivelyApproved(row)) return 'approved_pending_apply';
    return 'idle';
}

export function resolveDossierControlWorkflowLabels(phase: DossierControlWorkflowPhase): {
    sent: string;
    executor: string;
    applied: string;
} {
    switch (phase) {
        case 'pending_executor':
            return {
                sent: 'تم الإرسال',
                executor: 'بانتظار قرار المنفذ',
                applied: 'تطبيق الآثار',
            };
        case 'approved_pending_apply':
            return {
                sent: 'تم الإرسال',
                executor: 'موافق — تطبيق الآثار',
                applied: 'جاري الإكمال',
            };
        case 'rejected':
            return {
                sent: 'تم الإرسال',
                executor: 'مرفوض',
                applied: '—',
            };
        case 'completed':
            return {
                sent: 'تم الإرسال',
                executor: 'موافق',
                applied: 'مكتمل',
            };
        default:
            return {
                sent: 'إرسال الطلب',
                executor: 'قرار المنفذ',
                applied: 'تطبيق الآثار',
            };
    }
}

const DOSSIER_ACTION_DECISION_TITLES: Record<DossierActionType, string> = {
    delegation: 'طلب الإنابة التنفيذية',
    unify: 'طلب توحيد الأضابير',
    transfer: 'طلب نقل الإضبارة',
    renew: 'طلب تجديد الإضبارة',
    inaba_correspondence: 'طلب مخاطبة مديرية الانابة',
};

export function findDossierControlDecisionRow(
    decisions: Record<string, unknown>[],
    actionType: DossierActionType,
    opts?: { parentExecutionId?: string; appealPerspective?: AppealUiPerspective }
): Record<string, unknown> | null {
    const title = DOSSIER_ACTION_DECISION_TITLES[actionType];
    const all = Array.isArray(decisions) ? decisions : [];
    const settleOpts = {
        parentExecutionId: opts?.parentExecutionId,
        allDecisions: all,
        appealPerspective: opts?.appealPerspective ?? 'creditor_agent',
    };
    const matches = all
        .filter((r) => {
            if (String(r?.requestKind || '') !== 'special_followup') return false;
            return String(r?.title || '').trim() === title;
        })
        .filter((r) => !isDossierControlDecisionSettled(r, settleOpts));
    if (!matches.length) return null;
    const sorted = [...matches].sort((a, b) => {
        const da = String(a?.resolvedAt ?? a?.date ?? '');
        const db = String(b?.resolvedAt ?? b?.date ?? '');
        return db.localeCompare(da, undefined, { numeric: true });
    });
    const pending = sorted.find((r) => {
        const o = String(r?.executorOutcome ?? 'pending');
        return o === 'pending' || o === '';
    });
    if (pending) return pending;
    const rejected = sorted.find((r) => isExecutorRowRejectedAndFinal(r));
    if (rejected) return rejected;
    const approved = sorted.find((r) => isExecutorRowEffectivelyApproved(r));
    return approved || sorted[0] || null;
}

export function shouldShowDossierControlExecutorStrip(input: {
    executionId: string | undefined;
    parentExecutionId?: string;
    actionType: DossierActionType;
    decisions: Record<string, unknown>[];
    appealPerspective?: AppealUiPerspective;
}): boolean {
    const exId = String(input.executionId || '').trim();
    const parentId = String(input.parentExecutionId || input.executionId || '').trim();
    const appealPerspective = input.appealPerspective ?? 'creditor_agent';
    const decisions = Array.isArray(input.decisions) ? input.decisions : [];
    const row = findDossierControlDecisionRow(decisions, input.actionType, {
        parentExecutionId: parentId,
        appealPerspective,
    });
    if (!row || !exId) return false;
    const followupBlock = resolveExecutorRequestFollowupBlockFromRecord(
        row,
        decisions,
        appealPerspective
    );
    if (
        isDossierControlDecisionSettled(row, {
            parentExecutionId: parentId,
            allDecisions: decisions,
            appealPerspective,
        }) &&
        !followupBlock
    ) {
        return false;
    }
    if (isExecutorRowRejectedAndFinal(row) && isExecutorHubRowSuperseded(row)) return false;
    return true;
}

/** إظهار اختصار قرار المنفذ لطلب special_followup — محضر الطلبات وسجل الطرف الآخر */
export function shouldShowSpecialFollowupExecutorStrip(
    row: Record<string, unknown> | null | undefined,
    opts: {
        allDecisions: Record<string, unknown>[];
        appealPerspective?: AppealUiPerspective;
        parentExecutionId?: string;
    }
): boolean {
    if (!row) return false;
    if (isExecutorHubRowSuperseded(row)) return false;
    const decisions = Array.isArray(opts.allDecisions) ? opts.allDecisions : [];
    const appealPerspective = opts.appealPerspective ?? 'creditor_agent';
    const parentId = String(opts.parentExecutionId || '').trim();
    const title = String((row as { title?: string }).title || '').trim();
    const dossierActionEntry = Object.entries(DOSSIER_ACTION_DECISION_TITLES).find(
        ([, t]) => t === title
    );
    if (dossierActionEntry) {
        return shouldShowDossierControlExecutorStrip({
            executionId: parentId || 'local',
            parentExecutionId: parentId || undefined,
            actionType: dossierActionEntry[0] as DossierActionType,
            decisions,
            appealPerspective,
        });
    }
    const pending =
        String((row as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((row as { executorOutcome?: string }).executorOutcome ?? '') === '';
    if (pending) return true;
    if (isExecutorRowRejectedAndFinal(row)) return true;
    const followupBlock = resolveExecutorRequestFollowupBlockFromRecord(
        row,
        decisions,
        appealPerspective
    );
    if (followupBlock) return true;
    if (
        isExecutorRowEffectivelyApproved(row) &&
        appealPerspective === 'debtor_agent' &&
        isCreditorInitiatedExecutorRequest(hubWithInferredAppealOrigin(row as unknown as Decision))
    ) {
        return true;
    }
    return false;
}

export function resolveSpecialFollowupStatusLabel(
    row: Record<string, unknown> | null | undefined,
    appealPerspective: AppealUiPerspective = 'creditor_agent'
): string {
    if (!row) return 'آخر طلب مُرسل — اضغط لمتابعة قرار المنفذ';
    const rejected = isExecutorRowRejectedAndFinal(row);
    const pending =
        String((row as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((row as { executorOutcome?: string }).executorOutcome ?? '') === '';
    const approved = !rejected && !pending && isExecutorRowEffectivelyApproved(row);
    if (pending) return 'قرار المنفذ — قيد البت';
    if (rejected) return 'مرفوض — متابعة قرار المنفذ';
    if (approved) {
        if (
            appealPerspective === 'debtor_agent' &&
            isCreditorInitiatedExecutorRequest(hubWithInferredAppealOrigin(row as unknown as Decision))
        ) {
            return 'موافقة ضد موكّلك — متابعة المسار';
        }
        return 'موافق — متابعة المسار';
    }
    return 'آخر طلب مُرسل — اضغط لمتابعة قرار المنفذ';
}
