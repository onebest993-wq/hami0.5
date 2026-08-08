import { useExecutionFollowupController } from '../hooks/useExecutionFollowupController';
import { useExecutionSummonsHub } from '../hooks/useExecutionSummonsHub';
import type { ExecutionOrchestratorCoreInput } from './executionOrchestratorTypes';
import type { ExecutionFollowupOrchestratorSlice } from './executionFollowupOrchestratorTypes';

export type UseExecutionFollowupOrchestratorInput = Pick<
    ExecutionOrchestratorCoreInput,
    'showUnifiedExecutionModal' | 'executionData' | 'setExecutionModal' | 'executionDashboardFileId'
>;

/** محضر المتابعة + إخلاء + مركز الاستدعاءات */
export function useExecutionFollowupOrchestrator({
    showUnifiedExecutionModal,
    executionData,
    setExecutionModal,
    executionDashboardFileId,
}: UseExecutionFollowupOrchestratorInput): ExecutionFollowupOrchestratorSlice {
    const followup = useExecutionFollowupController({
        showUnifiedExecutionModal,
        executionData,
        setExecutionModal,
    });

    const summons = useExecutionSummonsHub({
        executionDashboardFileId,
        setExecutionModal,
        setUnifiedModalTab: followup.setUnifiedModalTab,
    });

    return { ...followup, ...summons };
}
