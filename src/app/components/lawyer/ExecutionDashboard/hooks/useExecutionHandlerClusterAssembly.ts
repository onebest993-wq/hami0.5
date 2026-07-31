/** Handler-cluster load inputs + stub→ready commit machine */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from './executionHandlerClusterStubs';
import { buildExecutionHandlerClusterMountKey } from './executionHandlerClusterGate';
import {
    hasHandlerClusterDelta,
    mergeDossierFollowupHandlers,
} from './executionHandlerClusterEquality';
import { pickFollowupAdminSpecialHandlerClusterInput } from './executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import { pickFollowupOtherPartyHandlerClusterInput } from './executionDashboardCore/followupOtherPartyHandlerClusterInput';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCore/executionDashboardCoreHandlerClusterTypes';
import type { FollowupAdminSpecialHandlerClusterInput } from './executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import type { FollowupOtherPartyHandlerClusterInput } from './executionDashboardCore/followupOtherPartyHandlerClusterInput';

const EMPTY_HANDLER_CLUSTER_INPUT = Object.freeze({});

export type ExecutionHandlerClusterAssemblyInput = {
    loadLightHandlerCluster: boolean;
    loadAnyHeavyHandlerCluster: boolean;
    loadFollowupAdminSpecialHandlerCluster: boolean;
    loadFollowupDossierControlsHandlerCluster: boolean;
    loadFollowupOtherPartyHandlerCluster: boolean;
    loadSeizureHeavyHandlerCluster: boolean;
    loadCoerciveHeavyHandlerCluster: boolean;
    loadPublicationNoticeHandlerCluster: boolean;
    loadDossierSupportHandlerCluster: boolean;
    coreRuntimeVars: Record<string, unknown>;
    followupOrchestrator: Record<string, unknown>;
    seizureOrchestrator: Record<string, unknown>;
    coercionOrchestrator: Record<string, unknown>;
    dossierLifecyclePanel: Record<string, unknown>;
    claimFinancials: Record<string, unknown>;
    graceAndSummoning: Record<string, unknown>;
    debtorWorkspaceContext: Record<string, unknown>;
    subsequentNoticeFlow: Record<string, unknown>;
    followupTabAssembly: Record<string, unknown>;
    followupSeizureTabs: Record<string, unknown>;
    decisionsOrchestrator: Record<string, unknown>;
    executionId: string | null | undefined;
    activeTabId: string | null | undefined;
    decisionsReloadEpoch: number | undefined;
    activeFollowupDebtorKey: string | null | undefined;
};

export function useExecutionHandlerClusterAssembly(input: ExecutionHandlerClusterAssemblyInput) {
    const {
        loadLightHandlerCluster,
        loadAnyHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        loadPublicationNoticeHandlerCluster,
        loadDossierSupportHandlerCluster,
        coreRuntimeVars,
        followupOrchestrator,
        seizureOrchestrator,
        coercionOrchestrator,
        dossierLifecyclePanel,
        claimFinancials,
        graceAndSummoning,
        debtorWorkspaceContext,
        subsequentNoticeFlow,
        followupTabAssembly,
        followupSeizureTabs,
        decisionsOrchestrator,
        executionId,
        activeTabId,
        decisionsReloadEpoch,
        activeFollowupDebtorKey,
    } = input;

    const [handlerCluster, setHandlerCluster] = useState(EXECUTION_HANDLER_CLUSTER_STUBS);
    const [handlerClusterEpoch, setHandlerClusterEpoch] = useState(0);
    const handlerClusterRef = useRef(handlerCluster);
    const pendingClusterPatchesRef = useRef<
        Array<(current: Record<string, unknown>) => Record<string, unknown>>
    >([]);
    const clusterFlushScheduledRef = useRef(false);

    const lightHandlerClusterInput = useMemo(() => {
        if (!loadLightHandlerCluster || loadAnyHeavyHandlerCluster) {
            return EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput;
        }

        return coreRuntimeVars as ExecutionDashboardCoreHandlerClusterInput;
    }, [loadAnyHeavyHandlerCluster, loadLightHandlerCluster, coreRuntimeVars]);

    const handlerClusterHeavySpreads = useMemo(
        () => ({
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
            core: coreRuntimeVars,
        }),
        [
            coreRuntimeVars,
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
        ],
    );

    const followupAdminSpecialHandlerClusterInput = useMemo(
        () =>
            loadFollowupAdminSpecialHandlerCluster
                ? pickFollowupAdminSpecialHandlerClusterInput(handlerClusterHeavySpreads)
                : (EMPTY_HANDLER_CLUSTER_INPUT as FollowupAdminSpecialHandlerClusterInput),
        [loadFollowupAdminSpecialHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupDossierControlsHandlerClusterInput = useMemo(
        () =>
            loadFollowupDossierControlsHandlerCluster
                ? handlerClusterHeavySpreads
                : (EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput),
        [loadFollowupDossierControlsHandlerCluster, handlerClusterHeavySpreads],
    );

    const followupOtherPartyHandlerClusterInput = useMemo(
        () =>
            loadFollowupOtherPartyHandlerCluster
                ? pickFollowupOtherPartyHandlerClusterInput(handlerClusterHeavySpreads)
                : (EMPTY_HANDLER_CLUSTER_INPUT as FollowupOtherPartyHandlerClusterInput),
        [loadFollowupOtherPartyHandlerCluster, handlerClusterHeavySpreads],
    );

    const seizureHeavyHandlerClusterInput = useMemo(
        () =>
            loadSeizureHeavyHandlerCluster
                ? (handlerClusterHeavySpreads as ExecutionDashboardCoreHandlerClusterInput)
                : (EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput),
        [loadSeizureHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const coerciveHeavyHandlerClusterInput = useMemo(
        () =>
            loadCoerciveHeavyHandlerCluster
                ? (handlerClusterHeavySpreads as ExecutionDashboardCoreHandlerClusterInput)
                : (EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput),
        [loadCoerciveHeavyHandlerCluster, handlerClusterHeavySpreads],
    );

    const publicationNoticeHandlerClusterInput = useMemo(
        () =>
            loadPublicationNoticeHandlerCluster
                ? (handlerClusterHeavySpreads as ExecutionDashboardCoreHandlerClusterInput)
                : (EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput),
        [loadPublicationNoticeHandlerCluster, handlerClusterHeavySpreads],
    );

    const dossierSupportHandlerClusterInput = useMemo(
        () =>
            loadDossierSupportHandlerCluster
                ? (handlerClusterHeavySpreads as ExecutionDashboardCoreHandlerClusterInput)
                : (EMPTY_HANDLER_CLUSTER_INPUT as ExecutionDashboardCoreHandlerClusterInput),
        [loadDossierSupportHandlerCluster, handlerClusterHeavySpreads],
    );

    const handlerClusterMountKey = buildExecutionHandlerClusterMountKey({
        executionId,
        activeTabId,
        decisionsReloadEpoch,
        activeFollowupDebtorKey,
    });

    useEffect(() => {
        pendingClusterPatchesRef.current = [];
        clusterFlushScheduledRef.current = false;
        handlerClusterRef.current = EXECUTION_HANDLER_CLUSTER_STUBS;
        setHandlerCluster(EXECUTION_HANDLER_CLUSTER_STUBS);
        setHandlerClusterEpoch(0);
    }, [handlerClusterMountKey]);

    useEffect(() => {
        handlerClusterRef.current = handlerCluster;
    }, [handlerCluster]);

    const commitHandlerClusterDelta = useCallback(
        (buildNext: (current: Record<string, unknown>) => Record<string, unknown>) => {
            pendingClusterPatchesRef.current.push(buildNext);
            if (clusterFlushScheduledRef.current) return;
            clusterFlushScheduledRef.current = true;
            queueMicrotask(() => {
                clusterFlushScheduledRef.current = false;
                const patches = pendingClusterPatchesRef.current;
                pendingClusterPatchesRef.current = [];
                if (!patches.length) return;
                const current = handlerClusterRef.current;
                let next = current;
                for (const build of patches) {
                    next = build(next);
                }
                if (!hasHandlerClusterDelta(current, next)) {
                    return;
                }
                handlerClusterRef.current = next;
                setHandlerCluster(next);
                setHandlerClusterEpoch((epoch) => epoch + 1);
            });
        },
        [],
    );

    const onLightHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({ ...current, ...next }));
        },
        [commitHandlerClusterDelta],
    );

    const onFollowupAdminSpecialHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({
                ...current,
                ...next,
                dossierFollowupHandlers: mergeDossierFollowupHandlers(current, next),
            }));
        },
        [commitHandlerClusterDelta],
    );

    const onFollowupDossierControlsHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({
                ...current,
                ...next,
                dossierFollowupHandlers: mergeDossierFollowupHandlers(current, next),
            }));
        },
        [commitHandlerClusterDelta],
    );

    const onFollowupOtherPartyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({
                ...current,
                ...next,
                dossierFollowupHandlers: mergeDossierFollowupHandlers(current, next),
            }));
        },
        [commitHandlerClusterDelta],
    );

    const onSeizureHeavyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({ ...current, ...next }));
        },
        [commitHandlerClusterDelta],
    );

    const onCoerciveHeavyHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({
                ...EXECUTION_HANDLER_CLUSTER_STUBS,
                ...current,
                ...next,
            }));
        },
        [commitHandlerClusterDelta],
    );

    const onDossierSupportHandlerClusterReady = useCallback(
        (next: Record<string, unknown>) => {
            commitHandlerClusterDelta((current) => ({ ...current, ...next }));
        },
        [commitHandlerClusterDelta],
    );

    return {
        handlerCluster,
        handlerClusterEpoch,
        handlerClusterMountKey,
        lightHandlerClusterInput,
        followupAdminSpecialHandlerClusterInput,
        followupDossierControlsHandlerClusterInput,
        followupOtherPartyHandlerClusterInput,
        seizureHeavyHandlerClusterInput,
        coerciveHeavyHandlerClusterInput,
        publicationNoticeHandlerClusterInput,
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
