import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildSessionRecordPayload,
    isOpponentProceedingsEvent,
    isSessionTimelineEvent,
} from '@/app/components/lawyer/smart-modal/smartFile/sessionRecordEngine';
import { storedFastTrackStatus } from '@/app/components/lawyer/smart-modal/smartFile/fastTrackStatus';
import {
    pickNonemptyString,
    readFileDetailsField,
} from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelUtils';

export function buildPersonalStatusHeaderFormData(input: {
    file: SmartFileMainPanelProps['file'];
    parentData: SmartFileMainPanelProps['parentData'];
    displayStage?: CaseStage | null;
    headerParties: CaseStage['parties'];
    primaryCaseNo: string;
    primaryDocType: string;
}) {
    const { file, parentData, displayStage, headerParties, primaryCaseNo, primaryDocType } = input;

    return {
        ...displayStage,
        parties: headerParties,
        caseNo: primaryCaseNo,
        court: pickNonemptyString(
            file?.court,
            parentData?.court,
            readFileDetailsField(file, 'court'),
            displayStage?.court,
        ),
        judge: pickNonemptyString(
            file?.judge,
            parentData?.judge,
            (file as Record<string, unknown> | undefined)?.judgeName,
            readFileDetailsField(file, 'judge'),
            readFileDetailsField(file, 'judgeName'),
            readFileDetailsField(file, 'judge_name'),
            displayStage?.judge,
            (displayStage as Record<string, unknown> | undefined)?.judgeName,
            (displayStage as Record<string, unknown> | undefined)?.judge_name,
        ),
        docType: primaryDocType,
    };
}

export function buildPersonalStatusSessionHubProps(
    p: SmartFileMainPanelProps,
    isViewingArchived: boolean,
) {
    const {
        displayTimeline,
        displayStage,
        editingEvent,
        setEditingEvent,
        handleAddAction,
        setEditingFastTrack,
        setShowFastTrackModal,
        setEditingAttachment,
        setShowAttachmentModal,
        handleSaveFastTrack,
    } = p;

    return {
        readOnly: isViewingArchived,
        visualVariant: 'personal' as const,
        layoutMode: 'personal-pearl' as const,
        timeline: displayTimeline,
        editingSessionRecord:
            editingEvent && isSessionTimelineEvent(editingEvent) && !isOpponentProceedingsEvent(editingEvent)
                ? editingEvent
                : null,
        onCancelEditSessionRecord: () => setEditingEvent(null),
        onSubmitSessionRecord: (data: Parameters<typeof buildSessionRecordPayload>[0] & { id?: string }) => {
            handleAddAction(buildSessionRecordPayload(data, data.id));
        },
        onAddFastTrack: (preset?: { requestType?: string }) => {
            setEditingFastTrack(
                preset?.requestType ? { type: preset.requestType, requestType: preset.requestType } : null,
            );
            setShowFastTrackModal(true);
        },
        petitions: displayStage?.fastTrackPetitions ?? [],
        attachments: displayStage?.attachments ?? [],
        onEditPetition: (petition: {
            id: string;
            requestType?: string;
            type?: string;
            subject?: string;
            reason?: string;
            submissionDate?: string;
            requestDate?: string;
        }) => {
            setEditingFastTrack(petition as unknown as Record<string, unknown>);
            setShowFastTrackModal(true);
        },
        onEditAttachment: (attachment: Record<string, unknown>) => {
            setEditingAttachment(attachment);
            setShowAttachmentModal(true);
        },
        onResolvePetition: (
            petition: {
                id: string;
                requestType?: string;
                type?: string;
                subject?: string;
                reason?: string;
                submissionDate?: string;
                requestDate?: string;
            },
            outcome: 'accepted' | 'rejected',
        ) => {
            handleSaveFastTrack({
                id: petition.id,
                type: petition.requestType || petition.type || '',
                requestType: petition.requestType || petition.type || '',
                reason: petition.subject || petition.reason || '',
                subject: petition.subject || petition.reason || '',
                requestDate: petition.submissionDate || petition.requestDate || '',
                submissionDate: petition.submissionDate || petition.requestDate || '',
                status: storedFastTrackStatus(outcome),
                notes: '',
            });
        },
    };
}
