import type { ReactNode } from 'react';
import { formatDateText, formatDateTimeText, formatRequestNumberText } from '../utils/formatters';
import type { ActiveOrderFileViewProps } from '../layout/ActiveOrderFileViewProps';
import type { LifecyclePanelProps } from '../layout/buildLifecyclePanelProps';
import type { useOrderFileCasePathway } from './useOrderFileCasePathway';
import type { useOrderFilePartyWorkspace } from './useOrderFilePartyWorkspace';
import type { useOrderFileMetaPartyEdit } from './useOrderFileMetaPartyEdit';
import type { useOrderFileWorkspace } from './useOrderFileWorkspace';
import type { useOrderFileLifecycleDerived } from './useOrderFileLifecycleDerived';
import type { useDecisionNotificationSubmit } from './useDecisionNotificationSubmit';

type CasePathway = ReturnType<typeof useOrderFileCasePathway>;
type PartyWorkspace = ReturnType<typeof useOrderFilePartyWorkspace>;
type MetaPartyEdit = ReturnType<typeof useOrderFileMetaPartyEdit>;
type OrderWorkspaceActions = ReturnType<typeof useOrderFileWorkspace>;
type LifecycleDerived = ReturnType<typeof useOrderFileLifecycleDerived>;

type CaseDataLike = {
    requestDate?: string;
    requestNumber?: string;
    courtName?: string;
    specificActionType?: string;
    actionPath?: string;
    archivedAt?: string | null;
};

type AssembleActiveOrderFileViewInput = {
    onClose: () => void;
    confirmPortal: ReactNode;
    lifecyclePanelProps: LifecyclePanelProps;
    casePathway: CasePathway;
    partyWorkspace: PartyWorkspace;
    metaPartyEdit: MetaPartyEdit;
    orderWorkspaceActions: OrderWorkspaceActions;
    caseFollowups: unknown[];
    caseEvents: unknown[];
    caseNotes: unknown[];
    caseAttachments: unknown[];
    todayYmdValue: string;
    requestDateYmd: string;
    lifecycleDerived: LifecycleDerived;
    caseData: CaseDataLike | null | undefined;
    decisionNotificationModalOpen: boolean;
    setDecisionNotificationModalOpen: (open: boolean) => void;
    submitDecisionNotification: ReturnType<typeof useDecisionNotificationSubmit>;
};

export function assembleActiveOrderFileViewProps(
    input: AssembleActiveOrderFileViewInput,
): ActiveOrderFileViewProps {
    const {
        onClose,
        confirmPortal,
        lifecyclePanelProps,
        casePathway,
        partyWorkspace,
        metaPartyEdit,
        orderWorkspaceActions,
        caseFollowups,
        caseEvents,
        caseNotes,
        caseAttachments,
        todayYmdValue,
        requestDateYmd,
        lifecycleDerived,
        caseData,
        decisionNotificationModalOpen,
        setDecisionNotificationModalOpen,
        submitDecisionNotification,
    } = input;

    const { requestTypeText, isIqrarContext, procedureDetailsForPopover } = casePathway;
    const {
        party1Entries,
        party2Entries,
        isFinalized,
        workspaceHeaderTitle,
    } = partyWorkspace;
    const {
        isDossierEditOpen,
        dossierEditForm,
        setDossierEditForm,
        closeDossierEdit,
        saveDossierEdit,
    } = metaPartyEdit;
    const {
        newEventText,
        setNewEventText,
        newNoteText,
        setNewNoteText,
        newFollowupTitle,
        setNewFollowupTitle,
        newFollowupDate,
        setNewFollowupDate,
        attachmentsError,
        addManualEvent,
        addCaseNote,
        deleteCaseNote,
        addAttachmentFile,
        deleteAttachment,
        addFollowup,
        toggleFollowupCompleted,
        deleteFollowup,
        attachmentInputId,
        caseEventDayGroups,
    } = orderWorkspaceActions;

    const archivedAtRaw = caseData?.archivedAt;
    const archivedAt =
        typeof archivedAtRaw === 'string' ? archivedAtRaw : archivedAtRaw != null ? String(archivedAtRaw) : undefined;

    return {
        onClose,
        confirmPortal,
        lifecyclePanelProps,
        decisionNotificationModal: {
            isOpen: decisionNotificationModalOpen,
            onClose: () => setDecisionNotificationModalOpen(false),
            caseName:
                String(caseData?.specificActionType ?? caseData?.actionPath ?? requestTypeText ?? '').trim() || '—',
            minActionDate: lifecycleDerived.decisionNotificationQuickLogMinYmd || undefined,
            onSubmit: ({ actionDate }: { actionDate: string }) => {
                setDecisionNotificationModalOpen(false);
                submitDecisionNotification(actionDate);
            },
        },
        dossierEdit: {
            open: isDossierEditOpen,
            isIqrarContext,
            procedureType: String(caseData?.specificActionType ?? ''),
            dossierEditForm,
            setDossierEditForm,
            onClose: closeDossierEdit,
            onSave: saveDossierEdit,
        },
        header: {
            workspaceHeaderTitle,
            requestNumberText: caseData?.requestNumber
                ? formatRequestNumberText(caseData.requestNumber, caseData?.requestDate)
                : '',
            procedureDetailsForPopover,
            courtName: String(caseData?.courtName ?? ''),
            isFinalized,
            isIqrarContext,
            statusConfig: casePathway.statusConfig,
            nextHearingDate: String(lifecycleDerived.nextHearingDate ?? ''),
            reportDueSoon: lifecycleDerived.reportDueSoon,
            formatDateText,
            onOpenEdit: metaPartyEdit.openDossierEdit,
        },
        archive: isFinalized
            ? {
                  isIqrarContext,
                  archiveSummaryText: lifecycleDerived.archiveSummaryText,
                  archivedAt,
                  formatDateTimeText,
              }
            : undefined,
        parties: {
            party1Entries,
            party2Entries,
            procedureType: String(caseData?.specificActionType ?? ''),
        },
        adminWorkspace: {
            isIqrarContext,
            isFinalized,
            newFollowupTitle,
            setNewFollowupTitle,
            newFollowupDate,
            setNewFollowupDate,
            requestDateYmd,
            addFollowup,
            caseFollowups,
            todayYmdValue,
            toggleFollowupCompleted,
            deleteFollowup,
            caseEvents,
            newEventText,
            setNewEventText,
            addManualEvent,
            caseEventDayGroups,
            newNoteText,
            setNewNoteText,
            addCaseNote,
            caseNotes,
            deleteCaseNote,
            attachmentsError,
            attachmentInputId,
            addAttachmentFile,
            caseAttachments,
            deleteAttachment,
        },
    };
}
