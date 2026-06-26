import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
    useExecutionDashboardStore,
    type ModalStates,
} from '@/app/stores/executionDashboardStore';

/** اشتراكات Zustand للنوافذ + تنظيف عند تبديل الإضبارة */
export function useExecutionDashboardModalControls(executionDashboardFileId: string | null) {
    const modals = useExecutionDashboardStore(useShallow((s) => s.modals)) as ModalStates;
    const closeAllModals = useExecutionDashboardStore((s) => s.closeAllModals);
    const resetUIPanelsForExecutionContext = useExecutionDashboardStore(
        (s) => s.resetUIPanelsForExecutionContext,
    );
    const { activeBottomTab, isHeaderExpanded } = useExecutionDashboardStore(
        useShallow((s) => ({
            activeBottomTab: s.ui.activeBottomTab,
            isHeaderExpanded: s.ui.isHeaderExpanded,
        })),
    );
    const toggleHeaderExpanded = useExecutionDashboardStore((s) => s.toggleHeaderExpanded);

    const setExecutionModal = useCallback((key: keyof ModalStates, show: boolean) => {
        const { openModal, closeModal } = useExecutionDashboardStore.getState();
        if (show) openModal(key);
        else closeModal(key);
    }, []);

    const setShowUnifiedExecutionModal = useCallback(
        (show: boolean) => setExecutionModal('showUnifiedExecutionModal', show),
        [setExecutionModal],
    );

    useEffect(() => {
        closeAllModals();
        resetUIPanelsForExecutionContext();
    }, [executionDashboardFileId, closeAllModals, resetUIPanelsForExecutionContext]);

    useEffect(() => {
        return () => {
            const st = useExecutionDashboardStore.getState();
            st.closeAllModals();
            st.resetUIPanelsForExecutionContext();
        };
    }, []);

    return {
        modals,
        setExecutionModal,
        setShowUnifiedExecutionModal,
        activeBottomTab,
        isHeaderExpanded,
        toggleHeaderExpanded,
    };
}
