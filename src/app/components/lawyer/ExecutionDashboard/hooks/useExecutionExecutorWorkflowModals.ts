import { useState } from 'react';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
    ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';

/** نوافذ سير عمل المنفّذ (جدولة، كسر، حارس) */
export function useExecutionExecutorWorkflowModals() {
    const [executorScheduleModalOpen, setExecutorScheduleModalOpen] = useState(false);
    const [executorScheduleContext, setExecutorScheduleContext] = useState<null | {
        requestTitle: string;
        onSaved: (payload: ScheduledDateSavePayload) => void;
    }>(null);
    const [breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen] = useState(false);
    const [breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx] = useState<null | {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
        onFinalize: () => void;
    }>(null);
    const [judicialCustodianModalOpen, setJudicialCustodianModalOpen] = useState(false);
    const [judicialCustodianModalCtx, setJudicialCustodianModalCtx] = useState<null | {
        requestTitle: string;
        onSaved: (payload: JudicialCustodianSavePayload) => void;
        initialName?: string;
        initialSalary?: string;
    }>(null);
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | { onConfirm: () => void }>(
        null,
    );

    return {
        executorScheduleModalOpen,
        setExecutorScheduleModalOpen,
        executorScheduleContext,
        setExecutorScheduleContext,
        breakInventoryFurnitureModalOpen,
        setBreakInventoryFurnitureModalOpen,
        breakInventoryFurnitureModalCtx,
        setBreakInventoryFurnitureModalCtx,
        judicialCustodianModalOpen,
        setJudicialCustodianModalOpen,
        judicialCustodianModalCtx,
        setJudicialCustodianModalCtx,
        executionReportPrompt,
        setExecutionReportPrompt,
    };
}
