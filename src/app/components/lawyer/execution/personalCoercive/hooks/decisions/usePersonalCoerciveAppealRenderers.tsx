import React, { useMemo, useCallback } from 'react';
import {
    isGuarantorRequestDecisionRow,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { resolveExecutorRequestFollowupBlockFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    buildPersonalCoerciveAppealExecutionSyncPatch,
    isExecutorRejectedAppealFollowupDismissed,
    type PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { CoerciveSubsectionFold } from '../../chrome/CoerciveSubsectionFold';
import type { usePersonalCoerciveDecisionRowsStates } from './usePersonalCoerciveDecisionRowsStates';

import type { PersonalCoerciveDecisionsCtx } from './types';

export function usePersonalCoerciveAppealRenderers(ctx: PersonalCoerciveDecisionsCtx, rows: Pick<
    ReturnType<typeof usePersonalCoerciveDecisionRowsStates>,
    'allDecisionRows' | 'exId' | 'executionDataEffective' | 'debtorTimelineMeta'
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

    const { allDecisionRows, exId, executionDataEffective, debtorTimelineMeta } = rows;

    const handleWaiveInitialAppealApplied = useCallback(
        (decisionId: string, result: { ok: boolean; mergedRowId?: string; title?: string; message?: string }) => {
            if (!result.ok) {
                showToast(result.message ?? 'تعذّر تسجيل الاستغناء عن الطعن.', 'warning');
                return;
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: 'لا حاجة للطعن',
                description: [result.title, result.message].filter(Boolean).join(' — '),
                type: 'appeal',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
            showToast(result.message ?? 'لا حاجة للطعن — أُغلقت دورة الطلب.', 'success', {
                decisionsLink: true,
                decisionsTab: 'archive',
                decisionId: result.mergedRowId ?? decisionId,
            });
            const freshDecisions = readExecutorDecisionsUnionAcrossCandidateIds(
                exId,
                executionData as Record<string, unknown> | null | undefined,
            );
            const waivedRow = freshDecisions.find(
                (r) => String((r as { id?: string }).id ?? '').trim() === String(decisionId).trim()
            ) as Record<string, unknown> | undefined;
            const subtype = String(waivedRow?.personalCoerciveSubtype ?? '').trim() as PersonalCoerciveSubtype;
            if (subtype) {
                const subtypeMerge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: 'rejected',
                });
                if (Object.keys(subtypeMerge).length > 0) {
                    persistExecutionMerge(subtypeMerge);
                }
            }
            const syncPatch = buildPersonalCoerciveAppealExecutionSyncPatch({
                executionId: exId,
                executionData: executionData as Record<string, unknown> | null,
                allDecisions: freshDecisions,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            if (syncPatch && Object.keys(syncPatch).length > 0) {
                persistExecutionMerge(syncPatch);
            }
            setLocalDecisionsTick((n) => n + 1);
        },
        [
            activeDebtorKey,
            exId,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKey,
            pushTimelineEvent,
            showToast,
            debtorTimelineMeta,
        ]
    );

    const renderWaiveInitialAppeal = useCallback(
        (decisionId: string | null | undefined) => {
            const did = String(decisionId ?? '').trim();
            if (!did || !exId || isHistoricalMode) return null;
            if (isExecutorRejectedAppealFollowupDismissed(did, allDecisionRows)) return null;
            return (
                <WaiveInitialAppealButton
                    executionId={exId}
                    decisionId={did}
                    allDecisions={allDecisionRows as Decision[]}
                    disabled={coerciveUiLocked}
                    onApplied={(result) => handleWaiveInitialAppealApplied(did, result)}
                />
            );
        },
        [
            allDecisionRows,
            coerciveUiLocked,
            exId,
            handleWaiveInitialAppealApplied,
            isHistoricalMode,
        ]
    );

    const renderRejectedExecutorAppealSection = useCallback(
        (opts: {
            decisionId: string | null | undefined;
            title?: string;
            titleClassName?: string;
            requestKind?: string;
            personalCoerciveSubtype?: PersonalCoerciveSubtype;
        }) => {
            const did = String(opts.decisionId ?? '').trim();
            if (!did || isExecutorRejectedAppealFollowupDismissed(did, allDecisionRows)) {
                return null;
            }
            return (
                <CoerciveSubsectionFold
                    flat
                    title={opts.title ?? 'تم رفض الطلب من قبل المنفذ'}
                    titleClassName={opts.titleClassName}
                >
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={did}
                        requestKind={opts.requestKind ?? 'personal_coercive'}
                        personalCoerciveSubtype={opts.personalCoerciveSubtype}
                        suppressNavigatorToast
                        disabled
                        onOpenAppealCenter={() =>
                            onOpenDecisions({
                                tab: 'previous',
                                decisionId: did,
                            })
                        }
                    />
                    {renderWaiveInitialAppeal(did)}
                </CoerciveSubsectionFold>
            );
        },
        [allDecisionRows, exId, onOpenDecisions, renderWaiveInitialAppeal]
    );

    const handleWaiveCassationFromPanel = useCallback(
        (decisionId: string) => {
            if (!exId || isHistoricalMode) return;
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId: exId,
                decisionId,
            });
            if (!result.ok) {
                showToast(result.message ?? 'تعذّر تسجيل الاستغناء عن التمييز.', 'warning');
                return;
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: 'لا حاجة للتمييز',
                description: [result.title, result.message].filter(Boolean).join(' — '),
                type: 'appeal',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
            showToast(result.message ?? 'قُبل التظلم دون تمييز — انتهت دورة الطلب.', 'success', {
                decisionsLink: true,
                decisionsTab: 'archive',
                decisionId: result.mergedRowId ?? decisionId,
            });
            setLocalDecisionsTick((n) => n + 1);
        },
        [
            exId,
            isHistoricalMode,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
            debtorTimelineMeta,
        ]
    );

    const renderAppealSyncFollowup = useCallback(
        (sync: PersonalCoerciveAppealSyncView) => {
            if (!sync.followupBlock || !exId || !sync.decisionId) return null;
            return (
                <div className="border-t border-white/10 px-3 py-3">
                    <ExecutorRequestFollowupBlockPanel
                        gate={sync.followupBlock}
                        executionId={exId}
                        decisionId={sync.decisionId}
                        onOpenAppeals={(id) => onOpenDecisions({ tab: 'previous', decisionId: id })}
                        onWaiveCassation={handleWaiveCassationFromPanel}
                    />
                </div>
            );
        },
        [exId, handleWaiveCassationFromPanel, onOpenDecisions]
    );

    const findLatestGuarantorDecisionRow = useCallback((): Record<string, unknown> | null => {
        if (!exId) return null;
        const hit = allDecisionRows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        return (hit as Record<string, unknown> | undefined) ?? null;
    }, [allDecisionRows, exId]);

    const guarantorFollowupBlock = useMemo(() => {
        const row = findLatestGuarantorDecisionRow();
        if (!row) return null;
        return resolveExecutorRequestFollowupBlockFromRecord(row, allDecisionRows);
    }, [allDecisionRows, findLatestGuarantorDecisionRow]);

    return {
        handleWaiveInitialAppealApplied,
        renderWaiveInitialAppeal,
        renderRejectedExecutorAppealSection,
        handleWaiveCassationFromPanel,
        renderAppealSyncFollowup,
        findLatestGuarantorDecisionRow,
        guarantorFollowupBlock,
    };
}
