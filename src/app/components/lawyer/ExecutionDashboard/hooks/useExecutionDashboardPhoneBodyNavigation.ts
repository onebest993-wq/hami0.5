/** Local overlay + dossier tab back — wired to dossier header navigation registry */
import { useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { readExecutionPhoneBodyScope } from './executionPhoneBodyScope';
import { useExecutionDossierHeaderNavigation } from './useExecutionDossierHeaderNavigation';
import { resolveExecutionDossierNestedNav } from '../utils/resolveExecutionDossierNestedNav';

export type UseExecutionDashboardPhoneBodyNavigationParams = {
    scopeRef: MutableRefObject<Record<string, unknown>>;
    onClose?: () => void;
    showExecutionTrashModal: boolean;
    setShowExecutionTrashModal: (open: boolean) => void;
    showUnifiedSeizureLogModal: boolean;
    closeUnifiedSeizureLog: () => void;
    propertySeizureRequestModalOpen: boolean;
    setPropertySeizureRequestModalOpen: (open: boolean) => void;
    movableSeizureRequestModalOpen: boolean;
    setMovableSeizureRequestModalOpen: (open: boolean) => void;
    showExecutionFinancialHub: boolean;
    setShowExecutionFinancialHub: (open: boolean) => void;
    dossierActionModalOpen: boolean;
    setDossierActionModalOpen: (open: boolean) => void;
    dossierLifecyclePanelOpen: boolean;
    setDossierLifecyclePanelOpen: (open: boolean) => void;
    hasChildDossiers: boolean;
    isInabaActive: boolean;
    activeTabId: string;
    currentFileId: string;
    setActiveTabId: (tabId: string) => void;
    activeSubFileId?: string | null;
};

export function useExecutionDashboardPhoneBodyNavigation(
    params: UseExecutionDashboardPhoneBodyNavigationParams,
) {
    const {
        scopeRef,
        onClose,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        dossierActionModalOpen,
        setDossierActionModalOpen,
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        hasChildDossiers,
        isInabaActive,
        activeTabId,
        currentFileId,
        setActiveTabId,
        activeSubFileId,
    } = params;

    const closeLocalOverlay = useCallback(() => {
        const liveScope = readExecutionPhoneBodyScope(scopeRef);
        if (Boolean(liveScope.showExecutionTrashModal)) {
            const setTrash =
                typeof liveScope.setShowExecutionTrashModal === 'function'
                    ? liveScope.setShowExecutionTrashModal
                    : setShowExecutionTrashModal;
            setTrash(false);
            return true;
        }
        if (showExecutionTrashModal) {
            setShowExecutionTrashModal(false);
            return true;
        }
        if (showUnifiedSeizureLogModal) {
            closeUnifiedSeizureLog();
            return true;
        }
        if (propertySeizureRequestModalOpen) {
            setPropertySeizureRequestModalOpen(false);
            return true;
        }
        if (movableSeizureRequestModalOpen) {
            setMovableSeizureRequestModalOpen(false);
            return true;
        }
        if (showExecutionFinancialHub) {
            setShowExecutionFinancialHub(false);
            return true;
        }
        if (dossierActionModalOpen) {
            setDossierActionModalOpen(false);
            return true;
        }
        return false;
    }, [
        scopeRef,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        dossierActionModalOpen,
        setDossierActionModalOpen,
    ]);

    const dossierContextBack = useCallback(() => {
        if (dossierLifecyclePanelOpen) {
            setDossierLifecyclePanelOpen(false);
            return true;
        }
        if (
            hasChildDossiers &&
            !isInabaActive &&
            String(activeTabId) !== String(currentFileId)
        ) {
            setActiveTabId(String(currentFileId || ''));
            return true;
        }
        if (isInabaActive && activeSubFileId) {
            useExecutionDashboardStore.getState().restoreOriginalFile();
            return true;
        }
        return false;
    }, [
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        hasChildDossiers,
        isInabaActive,
        activeTabId,
        currentFileId,
        setActiveTabId,
        activeSubFileId,
    ]);

    const dossierNestedNav = useMemo(
        () =>
            resolveExecutionDossierNestedNav({
                showExecutionTrashModal,
                showUnifiedSeizureLogModal,
                propertySeizureRequestModalOpen,
                movableSeizureRequestModalOpen,
                showExecutionFinancialHub,
                dossierActionModalOpen,
                dossierLifecyclePanelOpen,
                hasChildDossiers,
                isInabaActive,
                activeTabId,
                currentFileId,
                activeSubFileId,
            }),
        [
            showExecutionTrashModal,
            showUnifiedSeizureLogModal,
            propertySeizureRequestModalOpen,
            movableSeizureRequestModalOpen,
            showExecutionFinancialHub,
            dossierActionModalOpen,
            dossierLifecyclePanelOpen,
            hasChildDossiers,
            isInabaActive,
            activeTabId,
            currentFileId,
            activeSubFileId,
        ],
    );

    const navigation = useExecutionDossierHeaderNavigation({
        onClose: () => onClose?.(),
        closeLocalOverlay,
        dossierContextBack,
    });

    return { ...navigation, dossierNestedNav };
}
