import { useCallback, useEffect, useRef } from 'react';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';

type PrefetchMode = 'followup-dossier-controls' | 'followup-admin-special';

export function useExecutionFollowupModalLiveHandlers(params: {
    handleDossierAction: ((payload: unknown) => unknown) | undefined;
    submitSpecialFollowupRequest: (() => unknown) | undefined;
    isRepresentingDebtor: boolean | undefined;
    showToast: (message: string, type?: string) => void;
    setDossierActionModalSaving: (saving: boolean) => void;
}) {
    const {
        handleDossierAction,
        submitSpecialFollowupRequest,
        isRepresentingDebtor,
        showToast,
        setDossierActionModalSaving,
    } = params;

    const handleDossierActionRef = useRef(handleDossierAction);
    const submitSpecialFollowupRequestRef = useRef(submitSpecialFollowupRequest);
    useEffect(() => {
        handleDossierActionRef.current = handleDossierAction;
    }, [handleDossierAction]);
    useEffect(() => {
        submitSpecialFollowupRequestRef.current = submitSpecialFollowupRequest;
    }, [submitSpecialFollowupRequest]);

    const awaitLiveFollowupHandler = useCallback(
        async <T extends (...args: never[]) => unknown>(
            readHandler: () => T | undefined,
            loadBridge: () => Promise<void>,
            prefetchMode: PrefetchMode,
        ): Promise<T | null> => {
            const immediate = readHandler();
            if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
                return immediate;
            }
            const { prefetchExecutionCoreHandlers } = await import('../executionCoreHandlersPrefetch');
            prefetchExecutionCoreHandlers(prefetchMode);
            await loadBridge();
            const deadline = Date.now() + 2400;
            while (Date.now() < deadline) {
                const candidate = readHandler();
                if (typeof candidate === 'function' && !isExecutionHandlerStubLeaf(candidate)) {
                    return candidate;
                }
                await new Promise((resolve) => setTimeout(resolve, 80));
            }
            return null;
        },
        [],
    );

    const handleSpecialFollowupSubmit = useCallback(() => {
        if (isRepresentingDebtor) {
            showToast('غير متاح لوكيل المدين: طلبات الإدارة الخاصة', 'warning');
            return undefined;
        }
        const immediate = submitSpecialFollowupRequestRef.current;
        if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
            return immediate();
        }
        void (async () => {
            const { loadExecutionHandlerClusterFollowupAdminSpecialBridge } = await import(
                '../executionDashboardHandlerClusterBridgeLazy'
            );
            const live = await awaitLiveFollowupHandler(
                () => submitSpecialFollowupRequestRef.current,
                loadExecutionHandlerClusterFollowupAdminSpecialBridge,
                'followup-admin-special',
            );
            if (live) {
                live();
                return;
            }
            showToast('جاري تجهيز أدوات الطلبات — أعد المحاولة بعد لحظة.', 'info');
        })();
        return undefined;
    }, [awaitLiveFollowupHandler, isRepresentingDebtor, showToast]);

    const safeHandleDossierAction = useCallback(
        async (payload: unknown) => {
            const immediate = handleDossierActionRef.current;
            if (typeof immediate === 'function' && !isExecutionHandlerStubLeaf(immediate)) {
                return await immediate(payload);
            }
            const { loadExecutionHandlerClusterFollowupDossierControlsBridge } = await import(
                '../executionDashboardHandlerClusterBridgeLazy'
            );
            const live = await awaitLiveFollowupHandler(
                () => handleDossierActionRef.current,
                loadExecutionHandlerClusterFollowupDossierControlsBridge,
                'followup-dossier-controls',
            );
            if (live) {
                return await live(payload);
            }
            showToast('جاري تجهيز أدوات الإضبارة — أعد المحاولة بعد لحظة.', 'info');
            setDossierActionModalSaving(false);
            return false;
        },
        [awaitLiveFollowupHandler, setDossierActionModalSaving, showToast],
    );

    return {
        handleSpecialFollowupSubmit,
        safeHandleDossierAction,
    };
}
