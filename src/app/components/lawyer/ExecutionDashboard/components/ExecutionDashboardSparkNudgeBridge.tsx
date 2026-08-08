import React, { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { SparkExecutionNudgeSlot } from '@/app/spark/ui/SparkExecutionNudgeSlot';
import { buildExecutionSparkFinancialOverlay } from '@/app/spark/engine/executionSparkLiveFinancialOverlay';
import { openFollowupCoerciveModal } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import type { OpenFollowupModalPersistedFn } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';
import { openFollowupSeizureRequestsModal } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalOpen';

export type ExecutionDashboardSparkNudgeBridgeProps = {
    scope: Record<string, unknown>;
    directOpenUnifiedSummonsHub?: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    setDossierLifecyclePanelOpen?: (open: boolean) => void;
};

/** يبني شريحة سبارك في هيدر الإضبارة — لا يأخذ مساحة في المحتوى */
export function ExecutionDashboardSparkNudgeBridge({
    scope,
    directOpenUnifiedSummonsHub,
    setDossierLifecyclePanelOpen,
}: ExecutionDashboardSparkNudgeBridgeProps) {
    const s = scope as Record<string, any>;
    const executionData = s.executionData as ExecutionFile | null | undefined;
    const openDecisionsModalWithBoot = s.openDecisionsModalWithBoot as
        | ((opts?: { tab?: string }) => void)
        | undefined;
    const openFollowupModalPersisted = s.openFollowupModalPersisted as
        | OpenFollowupModalPersistedFn
        | undefined;
    const handleResumeExecution = s.handleResumeExecution as (() => void) | undefined;

    const sparkFinancialOverlay = useMemo(
        () =>
            buildExecutionSparkFinancialOverlay({
                remainingBalanceForSeizure: s.remainingBalanceForSeizure,
                settlementGuarantorGate: s.settlementGuarantorGate,
            }),
        [s.remainingBalanceForSeizure, s.settlementGuarantorGate, s.unifiedLedgerRevision],
    );

    if (!executionData) return null;

    return (
        <SparkExecutionNudgeSlot
            executionData={executionData}
            executionPaused={Boolean(s.executionPaused)}
            decisionsStorageExecutionId={s.decisionsStorageExecutionId as string | undefined}
            disabled={Boolean(s.isHistoricalMode)}
            presentation="header-chip"
            runtimeOverlay={{
                activeCoerciveActions: Array.isArray(s.activeCoerciveActions)
                    ? s.activeCoerciveActions.map(String)
                    : [],
                notificationCount:
                    typeof s.notificationCount === 'number' ? s.notificationCount : undefined,
                summoningRound:
                    typeof s.summoningRound === 'number' ? s.summoningRound : undefined,
                lawyerStartedPostNoticeExecution: Boolean(s.lawyerStartedPostNoticeExecution),
                forcedAttendanceIssued: Boolean(s.forcedAttendanceIssued),
                debtorAttendedVoluntarily: Boolean(s.debtorAttendedVoluntarily),
                voluntaryAttendanceCount:
                    typeof s.voluntaryAttendanceCount === 'number'
                        ? s.voluntaryAttendanceCount
                        : undefined,
                investigationMemoIssued: Boolean(s.investigationMemoIssued),
                debtorArrested: Boolean(s.debtorArrested),
                forcedPathAttendanceSecured: Boolean(s.forcedPathAttendanceSecured),
                noticeVoluntaryPeriodEndOptimistic: Boolean(s.noticeVoluntaryPeriodEndOptimistic),
                voluntaryEndOptimistic: Boolean(s.voluntaryEndOptimistic),
                financial: sparkFinancialOverlay,
            }}
            onOpenFinancialCenter={() => s.directOpenFinancialCenter?.()}
            onOpenSummons={() => directOpenUnifiedSummonsHub?.()}
            onOpenDecisions={() => openDecisionsModalWithBoot?.()}
            onRecordDetentionJudge={() => openDecisionsModalWithBoot?.()}
            onOpenCoercive={() => openFollowupCoerciveModal(openFollowupModalPersisted)}
            onOpenFollowup={() => openFollowupModalPersisted?.({ tab: 'personal' })}
            onOpenSeizureRequests={() => openFollowupSeizureRequestsModal(openFollowupModalPersisted)}
            onOpenTimeline={() => {
                s.setTimelineAccordionExpanded?.(true);
            }}
            onOpenEmployeeAssignment={() => {
                if (Boolean(s.primaryDebtorTaklifActive)) {
                    directOpenUnifiedSummonsHub?.({ initialMainTab: 'taklif' });
                    return;
                }
                openFollowupModalPersisted?.({ tab: 'personal' });
            }}
            onResumeLifecycle={() => {
                if (Boolean(s.executionPaused) && handleResumeExecution) {
                    handleResumeExecution();
                    return;
                }
                setDossierLifecyclePanelOpen?.(true);
            }}
        />
    );
}
