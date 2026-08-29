import {
    getGoverningDossierPresentationRowFromDecisions,
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorDecisionRowEffectivelyEnforced } from '@/app/components/lawyer/ExecutionDashboard/utils/executorRequestEnforceability';

/** إغلاق دورة التنفيذ الجبري (إخلاء سبيل) — تُخفى شارات الطلبات من القرارات */
export function isPersonalCoerciveCycleClosed(
    ed: { personal_coercive_cycle_closed_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.personal_coercive_cycle_closed_at ?? '').trim());
}

/** إعادة دورة عرض الإضبارة/الحبس إلى البداية بعد إخلاء السبيل */
export function buildExecutiveDetentionReleasePatch(nowIso?: string): Record<string, unknown> {
    const now = nowIso ?? new Date().toISOString();
    return {
        executive_detention_released_or_closed_at: now,
        debtor_executive_detention_active: false,
        executive_detention_until: null,
        executive_detention_days_total: null,
        executive_detention_reminder_sent: false,
        executive_detention_judge_outcome: null,
        executive_detention_judge_eligible_decision_id: null,
        executive_detention_judge_decision_id: null,
        executive_detention_judge_rejection_reason: null,
        executive_dossier_phase: null,
        executive_detention_request_in_absentia: false,
        personal_coercive_cycle_closed_at: null,
    };
}

/** إغلاق مسار الإضبارة/الحبس بعد رفض القاضي — يعود طلب العرض للتفعيل اليدوي */
export function buildExecutiveDetentionJudgeRejectedClosurePatch(
    nowIso: string,
    rejectionReason: string,
    judgeDecisionId: string,
): Record<string, unknown> {
    const reason = String(rejectionReason ?? '').trim();
    return {
        executive_detention_released_or_closed_at: nowIso,
        debtor_executive_detention_active: false,
        executive_detention_until: null,
        executive_detention_days_total: null,
        executive_detention_reminder_sent: false,
        executive_dossier_phase: null,
        executive_detention_request_in_absentia: false,
        personal_coercive_cycle_closed_at: null,
        executive_detention_judge_decision_id: judgeDecisionId,
        executive_detention_judge_outcome: 'rejected',
        executive_detention_judge_eligible_decision_id: null,
        executive_detention_judge_rejection_reason: reason || null,
        executive_detention_release_reason: reason ? `رفض قاضي البداءة: ${reason}` : 'رفض قاضي البداءة',
    };
}

/** انتهاء/إغلاق مسار الحبس دون دورة كاملة (مثلاً انتهاء المدة) */
export function isExecutiveDetentionBadgeSuppressed(
    ed:
        | {
              personal_coercive_cycle_closed_at?: string | null;
              executive_detention_released_or_closed_at?: string | null;
          }
        | null
        | undefined
): boolean {
    if (isPersonalCoerciveCycleClosed(ed)) return true;
    return Boolean(String(ed?.executive_detention_released_or_closed_at ?? '').trim());
}

/** نتيجة قرار القاضي الفعلية — تتزامن مع نقض التمييز لرفض الحبس */
export function resolveExecutiveDetentionJudgeUiOutcome(input: {
    storedOutcome?: 'approved' | 'rejected' | null;
    judgeRow?: Record<string, unknown> | null;
}): 'approved' | 'rejected' | null {
    const row = input.judgeRow;
    if (row && typeof row === 'object') {
        if (isExecutorRowEffectivelyApproved(row)) return 'approved';
        if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
        const raw = String(
            (row as { executiveDetentionJudgeOutcome?: string }).executiveDetentionJudgeOutcome ||
                (row as { executorOutcome?: string }).executorOutcome ||
                ''
        ).trim();
        if (raw === 'approved' || raw === 'rejected') return raw;
    }
    return input.storedOutcome ?? null;
}

/** حبس تنفيذي فعّال — يُخفى الشارة بعد انتهاء المدة أو إخلاء السبيل */
export function isExecutiveDetentionPeriodActive(
    ed: { debtor_executive_detention_active?: boolean; executive_detention_until?: string | null } | null | undefined
): boolean {
    if (ed?.debtor_executive_detention_active !== true) return false;
    const until = String(ed?.executive_detention_until ?? '').trim();
    if (!until) return true;
    const end = new Date(`${until}T23:59:59`);
    if (Number.isNaN(end.getTime())) return true;
    return Date.now() <= end.getTime();
}

/** نتيجة قاضي البداءة الفعلية — من الملف أو صف القرار (بما فيه نقض التمييز) */
export function resolveExecutiveDetentionEffectiveJudgeOutcome(input: {
    executionData:
        | {
              executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
              executive_detention_judge_decision_id?: string | null;
          }
        | null
        | undefined;
    decisionsExecutionId?: string;
}): 'approved' | 'rejected' | null {
    const ed = input.executionData;
    const stored = (ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null;
    const exId = String(input.decisionsExecutionId ?? '').trim();
    if (!exId) return stored;

    const judgeId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
    const rows = readExecutorDecisionsArray(exId);
    let judgeRow: Record<string, unknown> | undefined;
    if (judgeId) {
        judgeRow = rows.find(
            (r) => String((r as { id?: string }).id ?? '').trim() === judgeId
        ) as Record<string, unknown> | undefined;
    }
    if (!judgeRow) {
        judgeRow = rows.find(
            (r) =>
                String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ?? '') ===
                    'executive_detention_judge' &&
                !isExecutorHubRowSuperseded(r as Record<string, unknown>)
        ) as Record<string, unknown> | undefined;
    }
    return resolveExecutiveDetentionJudgeUiOutcome({ storedOutcome: stored, judgeRow });
}

/** مسار حبس نافذ — بعد موافقة/اعتبار قاضي البداءة فقط (لا عند تسليم الإضبارة وحدها) */
export function isExecutiveDetentionPathEnforceable(
    ed:
        | {
              executive_dossier_phase?: string | null;
              debtor_executive_detention_active?: boolean;
              executive_detention_until?: string | null;
              executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
          }
        | null
        | undefined,
    detentionSuppressed: boolean,
    effectiveJudgeOutcome?: 'approved' | 'rejected' | null,
    opts?: {
        judgeDecisionRow?: Record<string, unknown> | null;
        allDecisions?: Record<string, unknown>[];
    }
): boolean {
    if (detentionSuppressed) return false;
    const judgeOutcome =
        effectiveJudgeOutcome ??
        ((ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null);
    if (judgeOutcome === 'rejected') return false;

    const pathOpen =
        isExecutiveDetentionPeriodActive(ed) || judgeOutcome === 'approved';
    if (!pathOpen) return false;

    const row = opts?.judgeDecisionRow;
    const all = opts?.allDecisions;
    if (row && Array.isArray(all) && all.length > 0) {
        return isExecutorDecisionRowEffectivelyEnforced(row, all);
    }
    return true;
}

export function resolveExecutiveDetentionJudgeGoverningRow(
    allDecisions: Record<string, unknown>[],
    ed: {
        executive_detention_judge_decision_id?: string | null;
        executive_detention_judge_eligible_decision_id?: string | null;
    } | null | undefined,
    scope: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const byId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
    if (byId) {
        const hit = allDecisions.find(
            (r) => String((r as { id?: string }).id ?? '').trim() === byId
        );
        if (hit && !isExecutorHubRowSuperseded(hit)) return hit;
    }
    const dossierParentId = String(
        (
            getGoverningDossierPresentationRowFromDecisions(allDecisions, scope) as {
                id?: string;
            } | null
        )?.id ?? ''
    ).trim();
    const parentId = String(ed?.executive_detention_judge_eligible_decision_id ?? dossierParentId).trim();
    if (!parentId) return null;
    return (
        allDecisions.find(
            (r) =>
                String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ?? '') ===
                    'executive_detention_judge' &&
                String(
                    (r as { parentExecutorDecisionId?: string }).parentExecutorDecisionId ?? ''
                ).trim() === parentId &&
                !isExecutorHubRowSuperseded(r)
        ) ?? null
    );
}
