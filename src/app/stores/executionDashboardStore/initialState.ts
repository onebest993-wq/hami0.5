import type { ModalStates, NoteFormData, UIState } from './types';

export const initialModalStates: ModalStates = {
    showPaymentModal: false,
    showNotificationModal: false,
    showDocumentsModal: false,
    showAppointmentModal: false,
    showCoerciveModal: false,
    showPaymentCalculator: false,
    showSettlementCalculator: false,
    showNotesModal: false,
    showDecisionsModal: false,
    showSeizedAssetsModal: false,
    showTimelineModal: false,
    showUnifiedExecutionModal: false,
    showUnifiedSummonsModal: false,
    showLedgerModal: false,
    showPauseModal: false,
    showLawReferencePanel: false,
};

export const EXECUTION_EXCLUSIVE_MAIN_MODALS: (keyof ModalStates)[] = [
    'showPaymentModal', 'showNotificationModal', 'showDocumentsModal',
    'showAppointmentModal', 'showCoerciveModal', 'showPaymentCalculator', 'showSettlementCalculator',
    'showNotesModal', 'showDecisionsModal', 'showSeizedAssetsModal', 'showTimelineModal',
    'showUnifiedExecutionModal', 'showUnifiedSummonsModal', 'showLedgerModal', 'showPauseModal',
];

export const initialNoteForm: NoteFormData = {
    noteTitle: '',
    noteBody: '',
    isTask: false,
    taskDueDate: '',
    taskStatus: 'pending',
};

export const initialUIState: UIState = {
    expandedParties: {},
    activeBottomTab: 'all',
    isHeaderExpanded: false,
};
