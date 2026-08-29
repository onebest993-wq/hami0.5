import type {
    AdditionalExecutionCreditor,
    AdditionalExecutionDebtor,
    ExecutionFile,
    TimelineEvent,
} from '@/app/types/execution';

export interface SubExecutionFile {
    id: string;
    fileNumber: string;
    fileYear?: string;
    parentFileId?: string;
    debtorCourt?: string;
    directorate?: string;
    creditors?: any[];
    debtors?: any[];
    debtAmount?: number;
    claimType?: string;
    status?: string;
    dossier_lifecycle_status?: string;
    debtor_summons_marker?: any;
    decisions: any[];
    timelineEvents: TimelineEvent[];
    createdAt: string;
    updatedAt: string;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
}

export interface ModalStates {
    showPaymentModal: boolean;
    showNotificationModal: boolean;
    showDocumentsModal: boolean;
    showAppointmentModal: boolean;
    showCoerciveModal: boolean;
    showPaymentCalculator: boolean;
    showSettlementCalculator: boolean;
    showNotesModal: boolean;
    showDecisionsModal: boolean;
    showSeizedAssetsModal: boolean;
    showTimelineModal: boolean;
    showUnifiedExecutionModal: boolean;
    showUnifiedSummonsModal: boolean;
    showLedgerModal: boolean;
    showPauseModal: boolean;
    /** لوحة مرجع قانون التنفيذ — جانبية، لا تُغلق النوافذ الرئيسية */
    showLawReferencePanel: boolean;
}

export interface NoteFormData {
    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    taskDueDate: string;
    taskStatus: string;
}

export interface UIState {
    expandedParties: Record<string, boolean>;
    activeBottomTab: string;
    isHeaderExpanded: boolean;
}

export interface DossierLifecycleSlice {
    dossierStatus: string;
    lastActionDate: string;
    dossierStatusReason: string;
    dossierStatusDate: string;
}

export interface ExecutionDashboardState {
    currentFile: ExecutionFile | null;
    _stashedOriginalFile: ExecutionFile | null;
    activeSubFileId: string | null;
    /** معرف الإضبارة الأم في علاقة الإنابة — يُثبَّت عند التبديل إلى الإضبارة الفرعية ويُمسح عند العودة */
    delegationParentFileId: string | null;
    subFiles: SubExecutionFile[];
    linkedDossiers: NonNullable<ExecutionFile['linkedDossiers']>;
    unificationTick: number;
    pendingUnificationLink: {
        decisionId: string;
        targetFileNumber?: string;
        targetYear?: string;
        targetDirectorate?: string;
    } | null;
    additionalCreditors: AdditionalExecutionCreditor[];
    additionalDebtors: AdditionalExecutionDebtor[];
    isSolidaryLiability: boolean;
    modals: ModalStates;
    noteForm: NoteFormData;
    ui: UIState;
    dossierLifecycleByFileId: Record<string, DossierLifecycleSlice>;

    setCurrentFile: (file: ExecutionFile | null) => void;
    updateCurrentFile: (updates: Partial<ExecutionFile>) => void;
    appendTimelineEventToFile: (fileId: string, event: TimelineEvent) => void;
    appendTimelineEventToSubFile: (subFileId: string, parentFileId: string, event: TimelineEvent) => void;
    openModal: (modalName: keyof ModalStates) => void;
    closeModal: (modalName: keyof ModalStates) => void;
    closeAllModals: () => void;
    toggleModal: (modalName: keyof ModalStates) => void;
    updateNoteForm: <K extends keyof NoteFormData>(field: K, value: NoteFormData[K]) => void;
    resetNoteForm: () => void;
    togglePartyExpanded: (partyId: string) => void;
    setActiveBottomTab: (tab: string) => void;
    toggleHeaderExpanded: () => void;
    setHeaderExpanded: (expanded: boolean) => void;
    setActiveSubFileId: (id: string | null) => void;
    setSubFiles: (files: SubExecutionFile[]) => void;
    addSubFile: (file: SubExecutionFile) => void;
    removeSubFile: (id: string) => void;
    swapToSubFile: (subFile: SubExecutionFile) => void;
    restoreOriginalFile: () => void;
    setDelegationParentFileId: (id: string | null) => void;
    setLinkedDossiers: (dossiers: NonNullable<ExecutionFile['linkedDossiers']>) => void;
    addLinkedDossier: (dossier: NonNullable<ExecutionFile['linkedDossiers']>[number]) => void;
    removeLinkedDossier: (linkedId: string) => void;
    generateLinkToken: () => string;
    setParentIdForDossier: (dossierId: string, parentId: string | null) => void;
    getChildDossiers: (rootFileId?: string) => ExecutionFile[];
    setPendingUnificationLink: (link: NonNullable<ExecutionDashboardState['pendingUnificationLink']> | null) => void;
    resetUIPanelsForExecutionContext: () => void;
    reconcileDossierLifecycle: (fileId: string, file?: ExecutionFile | null) => void;
    setDossierStatus: (fileId: string, dossierStatus: string) => void;
    setDossierLastActionDate: (fileId: string, isoDate: string) => void;
    touchDossierProceduralToday: (fileId: string) => void;
    getDossierLifecycleOrDefault: (fileId: string) => DossierLifecycleSlice;
    incorporateDossierMetaUpdate: (fileId: string, isoDate: string, reason: string) => void;
    purgeDossierScopedState: (dossierId: string) => void;
    resetStore: () => void;
}
