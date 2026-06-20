// @ts-nocheck
import {
    appealPipelineRowForCard,
    hubWithInferredAppealOrigin,
    isExecutorRequestAppealCycleSupersededFromRecord,
    resolveCreditorDecisionEnforcementState,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    buildPersonalCoerciveExecutionMerge,
    persistExecutionPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import {
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';

/** بعد اكتمال الطعن — إغلاق دورة التنفيذ الجبري في الطابور وملف التنفيذ إن لم يعد القرار نافذاً */
export function syncPersonalCoerciveAppealClosureIfNeeded(input: {
    executionId: string | undefined;
    row: Record<string, unknown> | null | undefined;
    allDecisions?: Record<string, unknown>[];
    primaryDebtorKey?: string;
    /** أرشفة يدوية — أغلق الدورة حتى دون طعن نهائي */
    forceClose?: boolean;
}): void {
    const executionId = String(input.executionId ?? '').trim();
    const row = input.row;
    if (!executionId || !row || typeof row !== 'object') return;
    if (String(row.requestKind || '') !== 'personal_coercive') return;

    const subtype = String(row.personalCoerciveSubtype || '').trim() as PersonalCoerciveSubtype;
    if (!subtype) return;

    const all = input.allDecisions ?? [];
    if (
        !input.forceClose &&
        !isExecutorRequestAppealCycleSupersededFromRecord(row, all)
    ) {
        return;
    }

    const debtorKey = String(
        (row as { personalCoerciveDebtorKey?: string }).personalCoerciveDebtorKey || ''
    ).trim();

    closePersonalCoerciveSubtypeDecisionCycle({
        executionId,
        subtype,
        debtorKey: debtorKey || undefined,
    });

    if (
        subtype === 'executive_dossier_presentation' ||
        subtype === 'executive_detention' ||
        subtype === 'executive_detention_judge'
    ) {
        archiveExecutiveDetentionCycleDecisions({
            executionId,
            debtorKey: debtorKey || undefined,
            primaryDebtorKey: input.primaryDebtorKey,
        });
    }

    const hub = hubWithInferredAppealOrigin(row as Decision);
    const pipe = appealPipelineRowForCard(hub, all as Decision[]);
    const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab: 'previous',
        appealLegallyFinal: true,
        needsExecutor: false,
    });
    if (state.enforced) return;

    const mergePatch = buildPersonalCoerciveExecutionMerge({
        subtype,
        resolution: 'rejected',
    });
    persistExecutionPatch(executionId, mergePatch);
}
