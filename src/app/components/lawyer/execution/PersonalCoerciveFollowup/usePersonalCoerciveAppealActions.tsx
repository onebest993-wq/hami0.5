import React from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionReadQueries';
import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import {
    buildPersonalCoerciveAppealExecutionSyncPatch,
    isExecutorRejectedAppealFollowupDismissed,
    type PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { CoerciveSubsectionFold } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface UsePersonalCoerciveAppealActionsOptions {
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: { decisionsLink?: boolean; decisionsTab?: 'current' | 'previous' | 'appeals'; decisionId?: string }
    ) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    exId: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    executionData: ExecutionFile | null;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    allDecisionRows: Record<string, unknown>[];
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
}

/**
 * أفعال ومقاطع عرض التظلم/الطعن المشتركة عبر بطاقات محضر المتابعة — الاستغناء عن الطعن الابتدائي
 * أو التمييز، عرض قسم «رُفض من المنفذ»، وعرض حاجز المتابعة عند تعليق المسار بتظلم أو طعن.
 */
export function usePersonalCoerciveAppealActions({
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    exId,
    persistExecutionMerge,
    executionData,
    activeDebtorKey,
    primaryDebtorKey,
    setLocalDecisionsTick,
    allDecisionRows,
    coerciveUiLocked,
    isHistoricalMode,
    onOpenDecisions,
}: UsePersonalCoerciveAppealActionsOptions) {
    const handleWaiveInitialAppealApplied = (
        decisionId: string,
        result: { ok: boolean; mergedRowId?: string; title?: string; message?: string }
    ) => {
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
            decisionsTab: 'previous',
            decisionId: result.mergedRowId ?? decisionId,
        });
        const freshDecisions = readExecutorDecisionsArray(exId);
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
            executionData: executionData as unknown as Record<string, unknown> | null,
            allDecisions: freshDecisions,
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        if (syncPatch && Object.keys(syncPatch).length > 0) {
            persistExecutionMerge(syncPatch);
        }
        setLocalDecisionsTick((n) => n + 1);
    };

    const renderWaiveInitialAppeal = (decisionId: string | null | undefined) => {
        const did = String(decisionId ?? '').trim();
        if (!did || !exId || isHistoricalMode) return null;
        if (isExecutorRejectedAppealFollowupDismissed(did, allDecisionRows)) return null;
        return (
            <WaiveInitialAppealButton
                executionId={exId}
                decisionId={did}
                allDecisions={allDecisionRows as unknown as Decision[]}
                disabled={coerciveUiLocked}
                onApplied={(result) => handleWaiveInitialAppealApplied(did, result)}
            />
        );
    };

    const renderRejectedExecutorAppealSection = (opts: {
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
    };

    const handleWaiveCassationFromPanel = (decisionId: string) => {
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
            decisionsTab: 'previous',
            decisionId: result.mergedRowId ?? decisionId,
        });
        setLocalDecisionsTick((n) => n + 1);
    };

    const renderAppealSyncFollowup = (sync: PersonalCoerciveAppealSyncView) => {
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
    };

    return {
        renderWaiveInitialAppeal,
        renderRejectedExecutorAppealSection,
        renderAppealSyncFollowup,
    };
}
