import { useCallback, useEffect, useMemo, useState } from 'react';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '../executionHandlerClusterStubs';
import {
    buildExecutionHandlerClusterMountKey,
    shouldLoadExecutionHandlerClusterCoerciveHeavy,
    shouldLoadExecutionHandlerClusterDossierSupport,
    shouldLoadExecutionHandlerClusterFollowupAdminSpecial,
    shouldLoadExecutionHandlerClusterFollowupDossierControls,
    shouldLoadExecutionHandlerClusterFollowupHeavy,
    shouldLoadExecutionHandlerClusterFollowupOtherParty,
    shouldLoadExecutionHandlerClusterLight,
    shouldLoadExecutionHandlerClusterSeizureHeavy,
    shouldLoadExecutionHandlerClusterSeizureLog,
    shouldLoadExecutionHandlerClusterSeizureRequests,
    type ExecutionHandlerClusterGateInput,
} from '../executionHandlerClusterGate';
import { pickFollowupAdminSpecialHandlerClusterInput } from './followupAdminSpecialHandlerClusterInput';
import { pickFollowupOtherPartyHandlerClusterInput } from './followupOtherPartyHandlerClusterInput';
import { mergeHandlerClusterPatch } from './handlerClusterPublishUtils';
import { prefetchExecutionCoreHandlers } from '../../executionCoreHandlersPrefetch';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

const EMPTY_HANDLER_CLUSTER_INPUT = Object.freeze({}) as ExecutionDashboardCoreHandlerClusterInput;

export type ExecutionDashboardHandlerClusterHeavySpreads = HandlerClusterContextSpreads;

export function useExecutionDashboardCoreHandlerClusterRuntime({
    executionId,
    activeTabId,
    activeFollowupDebtorKey,
    handlerClusterGateInput,
    coreRuntimeVars,
    heavySpreadSources,
}: {
    executionId: string | undefined;
    activeTabId: string;
    activeFollowupDebtorKey: string | null | undefined;
    handlerClusterGateInput: ExecutionHandlerClusterGateInput;
    coreRuntimeVars: ExecutionDashboardCoreWorkspacePipelineValue;
    heavySpreadSources: Omit<ExecutionDashboardHandlerClusterHeavySpreads, 'core'>;
}) {
    const loadLightHandlerCluster = shouldLoadExecutionHandlerClusterLight(handlerClusterGateInput);
    const loadFollowupAdminSpecialHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupAdminSpecial(handlerClusterGateInput);
    const loadFollowupDossierControlsHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupDossierControls(handlerClusterGateInput);
    const loadFollowupOtherPartyHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupOtherParty(handlerClusterGateInput);
    const loadDossierSupportHandlerCluster =
        shouldLoadExecutionHandlerClusterDossierSupport(handlerClusterGateInput);
    const loadFollowupHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterFollowupHeavy(handlerClusterGateInput);
    const loadSeizureHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureHeavy(handlerClusterGateInput);
    const loadSeizureRequestsHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureRequests(handlerClusterGateInput);
    const loadSeizureLogHandlerCluster =
        shouldLoadExecutionHandlerClusterSeizureLog(handlerClusterGateInput);
    const loadCoerciveHeavyHandlerCluster =
        shouldLoadExecutionHandlerClusterCoerciveHeavy(handlerClusterGateInput);
    const loadAnyHeavyHandlerCluster =
        loadFollowupHeavyHandlerCluster ||
        loadSeizureHeavyHandlerCluster ||
        loadCoerciveHeavyHandlerCluster;

    const [handlerCluster, setHandlerCluster] = useState(EXECUTION_HANDLER_CLUSTER_STUBS);
    const [handlerClusterEpoch, setHandlerClusterEpoch] = useState(0);

    const handlerClusterHeavySpreads = useMemo(
        () => ({
            ...heavySpreadSources,
            core: coreRuntimeVars,
        }),
        [coreRuntimeVars, heavySpreadSources],
    );

    const lightHandlerClusterInput = useMemo(() => {
        if (!loadLightHandlerCluster || loadAnyHeavyHandlerCluster) {
            return EMPTY_HANDLER_CLUSTER_INPUT;
        }
        return coreRuntimeVars;
    }, [loadAnyHeavyHandlerCluster, loadLightHandlerCluster, coreRuntimeVars]);

    const followupAdminSpecialHandlerClusterInput = useMemo(
        () =>
            loadFollowupAdminSpecialHandlerCluster
                ? pickFollowupAdminSpecialHandlerClusterInput(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupAdminSpecialHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupDossierControlsHandlerClusterInput = useMemo(
        () =>
            loadFollowupDossierControlsHandlerCluster
                ? handlerClusterHeavySpreads
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupDossierControlsHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupOtherPartyHandlerClusterInput = useMemo(
        () =>
            loadFollowupOtherPartyHandlerCluster
                ? pickFollowupOtherPartyHandlerClusterInput(handlerClusterHeavySpreads)
                : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadFollowupOtherPartyHandlerCluster, handlerClusterHeavySpreads],
    );

    const seizureHeavyHandlerClusterInput = useMemo(
        () =>
            loadSeizureHeavyHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadSeizureHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const coerciveHeavyHandlerClusterInput = useMemo(
        () =>
            loadCoerciveHeavyHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadCoerciveHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const dossierSupportHandlerClusterInput = useMemo(
        () =>
            loadDossierSupportHandlerCluster ? handlerClusterHeavySpreads : EMPTY_HANDLER_CLUSTER_INPUT,
        [loadDossierSupportHandlerCluster, handlerClusterHeavySpreads],
    );

    const handlerClusterMountKey = buildExecutionHandlerClusterMountKey({
        executionId,
        activeTabId,
        activeFollowupDebtorKey: activeFollowupDebtorKey ?? undefined,
    });

    useEffect(() => {
        setHandlerCluster(EXECUTION_HANDLER_CLUSTER_STUBS);
        setHandlerClusterEpoch(0);
        if (shouldLoadExecutionHandlerClusterSeizureRequests(handlerClusterGateInput)) {
            prefetchExecutionCoreHandlers('seizure-requests');
        }
        if (shouldLoadExecutionHandlerClusterFollowupAdminSpecial(handlerClusterGateInput)) {
            prefetchExecutionCoreHandlers('followup-admin-special');
        }
        if (shouldLoadExecutionHandlerClusterFollowupDossierControls(handlerClusterGateInput)) {
            prefetchExecutionCoreHandlers('followup-dossier-controls');
        }
        if (shouldLoadExecutionHandlerClusterFollowupOtherParty(handlerClusterGateInput)) {
            prefetchExecutionCoreHandlers('followup-other-party-debtor');
        }
        if (shouldLoadExecutionHandlerClusterDossierSupport(handlerClusterGateInput)) {
            prefetchExecutionCoreHandlers('dossier-support');
        }
    }, [handlerClusterMountKey]);

    const bumpHandlerClusterEpochIfChanged = useCallback(
        (current: Record<string, unknown>, merged: Record<string, unknown>) => {
            if (Object.is(merged, current)) return current;
            queueMicrotask(() => setHandlerClusterEpoch((epoch) => epoch + 1));
            return merged;
        },
        [],
    );

    const onLightHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) => bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)));
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onFollowupAdminSpecialHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onFollowupDossierControlsHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onFollowupOtherPartyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onSeizureHeavyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onCoerciveHeavyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    const onDossierSupportHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            setHandlerCluster((current) =>
                bumpHandlerClusterEpochIfChanged(current, mergeHandlerClusterPatch(current, next)),
            );
        },
        [bumpHandlerClusterEpochIfChanged],
    );

    return {
        loadLightHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadDossierSupportHandlerCluster,
        loadFollowupHeavyHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        loadSeizureRequestsHandlerCluster,
        loadSeizureLogHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        handlerCluster,
        handlerClusterEpoch,
        handlerClusterMountKey,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        dossierSupportHandlerClusterInput,
        onLightHandlerClusterReady,
        onFollowupAdminSpecialHandlerClusterReady,
        onFollowupDossierControlsHandlerClusterReady,
        onFollowupOtherPartyHandlerClusterReady,
        onSeizureHeavyHandlerClusterReady,
        onCoerciveHeavyHandlerClusterReady,
        onDossierSupportHandlerClusterReady,
    };
}
