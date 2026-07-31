import { useEffect } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import {
    useExecutionDashboardPartyDeathHandlers,
    type UseExecutionDashboardPartyDeathHandlersParams,
} from './useExecutionDashboardPartyDeathHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterPartyDeathBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

/**
 * جسر وفاة الخصوم — يُحمَّل عند نية القائمة ⋮ / نافذة الوفاة فقط،
 * لا على cold-open الإضبارة.
 */
export function ExecutionDashboardHandlerClusterPartyDeathBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPartyDeathBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads) as Record<
        string,
        unknown
    >;

    const handlers = useExecutionDashboardPartyDeathHandlers({
        executionDataRef: c.executionDataRef,
        executionData: c.executionData,
        executionId: c.executionId,
        claimType: c.claimType,
        creditors: c.creditors,
        debtors: c.debtors,
        decisionsStorageExecutionId: c.decisionsStorageExecutionId,
        decisionsReloadEpoch: c.decisionsReloadEpoch,
        partyDeathModalParty: c.partyDeathModalParty,
        setPartyDeathModalParty: c.setPartyDeathModalParty,
        partyDeathModalDecisionId: c.partyDeathModalDecisionId,
        setPartyDeathModalDecisionId: c.setPartyDeathModalDecisionId,
        setAlimonyBeneficiaryDeathModalProfile: c.setAlimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalOpen: c.setAlimonyBeneficiaryDeathModalOpen,
        lastHeirSubRequestAtRef: c.lastHeirSubRequestAtRef,
        creditorDeathMarked: c.creditorDeathMarked,
        debtorDeathMarked: c.debtorDeathMarked,
        heirSubstitutionAllowed: c.heirSubstitutionAllowed,
        ongoingAlimonyClaim: c.ongoingAlimonyClaim,
        alimonyBeneficiaryProfile: c.alimonyBeneficiaryProfile,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
    } as UseExecutionDashboardPartyDeathHandlersParams);

    useEffect(() => {
        onCluster({ ...handlers });
    }, [handlers, onCluster]);

    return null;
}
