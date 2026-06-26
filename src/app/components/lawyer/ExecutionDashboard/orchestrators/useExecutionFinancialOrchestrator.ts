import { useCallback, useState } from 'react';
import type { ExecutionFinancialOrchestratorSlice } from './executionOrchestratorSliceTypes';

export type UseExecutionFinancialOrchestratorParams = {
    setShowUnifiedExecutionModal: (show: boolean) => void;
};

/** مركز العمليات المالية + financial hub */
export function useExecutionFinancialOrchestrator({
    setShowUnifiedExecutionModal,
}: UseExecutionFinancialOrchestratorParams): ExecutionFinancialOrchestratorSlice {
    const [isFinancialCenterExpanded, setIsFinancialCenterExpanded] = useState(false);
    const [activeFinancialTab, setActiveFinancialTab] = useState(1);
    const [showExecutionFinancialHub, setShowExecutionFinancialHub] = useState(false);
    const [financialHubAutoOpenMode, setFinancialHubAutoOpenMode] = useState<'disburse' | null>(null);
    const [financialHubSeizedMovableId, setFinancialHubSeizedMovableId] = useState<string | null>(null);
    const [financialHubSeizedPropertyId, setFinancialHubSeizedPropertyId] = useState<string | null>(null);

    const openFinancialHubLedger = useCallback(() => {
        setShowUnifiedExecutionModal(false);
        setIsFinancialCenterExpanded(true);
        setShowExecutionFinancialHub(true);
    }, [setShowUnifiedExecutionModal]);

    return {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    };
}
