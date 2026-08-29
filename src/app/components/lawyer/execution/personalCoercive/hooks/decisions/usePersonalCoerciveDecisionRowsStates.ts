import React, { useMemo, useCallback, useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendPersonalCoerciveExecutorRequest,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { isDebtorNotifiedForCoerciveActions } from '@/app/utils/noticeDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    buildForcedBringPersonalOutcomePatch,
    isPersonalCoerciveCycleClosed,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { resolveAllPersonalCoerciveAppealSync } from '@/app/utils/personalCoerciveAppealSync';
import { coerciveOutcomeFromDecisionRow } from '../../utils/coerciveOutcomeFromDecisionRow';

import type { PersonalCoerciveDecisionsCtx } from './types';

export function usePersonalCoerciveDecisionRowsStates(ctx: PersonalCoerciveDecisionsCtx) {
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

    const exId = String(executionId ?? executionData?.id ?? '').trim();
    const exKey = exId || undefined;

    const allDecisionRows = useMemo(
        () =>
            exId
                ? readExecutorDecisionsUnionAcrossCandidateIds(
                      exId,
                      executionData as Record<string, unknown> | null | undefined,
                  )
                : [],
        [exId, executionData, decisionsReloadEpoch, localDecisionsTick],
    );
    const allDecisionRowsRef = React.useRef(allDecisionRows);
    allDecisionRowsRef.current = allDecisionRows;

    React.useEffect(() => {
        if (!exKey) return;
        void warmExecutorDecisionsStorage(exKey, executionData as Record<string, unknown> | null | undefined).then(
            () => setLocalDecisionsTick((n) => n + 1),
        );
    }, [exKey, executionData]);

    const applyOptimisticPersistPatch = useCallback((patch: Record<string, unknown>) => {
        setOptimisticPersistPatch((prev) => ({ ...(prev ?? {}), ...patch }));
    }, []);

    const executionDataEffective = useMemo(() => {
        if (!executionData) return executionData;
        let next = executionData as ExecutionFile;
        if (optimisticForcedOutcome) {
            next = { ...next, ...buildForcedBringPersonalOutcomePatch(optimisticForcedOutcome) };
        }
        if (optimisticPersistPatch) {
            next = { ...next, ...optimisticPersistPatch } as ExecutionFile;
        }
        return next;
    }, [executionData, optimisticForcedOutcome, optimisticPersistPatch]);

    useEffect(() => {
        const stored = String(executionData?.forced_bring_in_personal_outcome ?? '').trim();
        if (stored === 'absconded') {
            setOptimisticForcedOutcome(null);
        }
    }, [executionData?.forced_bring_in_personal_outcome]);

    useEffect(() => {
        if (!optimisticPersistPatch) return;
        setOptimisticPersistPatch(null);
    }, [executionData?.updatedAt]);
    const debtorScopeOpts = useMemo(
        () => ({ debtorKey: activeDebtorKey, primaryDebtorKey }),
        [activeDebtorKey, primaryDebtorKey]
    );
    const decisionsNavForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            resolvePersonalCoerciveDecisionsNavFromDecisions(allDecisionRows, subtype, debtorScopeOpts),
        [allDecisionRows, debtorScopeOpts],
    );
    const hasOpenCardForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            hasActivePersonalCoerciveSubtypeCardFromDecisions(allDecisionRows, subtype, debtorScopeOpts),
        [allDecisionRows, debtorScopeOpts],
    );
    const debtorNotified = useMemo(
        () =>
            isDebtorNotifiedForCoerciveActions(
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
            ),
        [executionData, activeDebtorKey, primaryDebtorKey],
    );
    const debtorTimelineMeta = useMemo(
        () => timelineDebtorMetadata(activeDebtorKey),
        [activeDebtorKey]
    );
    const coerciveDecisionStates = useMemo(() => {
        const debtorOpts = { debtorKey: activeDebtorKey, primaryDebtorKey };
        const forcedRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'forced_bring_in',
            debtorOpts,
        );
        const arrestRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'arrest_warrant_investigation',
            debtorOpts,
        );
        const travelRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'travel_ban',
            debtorOpts,
        );
        const dossierRow = getGoverningDossierPresentationRowFromDecisions(allDecisionRows, debtorOpts);
        const guarantorRow = allDecisionRows.find((r) =>
            isGuarantorRequestDecisionRow(r as Record<string, unknown>),
        );
        return {
            forced: coerciveOutcomeFromDecisionRow(forcedRow),
            arrest: coerciveOutcomeFromDecisionRow(arrestRow),
            travel: coerciveOutcomeFromDecisionRow(travelRow),
            dossier: coerciveOutcomeFromDecisionRow(dossierRow),
            guarantor: coerciveOutcomeFromDecisionRow(guarantorRow ?? null),
        };
    }, [allDecisionRows, activeDebtorKey, primaryDebtorKey]);

    const coerciveWriteLocked = coerciveUiLocked || isHistoricalMode;

    const forced = coerciveDecisionStates.forced;
    const forcedEffective = useMemo(
        () => ({
            pending: forced.pending && forcedInlineResolved !== 'approved',
            approved: forced.approved || forcedInlineResolved === 'approved',
            rejected: forced.rejected || forcedInlineResolved === 'rejected',
            alternative: forced.alternative,
        }),
        [forced, forcedInlineResolved]
    );
    const arrest = coerciveDecisionStates.arrest;
    const travel = coerciveDecisionStates.travel;
    const dossier = coerciveDecisionStates.dossier;
    const dossierPhase = executionDataEffective?.executive_dossier_phase ?? null;
    const dossierEffective = useMemo(
        () => ({
            pending:
                dossier.pending &&
                dossierInlineResolved !== 'approved' &&
                dossierInlineResolved !== 'rejected',
            approved: dossier.approved || dossierInlineResolved === 'approved',
            rejected: dossier.rejected || dossierInlineResolved === 'rejected',
            alternative: dossier.alternative,
        }),
        [dossier, dossierInlineResolved]
    );
    const dossierPhaseEffective = useMemo(() => {
        if (
            dossierInlineResolved === 'approved' &&
            dossierPhase !== 'judge_decided' &&
            dossierPhase !== 'detention_active'
        ) {
            return 'handed_to_judge';
        }
        return dossierPhase;
    }, [dossierInlineResolved, dossierPhase]);
    const fullPersonalCoerciveCycleClosed = isPersonalCoerciveCycleClosed(executionData);
    const detentionReleasedAt = String(
        executionData?.executive_detention_released_or_closed_at ?? ''
    ).trim();
    const detentionPeriodNaturalEnd =
        executionData?.debtor_executive_detention_active === true &&
        !isExecutiveDetentionPeriodActive(executionData) &&
        !detentionReleasedAt &&
        Boolean(String(executionData?.executive_detention_until ?? '').trim());
    /** انتهاء مسار الحبس/عرض الإضبارة — إخلاء سبيل، انتهاء مدة، أو إغلاق دورة كاملة */
    const detentionLaneEnded =
        fullPersonalCoerciveCycleClosed ||
        Boolean(detentionReleasedAt) ||
        detentionPeriodNaturalEnd;
    const guarantorDec = coerciveDecisionStates.guarantor;
    const guarantorAwaitingSave = guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup);

    const appealSync = useMemo(
        () =>
            resolveAllPersonalCoerciveAppealSync({
                executionId: exId,
                allDecisions: allDecisionRows,
                executionData: executionData as Record<string, unknown> | null,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [
            exId,
            allDecisionRows,
            executionData,
            activeDebtorKey,
            primaryDebtorKey,
            decisionsReloadEpoch,
            localDecisionsTick,
        ]
    );
    const forcedSync = appealSync.forced_bring_in;
    const travelSync = appealSync.travel_ban;
    const arrestSync = appealSync.arrest_warrant_investigation;
    const dossierSync = appealSync.executive_dossier_presentation;
    const judgeSync = appealSync.executive_detention_judge;

    return {
        exId,
        exKey,
        allDecisionRows,
        allDecisionRowsRef,
        applyOptimisticPersistPatch,
        executionDataEffective,
        debtorScopeOpts,
        decisionsNavForSubtype,
        hasOpenCardForSubtype,
        debtorNotified,
        debtorTimelineMeta,
        coerciveDecisionStates,
        coerciveWriteLocked,
        forced,
        forcedEffective,
        arrest,
        travel,
        dossier,
        dossierPhase,
        dossierEffective,
        dossierPhaseEffective,
        fullPersonalCoerciveCycleClosed,
        detentionReleasedAt,
        detentionPeriodNaturalEnd,
        detentionLaneEnded,
        guarantorDec,
        guarantorAwaitingSave,
        appealSync,
        forcedSync,
        travelSync,
        arrestSync,
        dossierSync,
        judgeSync,
    };
}
