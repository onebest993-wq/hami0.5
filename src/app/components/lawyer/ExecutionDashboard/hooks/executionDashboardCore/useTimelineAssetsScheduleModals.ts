import { useState } from 'react';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
    ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';

/** Appointment / executor schedule / break-inventory / custodian modal local state */
export function useTimelineAssetsScheduleModals() {
    const [noteText, setNoteText] = useState('');
    const [appointmentPurpose, setAppointmentPurpose] = useState('');
    const [appointmentDateOnly, setAppointmentDateOnly] = useState('');
    const [appointmentTimeOptional, setAppointmentTimeOptional] = useState('');
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [appointmentContext, setAppointmentContext] = useState<
        null | { kind: 'police_assistance'; decisionId: string; agencyName: string }
    >(null);
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
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | {
        onConfirm: () => void;
    }>(null);

    return {
        noteText,
        setNoteText,
        appointmentPurpose,
        setAppointmentPurpose,
        appointmentDateOnly,
        setAppointmentDateOnly,
        appointmentTimeOptional,
        setAppointmentTimeOptional,
        editingAppointmentId,
        setEditingAppointmentId,
        appointmentContext,
        setAppointmentContext,
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
