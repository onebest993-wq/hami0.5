import { useExecutionDecisionsModalController } from '../hooks/useExecutionDecisionsModalController';
import type { ExecutionDecisionsOrchestratorSlice } from './executionDecisionsOrchestratorTypes';

export type UseExecutionDecisionsOrchestratorInput = {
    showDecisionsModal: boolean;
    setShowDecisionsModal: (show: boolean) => void;
};

/** modal القرارات + boot state + reload epoch */
export function useExecutionDecisionsOrchestrator({
    showDecisionsModal,
    setShowDecisionsModal,
}: UseExecutionDecisionsOrchestratorInput): ExecutionDecisionsOrchestratorSlice {
    return useExecutionDecisionsModalController({ showDecisionsModal, setShowDecisionsModal });
}
