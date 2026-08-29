import React, { useMemo } from 'react';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { createEmptyEvictionAppealSyncView } from '@/app/utils/evictionBranchSignals';
import {
    resolveAllEvictionAppealSync,
    type EvictionAppealSyncBranch,
    type EvictionAppealSyncView,
} from '@/app/utils/evictionAppealSync';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';

export function useEvictionFieldDecisions(
    props: EvictionFieldProceduresPanelProps,
    _state: ReturnType<typeof useEvictionFieldPanelState>,
) {
    const { decisionsStorageExecutionId, executionData = null } = props;

    const { executionId: decisionsExecId, decisions } = useExecutorDecisions(
        decisionsStorageExecutionId,
        executionData
    );

    const toast = React.useCallback((message: string, type: 'success' | 'warning' | 'info' | 'error') => {
        try {
            window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message, type } }));
        } catch {
            /* ignore */
        }
    }, []);

    const decisionList = useMemo(
        () => (Array.isArray(decisions) ? (decisions as Decision[]) : []),
        [decisions]
    );

    const decisionRecords = useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const resolvedExistingJudicialCustodians = useMemo(() => {
        const data = executionData as {
            eviction_judicial_custodians?: Array<{ fullName?: string; salary?: string }>;
            eviction_judicial_custodian?: { fullName?: string; salary?: string } | null;
        } | null;
        const arr = Array.isArray(data?.eviction_judicial_custodians)
            ? data!.eviction_judicial_custodians!
            : [];
        const list = arr
            .filter((c) => String(c?.fullName || '').trim())
            .map((c) => ({
                fullName: String(c.fullName || '').trim(),
                salary: String(c.salary || '').trim(),
                decisionId: String((c as { decisionId?: string }).decisionId || '').trim(),
            }));
        const legacy = data?.eviction_judicial_custodian;
        if (legacy?.fullName && !list.length) {
            list.push({
                fullName: String(legacy.fullName).trim(),
                salary: String(legacy.salary || '').trim(),
                decisionId: String((legacy as { decisionId?: string }).decisionId || '').trim(),
            });
        }
        return list;
    }, [executionData]);

    const appealSync = useMemo(
        () =>
            resolveAllEvictionAppealSync({
                executionId: decisionsExecId || decisionsStorageExecutionId,
                allDecisions: decisionRecords,
            }),
        [decisionRecords, decisions, decisionsExecId, decisionsStorageExecutionId]
    );

    const syncForBranch = React.useCallback(
        (branch: string): EvictionAppealSyncView => {
            const key = branch as EvictionAppealSyncBranch;
            if (appealSync[key]) return appealSync[key];
            return createEmptyEvictionAppealSyncView(key);
        },
        [appealSync]
    );

    return {
        decisionsExecId,
        decisions,
        toast,
        decisionList,
        decisionRecords,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    };
}
