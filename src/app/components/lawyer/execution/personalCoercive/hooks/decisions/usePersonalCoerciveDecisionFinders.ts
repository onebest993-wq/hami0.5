import React, { useCallback } from 'react';
import {
    appendPersonalCoerciveExecutorRequest,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { usePersonalCoerciveDecisionRowsStates } from './usePersonalCoerciveDecisionRowsStates';

import type { PersonalCoerciveDecisionsCtx } from './types';

export function usePersonalCoerciveDecisionFinders(ctx: PersonalCoerciveDecisionsCtx, rows: Pick<
    ReturnType<typeof usePersonalCoerciveDecisionRowsStates>,
    'allDecisionRows' | 'exId' | 'executionDataEffective'
>) {
    const {
        executionId,
        decisionsReloadEpoch,
        coerciveUiLocked,
        executionData,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        dossierInlineResolved,
        forcedInlineResolved,
        localDecisionsTick,
        optimisticForcedOutcome,
        optimisticPersistPatch,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setOptimisticPersistPatch,
    } = ctx;

    const { allDecisionRows, exId, executionDataEffective } = rows;

    const findLatestDecisionIdForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']): string | null => {
            const hit = getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisionRows, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
            return id || null;
        },
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
    );

    const findGoverningDossierDecisionId = useCallback((): string | null => {
        const hit = getGoverningDossierPresentationRowFromDecisions(allDecisionRows, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        const eligible = String(
            executionDataEffective?.executive_detention_judge_eligible_decision_id ?? '',
        ).trim();
        return id || eligible || null;
    }, [activeDebtorKey, allDecisionRows, executionDataEffective, primaryDebtorKey]);

    const findLatestGuarantorDecisionId = useCallback((): string | null => {
        if (!exId) return null;
        const hit = allDecisionRows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        return id || null;
    }, [allDecisionRows, exId]);

    const findLatestDecisionRowForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisionRows, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
    );

    return {
        findLatestDecisionIdForSubtype,
        findGoverningDossierDecisionId,
        findLatestGuarantorDecisionId,
        findLatestDecisionRowForSubtype,
    };
}
