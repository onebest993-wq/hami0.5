export type UrgentPartyEntry = {
    name: string;
    type: 'person' | 'company' | string;
    phone?: string;
    address: string;
    isRepresented: boolean;
    isClient?: boolean;
};

export type UrgentActionFormData = {
    actionType: string;
    requestNumber: string;
    requestDate: string;
    firstHearingDate?: string;
    courtName: string;
    judgeName: string;
    specificActionType: string;
    procedureDetails: string;
    requestSubject: string;
    urgentReason: string;
    legalBasis: string;
    deadlineGrievance3Days: boolean;
    deadlineTamyeez7Days: boolean;
    notes: string;
    defenderEntryPhase: 1 | 2 | 3;
    stateOrderIssuedDate: string;
    defenderPhase3GrievanceDecisionDate: string;
};

export interface UrgentActionsFormProps {
    onClose: () => void;
    onSave: (data: Record<string, unknown>) => void;
    initialActionType?: 'state_order' | 'urgent_discovery' | 'acknowledgment';
}
