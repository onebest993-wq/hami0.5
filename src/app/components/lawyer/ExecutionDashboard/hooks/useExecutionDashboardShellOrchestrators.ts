import type { ExecutionFile } from '@/app/types/execution';
import { mergeOrchestratorSlices } from '../orchestrators/executionOrchestratorTypes';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../orchestrators/useExecutionDossierLifecyclePanelOrchestrator';
import { useExecutionDossierTabOrchestrator } from '../orchestrators/useExecutionDossierTabOrchestrator';
import { useExecutionFinancialOrchestrator } from '../orchestrators/useExecutionFinancialOrchestrator';
import { useExecutionPartiesOrchestrator } from '../orchestrators/useExecutionPartiesOrchestrator';

export type UseExecutionDashboardShellOrchestratorsParams = {
    executionFileKey: string;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    setShowUnifiedExecutionModal: (show: boolean) => void;
};

/** حالة UI منفصلة — تبويبات، أطراف، مالي، دورة حياة الإضبارة */
export function useExecutionDashboardShellOrchestrators({
    executionFileKey,
    currentFileId,
    executionData,
    setShowUnifiedExecutionModal,
}: UseExecutionDashboardShellOrchestratorsParams) {
    const parties = useExecutionPartiesOrchestrator(executionFileKey);
    const dossierTab = useExecutionDossierTabOrchestrator(currentFileId);
    const financial = useExecutionFinancialOrchestrator({ setShowUnifiedExecutionModal });
    const dossierLifecyclePanel = useExecutionDossierLifecyclePanelOrchestrator(executionData);

    return mergeOrchestratorSlices(parties, dossierTab, financial, dossierLifecyclePanel);
}
