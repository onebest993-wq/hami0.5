import React from 'react';
import { flushSync } from 'react-dom';
import { runDebtorEmploymentToggle } from './executionDashboardCore/executionDashboardDebtorEmploymentToggle';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';
import type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';

export function usePhoneBodySafeActionHandlers(p: {
    readLatestPhoneBodyScope: () => Record<string, unknown>;
    showToast: PhoneBodySafeHandlersInput['showToast'];
    handleDebtorEmploymentToggle: PhoneBodySafeHandlersInput['handleDebtorEmploymentToggle'];
    handleMemoFollowupClick: PhoneBodySafeHandlersInput['handleMemoFollowupClick'];
    openDecisionsModalWithBoot: PhoneBodySafeHandlersInput['openDecisionsModalWithBoot'];
    setShowDecisionsModal: PhoneBodySafeHandlersInput['setShowDecisionsModal'];
}) {
    const safeHandleDebtorEmploymentToggle = React.useCallback(
        (payload: { debtorKey: string; isPrimary: boolean }) => {
            const latest = p.readLatestPhoneBodyScope();
            const fromScope = latest?.handleDebtorEmploymentToggle;
            const candidates = [fromScope, p.handleDebtorEmploymentToggle];
            for (const candidate of candidates) {
                if (typeof candidate !== 'function') continue;
                if (isExecutionHandlerStubLeaf(candidate)) continue;
                candidate(payload);
                return;
            }
            runDebtorEmploymentToggle({
                base: (latest?.executionData ?? latest?.viewExecutionData) as
                    | import('@/app/types/execution').ExecutionFile
                    | null
                    | undefined,
                debtorWorkspaceEntries: Array.isArray(latest?.debtorWorkspaceEntries)
                    ? (latest.debtorWorkspaceEntries as import('./useDebtorWorkspaceEntries').DebtorWorkspaceEntry[])
                    : [],
                ctx: payload,
                nextTimelineId:
                    typeof latest?.nextTimelineId === 'function'
                        ? (latest.nextTimelineId as () => string)
                        : () => `timeline-${Date.now()}`,
                persistExecutionMerge:
                    typeof latest?.persistExecutionMerge === 'function'
                        ? (latest.persistExecutionMerge as (patch: Record<string, unknown>) => boolean | void)
                        : () => false,
                showToast: p.showToast,
                setTimelineEvents:
                    typeof latest?.setTimelineEvents === 'function'
                        ? (latest.setTimelineEvents as React.Dispatch<
                              React.SetStateAction<import('@/app/types/execution').TimelineEvent[]>
                          >)
                        : undefined,
            });
        },
        [p.handleDebtorEmploymentToggle, p.readLatestPhoneBodyScope, p.showToast],
    );
    const directHandleMemoFollowupClick = React.useCallback(() => {
        const latest = p.readLatestPhoneBodyScope();
        const fromScope = latest?.handleMemoFollowupClick;
        const openPersisted = latest?.openFollowupModalPersisted;
        const candidates = [fromScope, p.handleMemoFollowupClick, openPersisted];
        for (const candidate of candidates) {
            if (typeof candidate !== 'function') continue;
            if (isExecutionHandlerStubLeaf(candidate)) continue;
            candidate();
            return;
        }
        try {
            useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
        } catch {
            p.showToast('تعذر فتح محضر المتابعة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        }
    }, [p.handleMemoFollowupClick, p.readLatestPhoneBodyScope, p.showToast]);
    const directOpenDecisionsModalWithBoot = React.useCallback(
        (opts: { tab: string }) => {
            if (typeof p.openDecisionsModalWithBoot === 'function') {
                p.openDecisionsModalWithBoot(opts);
                return;
            }
            if (typeof p.setShowDecisionsModal === 'function') {
                flushSync(() => {
                    p.setShowDecisionsModal!(true);
                });
                return;
            }
            p.showToast('تعذر فتح القرارات والطعون حالياً.', 'error');
        },
        [p.setShowDecisionsModal, p.openDecisionsModalWithBoot, p.showToast],
    );

    return {
        safeHandleDebtorEmploymentToggle,
        directHandleMemoFollowupClick,
        directOpenDecisionsModalWithBoot,
    };
}
