import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DossierLifecycleStatus } from '@/app/types/execution';

export type ExecutionFinancialOrchestratorSlice = {
    isFinancialCenterExpanded: boolean;
    setIsFinancialCenterExpanded: Dispatch<SetStateAction<boolean>>;
    activeFinancialTab: number;
    setActiveFinancialTab: Dispatch<SetStateAction<number>>;
    showExecutionFinancialHub: boolean;
    setShowExecutionFinancialHub: Dispatch<SetStateAction<boolean>>;
    financialHubAutoOpenMode: 'disburse' | null;
    setFinancialHubAutoOpenMode: Dispatch<SetStateAction<'disburse' | null>>;
    financialHubSeizedMovableId: string | null;
    setFinancialHubSeizedMovableId: Dispatch<SetStateAction<string | null>>;
    financialHubSeizedPropertyId: string | null;
    setFinancialHubSeizedPropertyId: Dispatch<SetStateAction<string | null>>;
    openFinancialHubLedger: () => void;
};

export type ExecutionDossierTabOrchestratorSlice = {
    activeTabId: string;
    setActiveTabId: Dispatch<SetStateAction<string>>;
};

export type DossierLifecyclePopStyle = {
    top: number;
    left: number;
    width: number;
};

export type ExecutionDossierLifecyclePanelOrchestratorSlice = {
    dossierStatusDraft: DossierLifecycleStatus;
    setDossierStatusDraft: Dispatch<SetStateAction<DossierLifecycleStatus>>;
    dossierReasonDraft: string;
    setDossierReasonDraft: Dispatch<SetStateAction<string>>;
    dossierDateDraft: string;
    setDossierDateDraft: Dispatch<SetStateAction<string>>;
    dossierLifecyclePanelOpen: boolean;
    setDossierLifecyclePanelOpen: Dispatch<SetStateAction<boolean>>;
    dossierLifecyclePanelPhase: 'menu' | 'details';
    setDossierLifecyclePanelPhase: Dispatch<SetStateAction<'menu' | 'details'>>;
    dossierPendingStatus: DossierLifecycleStatus | null;
    setDossierPendingStatus: Dispatch<SetStateAction<DossierLifecycleStatus | null>>;
    dossierLifecyclePopoverRef: MutableRefObject<HTMLDivElement | null>;
    dossierLifecyclePanelPortalRef: MutableRefObject<HTMLDivElement | null>;
    dossierLifecyclePopStyle: DossierLifecyclePopStyle | null;
    setDossierLifecyclePopStyle: Dispatch<SetStateAction<DossierLifecyclePopStyle | null>>;
    closeDossierLifecyclePanel: () => void;
};

export type ExecutionDossierLifecycleActionsOrchestratorSlice = {
    applyDossierLifecycleToFileAndTimeline: (
        status: DossierLifecycleStatus,
        reason: string,
        date: string,
    ) => boolean;
    handleDossierLifecyclePick: (picked: DossierLifecycleStatus) => void;
    handleDossierLifecycleConfirmDetails: (reasonOverride?: string, dateOverride?: string) => void;
};

export type ExecutionPartiesOrchestratorSlice = {
    showExtraCreditors: boolean;
    setShowExtraCreditors: Dispatch<SetStateAction<boolean>>;
    showExtraDebtors: boolean;
    setShowExtraDebtors: Dispatch<SetStateAction<boolean>>;
};

export type ExecutionDomainOrchestratorSlice =
    | ExecutionFinancialOrchestratorSlice
    | ExecutionDossierTabOrchestratorSlice
    | ExecutionDossierLifecyclePanelOrchestratorSlice
    | ExecutionDossierLifecycleActionsOrchestratorSlice
    | ExecutionPartiesOrchestratorSlice;
