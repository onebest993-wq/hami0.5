import { useExecutionDecisionsModalController } from '../hooks/useExecutionDecisionsModalController';
import type { ExecutionOrchestratorSlice } from './executionOrchestratorTypes';

export type UseExecutionDecisionsOrchestratorInput = {
    showDecisionsModal: boolean;
    setShowDecisionsModal: (show: boolean) => void;
};

/** modal القرارات + boot state + reload epoch */
export function useExecutionDecisionsOrchestrator({
    showDecisionsModal,
    setShowDecisionsModal,
}: UseExecutionDecisionsOrchestratorInput): ExecutionOrchestratorSlice {
    return useExecutionDecisionsModalController({ showDecisionsModal, setShowDecisionsModal });
}
