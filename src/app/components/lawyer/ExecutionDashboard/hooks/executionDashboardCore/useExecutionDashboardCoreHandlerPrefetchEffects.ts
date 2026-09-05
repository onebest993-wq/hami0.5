import { useCallback, useEffect } from 'react';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../../executionDashboardHandlerClusterBridgeLazy';
import { prefetchExecutionHandlersForStubPath } from './resolveExecutionStubHandlerPrefetchModes';
import {
    prefetchExecutionHandlersForOpenDossier,
    prefetchExecutionHandlersForOpenFollowup,
} from './prefetchExecutionHandlersForDossierPaint';
import {
    registerExecutionHandlerStubNotifier,
    registerExecutionHandlerStubTimeoutNotifier,
} from '../executionHandlerClusterStubs';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import type { PartyDeathLiveHandlers } from './useExecutionDashboardPartyDeathOpeners';

export function useExecutionDashboardCoreHandlerPrefetchEffects({
    executionDataId,
    isEvictionExecutionModule,
    isRepresentingDebtor,
    showToast,
    loadPartyDeathHandlerCluster,
    showUnifiedExecutionModal,
    unifiedModalTab,
    commitPartyDeathLiveHandlers,
}: {
    executionDataId: string | number | undefined;
    isEvictionExecutionModule: boolean;
    isRepresentingDebtor: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    loadPartyDeathHandlerCluster: boolean;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: string | undefined;
    commitPartyDeathLiveHandlers: (cluster: PartyDeathLiveHandlers) => void;
}) {
    useEffect(() => {
        if (!loadPartyDeathHandlerCluster) return;
        return scheduleIdleWork(() => {
            prefetchExecutionHandlerClusterPartyDeathBridge();
        }, 80);
    }, [loadPartyDeathHandlerCluster]);

    const onPartyDeathHandlerClusterReady = useCallback(
        (cluster: Record<string, unknown>) => {
            commitPartyDeathLiveHandlers(cluster as PartyDeathLiveHandlers);
        },
        [commitPartyDeathLiveHandlers],
    );

    useEffect(() => {
        if (!executionDataId) return;
        registerExecutionHandlerStubNotifier((path) => {
            prefetchExecutionHandlersForStubPath(path);
        });
        registerExecutionHandlerStubTimeoutNotifier(() => {
            if (typeof showToast === 'function') {
                showToast('جاري تجهيز الأدوات — أعد المحاولة بعد لحظة.', 'info');
            }
        });
        return () => {
            registerExecutionHandlerStubNotifier(null);
            registerExecutionHandlerStubTimeoutNotifier(null);
        };
    }, [executionDataId, showToast]);

    useEffect(() => {
        if (!executionDataId) return;
        prefetchExecutionHandlersForOpenDossier({ isEvictionExecutionModule });
    }, [executionDataId, isEvictionExecutionModule]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        prefetchExecutionHandlersForOpenFollowup({
            isRepresentingDebtor,
            isEvictionExecutionModule,
            unifiedModalTab,
        });
    }, [isEvictionExecutionModule, isRepresentingDebtor, showUnifiedExecutionModal, unifiedModalTab]);

    return { onPartyDeathHandlerClusterReady };
}
