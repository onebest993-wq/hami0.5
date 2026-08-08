import { useCallback, useEffect } from 'react';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../../executionDashboardHandlerClusterBridgeLazy';
import { prefetchExecutionCoreHandlers } from '../../executionCoreHandlersPrefetch';
import { prefetchEvictionFieldProceduresPanel } from '../../executionDashboardLazyRegistry';
import { registerExecutionHandlerStubNotifier } from '../executionHandlerClusterStubs';
import { prefetchExecutionHandlersForStubPath } from './resolveExecutionStubHandlerPrefetchModes';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import type { PartyDeathLiveHandlers } from './useExecutionDashboardPartyDeathOpeners';

export function useExecutionDashboardCoreHandlerPrefetchEffects({
    executionDataId,
    isEvictionExecutionModule,
    showToast,
    loadPartyDeathHandlerCluster,
    showUnifiedExecutionModal,
    unifiedModalTab,
    commitPartyDeathLiveHandlers,
}: {
    executionDataId: string | number | undefined;
    isEvictionExecutionModule: boolean;
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
            if (typeof showToast === 'function') {
                showToast('جاري تجهيز الأدوات — أعد المحاولة بعد لحظة.', 'info');
            }
            if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
                console.warn('[execution] handler still stub:', path);
            }
        });
        return () => {
            registerExecutionHandlerStubNotifier(null);
        };
    }, [executionDataId, showToast]);

    useEffect(() => {
        if (!executionDataId) return;
        return scheduleIdleWork(() => {
            prefetchExecutionCoreHandlers('seizure-requests');
            prefetchExecutionCoreHandlers('seizure-log');
            prefetchExecutionCoreHandlers('dossier-support');
            prefetchExecutionCoreHandlers('followup-admin-special');
            prefetchExecutionCoreHandlers('followup-dossier-controls');
            prefetchExecutionCoreHandlers('followup-other-party-debtor');
            prefetchExecutionCoreHandlers('coercive');
            if (isEvictionExecutionModule) {
                prefetchExecutionCoreHandlers('coercive-eviction');
                prefetchExecutionCoreHandlers('coercive-lifecycle');
                prefetchEvictionFieldProceduresPanel();
            }
        }, 350);
    }, [executionDataId, isEvictionExecutionModule]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        prefetchExecutionCoreHandlers('seizure-requests');
        prefetchExecutionCoreHandlers('followup-admin-special');
        prefetchExecutionCoreHandlers('followup-dossier-controls');
        prefetchExecutionCoreHandlers('followup-other-party-debtor');
        prefetchExecutionCoreHandlers('coercive');
        prefetchExecutionCoreHandlers('coercive-eviction');
        prefetchExecutionCoreHandlers('coercive-lifecycle');
        const tab = String(unifiedModalTab || '').trim();
        if (tab === 'coercive' || tab === 'personal') {
            prefetchExecutionCoreHandlers('coercive-employee');
        }
    }, [showUnifiedExecutionModal, unifiedModalTab]);

    return { onPartyDeathHandlerClusterReady };
}
