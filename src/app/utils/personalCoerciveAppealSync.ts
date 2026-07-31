/**
 * مصدر واحد لمزامنة محضر المتابعة الجبري مع مركز القرارات والطعون.
 * يقرأ حالة البطاقة الحاكمة: نفاذ / توقف / استمرار / إنهاء الدورة.
 */
import {
    isExecutorRequestAppealCycleSupersededFromRecord,
    type CreditorRequestAppealGate,
    type ExecutorRequestFollowupBlock,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { resolveExecutorRequestAppealSyncFromRow } from '@/app/utils/executorRequestAppealSync';
import {
    buildPersonalCoerciveExecutionMerge,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import {
    buildPersonalCoerciveStaleExecutionPatch,
    resolveExecutiveDetentionJudgeUiOutcome,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import {
    getGoverningDossierPresentationRowFromDecisions,
    getPersonalCoerciveSubtypeAppealRowFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isExecutorHubRowInactiveForGoverning,
    isExecutorHubRowSuperseded,
    resolvePersonalCoerciveDecisionsNav,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { syncPersonalCoerciveAppealClosureIfNeeded } from '@/app/utils/syncPersonalCoerciveAppealClosure';

/** أنواع محضر المتابعة المرتبطة ببوابة الطعن */
export type PersonalCoerciveAppealSyncSubtype =
    | 'forced_bring_in'
    | 'travel_ban'
    | 'arrest_warrant_investigation'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge';

export const PERSONAL_COERCIVE_APPEAL_SYNC_SUBTYPES: readonly PersonalCoerciveAppealSyncSubtype[] = [
    'forced_bring_in',
    'travel_ban',
    'arrest_warrant_investigation',
    'executive_dossier_presentation',
    'executive_detention_judge',
] as const;

export type PersonalCoerciveAppealSyncView = {
    subtype: PersonalCoerciveAppealSyncSubtype;
    governingRow: Record<string, unknown> | null;
    decisionId: string | null;
    gate: CreditorRequestAppealGate;
    followupBlock: ExecutorRequestFollowupBlock | null;
    /** أي حالة غير «استمرار» — يوقف التنفيذ الميداني */
    blocked: boolean;
    blocksFieldwork: boolean;
    /** إيقاف مؤقت (تظلم/طعن جارٍ) — يمنع طلباً جديداً */
    blocksSubmit: boolean;
    /** أُعيدت دورة الطلب — يُسمح بإعادة الإرسال بعد الإغلاق */
    cycleSuperseded: boolean;
    enforced: boolean;
    pillLabel: string;
    decisionsNav: { decisionsTab: 'current' | 'previous'; decisionId?: string };
};

export type PersonalCoerciveAppealSyncInput = {
    executionId: string | undefined;
    subtype: PersonalCoerciveAppealSyncSubtype;
    allDecisions: Record<string, unknown>[];
    executionData?: Record<string, unknown> | null;
    debtorKey?: string;
    primaryDebtorKey?: string;
};

function rowId(row: Record<string, unknown> | null | undefined): string | null {
    const id = String((row as { id?: string } | null)?.id ?? '').trim();
    return id || null;
}

/** بعد «لا حاجة للطعن» أو إغلاق الدورة — لا تُعرض متابعة الرفض في المحضر */
export function isExecutorRejectedAppealFollowupDismissed(
    decisionId: string | null | undefined,
    allDecisions: Record<string, unknown>[]
): boolean {
    const did = String(decisionId ?? '').trim();
    if (!did) return false;
    const row = allDecisions.find((r) => String((r as { id?: string }).id ?? '').trim() === did);
    if (!row || typeof row !== 'object') return false;
    if (isExecutorHubRowSuperseded(row)) return true;
    return isExecutorRequestAppealCycleSupersededFromRecord(row, allDecisions);
}

/** البطاقة الحاكمة لنوع الطلب — بما فيها قرار القاضي المستقل */
export function getGoverningPersonalCoerciveAppealRow(
    input: PersonalCoerciveAppealSyncInput
): Record<string, unknown> | null {
    const exId = String(input.executionId ?? '').trim();
    if (!exId) return null;
    const scope = { debtorKey: input.debtorKey, primaryDebtorKey: input.primaryDebtorKey };
    const ed = input.executionData;

    if (input.subtype === 'executive_dossier_presentation') {
        return getGoverningDossierPresentationRowFromDecisions(input.allDecisions, scope);
    }

    if (input.subtype === 'travel_ban') {
        return getPersonalCoerciveSubtypeAppealRowFromDecisions(
            input.allDecisions,
            'travel_ban',
            scope
        );
    }

    if (input.subtype === 'executive_detention_judge') {
        const byId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
        if (byId) {
            const hit = input.allDecisions.find(
                (r) => String((r as { id?: string }).id ?? '').trim() === byId
            );
            if (hit && !isExecutorHubRowSuperseded(hit as Record<string, unknown>)) {
                return hit as Record<string, unknown>;
            }
        }
        const dossierParentId = String(
            (getGoverningDossierPresentationRowFromDecisions(input.allDecisions, scope) as {
                id?: string;
            } | null)?.id ?? ''
        ).trim();
        const parentId = String(
            ed?.executive_detention_judge_eligible_decision_id ?? dossierParentId
        ).trim();
        if (!parentId) return null;
        return (
            (input.allDecisions.find(
                (r) =>
                    String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ?? '') ===
                        'executive_detention_judge' &&
                    String(
                        (r as { parentExecutorDecisionId?: string }).parentExecutorDecisionId ?? ''
                    ).trim() === parentId &&
                    !isExecutorHubRowSuperseded(r as Record<string, unknown>)
            ) as Record<string, unknown> | undefined) ?? null
        );
    }

    return getGoverningPersonalCoerciveSubtypeRowFromDecisions(
        input.allDecisions,
        input.subtype as PersonalCoerciveSubtype,
        scope
    );
}

const EMPTY_CONTINUE: CreditorRequestAppealGate = { kind: 'continue' };

/** يفسّر حالة الطعن/النفاذ لنوع واحد — نفس منطق بطاقة القرارات */
export function resolvePersonalCoerciveAppealSync(
    input: PersonalCoerciveAppealSyncInput
): PersonalCoerciveAppealSyncView {
    const subtype = input.subtype;
    const governingRow = getGoverningPersonalCoerciveAppealRow(input);
    const decisionId = rowId(governingRow);
    const exId = String(input.executionId ?? '').trim();
    const scope = { debtorKey: input.debtorKey, primaryDebtorKey: input.primaryDebtorKey };

    if (!governingRow) {
        if (input.subtype === 'executive_detention_judge') {
            const byId = String(input.executionData?.executive_detention_judge_decision_id ?? '').trim();
            if (byId) {
                const sealed = input.allDecisions.find(
                    (r) => String((r as { id?: string }).id ?? '').trim() === byId
                );
                if (
                    sealed &&
                    isExecutorRejectedAppealFollowupDismissed(byId, input.allDecisions)
                ) {
                    return {
                        subtype,
                        governingRow: sealed,
                        decisionId: byId,
                        gate: EMPTY_CONTINUE,
                        followupBlock: null,
                        blocked: false,
                        blocksFieldwork: false,
                        blocksSubmit: false,
                        cycleSuperseded: true,
                        enforced: false,
                        pillLabel: '',
                        decisionsNav: { decisionsTab: 'previous', decisionId: byId },
                    };
                }
            }
        }
        return {
            subtype,
            governingRow: null,
            decisionId: null,
            gate: EMPTY_CONTINUE,
            followupBlock: null,
            blocked: false,
            blocksFieldwork: false,
            blocksSubmit: false,
            cycleSuperseded: false,
            enforced: false,
            pillLabel: '',
            decisionsNav: { decisionsTab: 'current' },
        };
    }

    const core = resolveExecutorRequestAppealSyncFromRow(governingRow, input.allDecisions);
    const {
        gate,
        followupBlock,
        blocked,
        blocksFieldwork,
        blocksSubmit,
        cycleSuperseded,
        enforced,
        pillLabel,
    } = core;
    const decisionsNav = exId
        ? resolvePersonalCoerciveDecisionsNav(
              exId,
              subtype === 'executive_dossier_presentation'
                  ? 'executive_dossier_presentation'
                  : (subtype as PersonalCoerciveSubtype),
              scope
          )
        : { decisionsTab: 'current' as const };

    return {
        subtype,
        governingRow,
        decisionId,
        gate,
        followupBlock,
        blocked,
        blocksFieldwork,
        blocksSubmit,
        cycleSuperseded,
        enforced,
        pillLabel,
        decisionsNav,
    };
}

/** كل أنواع المحضر في استدعاء واحد */
export function resolveAllPersonalCoerciveAppealSync(
    input: Omit<PersonalCoerciveAppealSyncInput, 'subtype'>
): Record<PersonalCoerciveAppealSyncSubtype, PersonalCoerciveAppealSyncView> {
    const base = {
        executionId: input.executionId,
        allDecisions: input.allDecisions,
        executionData: input.executionData,
        debtorKey: input.debtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    };
    return {
        forced_bring_in: resolvePersonalCoerciveAppealSync({ ...base, subtype: 'forced_bring_in' }),
        travel_ban: resolvePersonalCoerciveAppealSync({ ...base, subtype: 'travel_ban' }),
        arrest_warrant_investigation: resolvePersonalCoerciveAppealSync({
            ...base,
            subtype: 'arrest_warrant_investigation',
        }),
        executive_dossier_presentation: resolvePersonalCoerciveAppealSync({
            ...base,
            subtype: 'executive_dossier_presentation',
        }),
        executive_detention_judge: resolvePersonalCoerciveAppealSync({
            ...base,
            subtype: 'executive_detention_judge',
        }),
    };
}

/**
 * يصفّر أعلام ملف التنفيذ العالقة ويزامن نتائج الطعن مع الحقول المخزّنة.
 */
export function buildPersonalCoerciveAppealExecutionSyncPatch(input: {
    executionId: string;
    executionData: Record<string, unknown> | null | undefined;
    allDecisions: Record<string, unknown>[];
    debtorKey?: string;
    primaryDebtorKey?: string;
}): Record<string, unknown> | null {
    const exId = String(input.executionId || '').trim();
    if (!exId) return null;
    const ed = input.executionData;
    let patch: Record<string, unknown> = {
        ...(buildPersonalCoerciveStaleExecutionPatch({
            executionId: exId,
            executionData: ed,
            debtorKey: input.debtorKey,
            primaryDebtorKey: input.primaryDebtorKey,
        }) ?? {}),
    };

    const syncBase = {
        executionId: exId,
        allDecisions: input.allDecisions,
        executionData: ed,
        debtorKey: input.debtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    };

    for (const subtype of [
        'forced_bring_in',
        'travel_ban',
        'arrest_warrant_investigation',
        'executive_dossier_presentation',
    ] as const) {
        const sync = resolvePersonalCoerciveAppealSync({ ...syncBase, subtype });
        if (sync.cycleSuperseded && !sync.enforced) {
            const merge = buildPersonalCoerciveExecutionMerge({
                subtype,
                resolution: 'rejected',
            });
            patch = { ...patch, ...merge };
        }
    }

    const judgeRow = getGoverningPersonalCoerciveAppealRow({
        ...syncBase,
        subtype: 'executive_detention_judge',
    });
    if (judgeRow) {
        const stored =
            (ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null;
        const effective = resolveExecutiveDetentionJudgeUiOutcome({
            storedOutcome: stored,
            judgeRow,
        });
        const dossierPhase = String(ed?.executive_dossier_phase ?? '').trim();
        const judgeLaneOpen =
            dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active' ||
            stored != null ||
            Boolean(String(ed?.executive_detention_judge_decision_id ?? '').trim());
        if (effective && effective !== stored && judgeLaneOpen) {
            patch = {
                ...patch,
                executive_detention_judge_outcome: effective,
                executive_dossier_phase: 'judge_decided',
                ...(effective === 'approved' ? { executive_detention_judge_rejection_reason: null } : {}),
            };
        }
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

/** واجهة موحّدة لإغلاق الدورة بعد الطعن — تُستدعى من مركز القرارات */
export function applyPersonalCoerciveAppealClosure(input: {
    executionId: string | undefined;
    row: Record<string, unknown> | null | undefined;
    allDecisions?: Record<string, unknown>[];
    primaryDebtorKey?: string;
    forceClose?: boolean;
}): void {
    syncPersonalCoerciveAppealClosureIfNeeded(input);
}

/** هل الصف نشط ويحكم الواجهة */
export function isPersonalCoerciveAppealRowActive(
    row: Record<string, unknown> | null | undefined,
    allDecisions: Record<string, unknown>[]
): boolean {
    if (!row || typeof row !== 'object') return false;
    if (isExecutorHubRowSuperseded(row)) return false;
    return !isExecutorHubRowInactiveForGoverning(row, allDecisions);
}
