import type {
    CaseStage,
    DocumentCategory,
    IncidentalCase,
    IncidentalType,
    TimelineEvent,
} from '../../LawyerShared';

export type ModalShellProps = {
    isOpen: boolean;
    onClose: () => void;
};

export type EditDataProps<T> = {
    editMode?: boolean;
    editData?: T | null;
};

export type DocumentEditData = {
    id?: string;
    title?: string;
    category?: DocumentCategory;
    docCategory?: string;
    evidentiaryWeight?: 'official' | 'ordinary' | 'beginning' | 'other' | 'none';
    details?: string;
    notes?: string;
};

export type IncidentalCaseEditData = Pick<
    IncidentalCase,
    | 'id'
    | 'type'
    | 'partyName'
    | 'details'
    | 'thirdPartyEntryMode'
    | 'affiliationSide'
    | 'affiliationPartyId'
    | 'affiliationPartyName'
    | 'entryDecision'
>;

export type AppointmentEditData = {
    id?: string;
    title?: string;
    date?: string;
    details?: string;
    purpose?: string;
};

export type PauseInterruptionEditData = {
    id?: string;
    reason?: string;
    linkedCaseNo?: string;
    affectedParty?: string;
    date?: string;
    notes?: string;
    decisionType?: string;
    decisionDate?: string;
};

/** حقول تحرير مشتركة لأحداث الخط الزمني في النماذج القديمة */
export type TimelineModalEditData = Partial<
    Pick<TimelineEvent, 'id' | 'title' | 'date' | 'details' | 'type'>
> &
    AppointmentEditData &
    PauseInterruptionEditData &
    DocumentEditData & {
        tags?: string[];
    };

export type ExtraordinaryAppealModalProps = ModalShellProps & {
    onConfirm: (data: { type: string; date: string; court: string; reasons: string }) => void;
    type: string;
    currentCourt?: string;
};

export type AddTaskModalProps = ModalShellProps &
    EditDataProps<{ id?: string; title?: string; dueDate?: string }> & {
        onAdd: (data: { title: string; dueDate?: string; id?: string }) => void;
    };

export type AddDocumentModalProps = ModalShellProps &
    EditDataProps<DocumentEditData> & {
        onAdd: (data: Record<string, unknown>) => void;
    };

export type AddNoteModalProps = ModalShellProps &
    EditDataProps<{ id?: string; title?: string; details?: string; tags?: string[] }> & {
        onAdd: (data: Record<string, unknown>) => void;
        dossierContext?: import('@/app/services/dossier-notes/dossierLawArticleTooltips').DossierNoteContext;
        voiceUserId?: string;
        savedNotes?: import('@/app/components/lawyer/dossier-notes/DossierNotesVault').DossierVaultNote[];
        onDeleteNote?: (id: string) => void;
    };

export type AddPaymentModalProps = ModalShellProps & {
    onAdd: (amount: number, date: string) => void;
};

export type AddIncidentalCaseModalProps = ModalShellProps &
    EditDataProps<IncidentalCaseEditData> & {
        onAdd: (data: Record<string, unknown>) => void;
        onSpawnLinkedCase?: (data: { type: 'joined' | 'counter'; details?: string; incidentalId: string }) => void;
        currentStage?: CaseStage | string;
    };

export type AddAppointmentModalProps = ModalShellProps &
    EditDataProps<AppointmentEditData> & {
        onAdd: (data: Record<string, unknown>) => void;
    };

export type PauseCaseModalProps = ModalShellProps &
    EditDataProps<PauseInterruptionEditData> & {
        onConfirm: (data: Record<string, unknown>) => void;
    };

export type InterruptionModalProps = ModalShellProps &
    EditDataProps<PauseInterruptionEditData> & {
        onConfirm: (data: Record<string, unknown>) => void;
        currentParties?: Array<Record<string, unknown>>;
    };

export type ResumeInterruptionModalProps = ModalShellProps & {
    onConfirm: () => void;
};

export type LegacyModalParty = {
    id?: string | number;
    name: string;
    role?: string;
    isClient?: boolean;
};

export type TransitionModalProps = ModalShellProps & {
    onConfirm: (data: Record<string, unknown>) => void;
    nextStageName?: string;
    currentParties?: LegacyModalParty[];
};

export type SmartFileCaseFormData = {
    caseNo?: string;
    court?: string;
    judge?: string;
    stageName?: string;
    extraordinaryType?: string;
    docType?: string;
    type?: string;
    hasCrossAppeal?: boolean;
    firstInstanceCaseNumber?: string;
    firstInstanceCourt?: string;
    appealCaseNumber?: string;
    appealCourtName?: string;
    thirdParties?: Array<Record<string, unknown>>;
    representedParty?: string | null;
    parties?: Array<Record<string, unknown>>;
};

export type InterlocutoryAppealModalProps = ModalShellProps &
    EditDataProps<PauseInterruptionEditData> & {
        onConfirm: (data: Record<string, unknown>) => void;
    };

export type AddProvisionalOrderModalProps = ModalShellProps & {
    onConfirm: (data: { type: string; targetParty: string }) => void;
    currentParties?: Array<Record<string, unknown>>;
};

export type EditCaseInfoModalProps = ModalShellProps & {
    formData: SmartFileCaseFormData;
    onSave: (data: Record<string, unknown>) => void;
};

export type AppealRegistrationModalProps = ModalShellProps & {
    onConfirm: (data: Record<string, unknown>) => void;
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    stageName?: string | null;
    appealRoute?: import('./appealRouteEligibility').AppealRouteContext | null;
};

export type JudicialNotificationModalProps = ModalShellProps & {
    onConfirm: (data: Record<string, unknown>) => void;
};

export type ObjectionRegistrationModalProps = ModalShellProps & {
    onConfirm: (data: Record<string, unknown>) => void;
};

export type AbsentJudgmentNotificationModalProps = ModalShellProps & {
    onConfirm: (data: { notificationDate: string }) => void;
};

export type OpponentAbsentObjectionModalProps = ModalShellProps & {
    onConfirm: (data: { newCaseNumber: string; filingDate: string }) => void;
};

export type ObjectionJudgmentModalProps = ModalShellProps & {
    onConfirm: (data: Record<string, unknown>) => void;
};

export type { IncidentalType, TimelineEvent };
