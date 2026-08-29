import React, { Suspense, lazy } from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import type { TimelineEvent } from '@/app/components/lawyer/lawyerShared/stageTimelineTypes';
import { LazyEditCaseInfoModal, LazyFastTrackModal, LazyAttachmentShieldModal } from '../../lazySmartFileModalChunks';
import type { SmartFileCaseFormData } from '../../smartFile/modalFormTypes';
import { inferLawsuitTypeFromDocType } from '@/app/services/dossier-notes/dossierLawArticleTooltips';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';

const LazyAddDocumentModal = lazy(() =>
    import('../../modals/contentEntry/AddDocumentModal').then((m) => ({ default: m.AddDocumentModal })),
);
const LazyAddNoteModal = lazy(() =>
    import('../../modals/contentEntry/AddNoteModal').then((m) => ({ default: m.AddNoteModal })),
);
const LazyAddPaymentModal = lazy(() =>
    import('../../modals/contentEntry/AddPaymentModal').then((m) => ({ default: m.AddPaymentModal })),
);
const LazyAddAppointmentModal = lazy(() =>
    import('../../modals/contentEntry/AddAppointmentModal').then((m) => ({
        default: m.AddAppointmentModal,
    })),
);
const LazyAddIncidentalCaseModal = lazy(() =>
    import('../../modals/flow-modals/AddIncidentalCaseModal').then((m) => ({
        default: m.AddIncidentalCaseModal,
    })),
);

function visibleTimelineByType(
    timeline: TimelineEvent[] | undefined,
    type: 'appointment' | 'document',
) {
    return (timeline ?? []).filter(
        (event) =>
            event?.type === type &&
            !(event as { isDeleted?: boolean }).isDeleted,
    );
}

/** نوافذ الإدخال — lazy خلف show* مع prefetch عند فتح الإضبارة. */
export function SmartFileModalsContentSection(props: SmartFileModalsPortalProps) {
    const {
        showEditInfoModal,
        setShowEditInfoModal,
        showDocModal,
        setShowDocModal,
        showNoteModal,
        setShowNoteModal,
        showPaymentModal,
        setShowPaymentModal,
        showIncidentalModal,
        setShowIncidentalModal,
        showFastTrackModal,
        setShowFastTrackModal,
        showAttachmentModal,
        setShowAttachmentModal,
        showApptModal,
        setShowApptModal,
        editingEvent,
        setEditingEvent,
        editingIncidental,
        setEditingIncidental,
        editingFastTrack,
        setEditingFastTrack,
        editingAttachment,
        setEditingAttachment,
        displayStage,
        currentStage,
        parentData,
        handlers: h,
        isCaseLinkViewOnly = false,
    } = props;
    const recentAppointments = visibleTimelineByType(
        displayStage.timeline,
        'appointment',
    );
    const recentDocuments = visibleTimelineByType(
        displayStage.timeline,
        'document',
    );

    return (
        <>
                {showEditInfoModal ? (
                    <Suspense fallback={null}>
                    <LazyEditCaseInfoModal
                        key="edit-info"
                        isOpen={showEditInfoModal}
                        onClose={() => setShowEditInfoModal(false)}
                        formData={{
                            ...(displayStage as unknown as SmartFileCaseFormData),
                            docType: parentData.docType || displayStage.type,
                            representedParty: parentData.representedParty,
                        }}
                        onSave={h.handleUpdateCaseInfo}
                    />
                    </Suspense>
                ) : null}
                {showDocModal ? (
                    <Suspense fallback={null}>
                    <LazyAddDocumentModal
                        key="add-doc"
                        isOpen={showDocModal}
                        onClose={() => {
                            setShowDocModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddDoc}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                        recentDocuments={recentDocuments as never}
                        onDeleteDocument={(id) => h.handleDeleteEvent(id)}
                        onReplaceDocument={(event) => setEditingEvent(event)}
                        browseOnly={isCaseLinkViewOnly}
                    />
                    </Suspense>
                ) : null}
                {showNoteModal ? (
                    <Suspense fallback={null}>
                    <LazyAddNoteModal
                        key="add-note"
                        isOpen={showNoteModal}
                        onClose={() => {
                            setShowNoteModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddNote}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                        dossierContext={{
                            kind: 'lawsuit',
                            lawsuitType: inferLawsuitTypeFromDocType(parentData.docType || displayStage.type),
                        }}
                        voiceUserId={resolveCalendarUserId()}
                        savedNotes={(displayStage.timeline ?? [])
                            .filter(
                                (event) =>
                                    event.type === 'note' &&
                                    !(event as { isDeleted?: boolean }).isDeleted,
                            )
                            .map((event) => ({
                                id: String(event.id),
                                title: String(event.title ?? 'ملاحظة').trim() || 'ملاحظة',
                                body: String(event.details ?? ''),
                                date: event.date,
                            }))}
                        onDeleteNote={(id) => h.handleDeleteEvent(id)}
                        browseOnly={isCaseLinkViewOnly}
                    />
                    </Suspense>
                ) : null}
                {showPaymentModal ? (
                    <Suspense fallback={null}>
                    <LazyAddPaymentModal
                        key="add-payment"
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onAdd={h.handleAddPayment}
                    />
                    </Suspense>
                ) : null}
                {showIncidentalModal || editingIncidental ? (
                    <Suspense fallback={null}>
                    <LazyAddIncidentalCaseModal
                    key="add-incidental"
                    isOpen={showIncidentalModal}
                    onClose={() => {
                        setShowIncidentalModal(false);
                        setEditingIncidental(null);
                    }}
                    onAdd={h.handleAddIncidentalCase}
                    onSpawnLinkedCase={h.handleSpawnLinkedIncidentalCase}
                    currentStage={displayStage}
                    editMode={!!editingIncidental}
                    editData={editingIncidental ?? undefined}
                    />
                    </Suspense>
                ) : null}
                {showFastTrackModal ? (
                    <Suspense fallback={null}>
                    <LazyFastTrackModal
                        key="fast-track"
                        isOpen={showFastTrackModal}
                        onClose={() => {
                            setShowFastTrackModal(false);
                            setEditingFastTrack(null);
                        }}
                        onSave={h.handleSaveFastTrack}
                        editMode={Boolean(editingFastTrack?.id)}
                        editData={editingFastTrack as never}
                    />
                    </Suspense>
                ) : null}
                {showAttachmentModal ? (
                    <Suspense fallback={null}>
                    <LazyAttachmentShieldModal
                        key="attachment-shield"
                        isOpen={showAttachmentModal}
                        onClose={() => {
                            setShowAttachmentModal(false);
                            setEditingAttachment(null);
                        }}
                        onSave={h.handleSaveAttachment}
                        editMode={!!editingAttachment}
                        editData={editingAttachment as never}
                    />
                    </Suspense>
                ) : null}
                {showApptModal ? (
                    <Suspense fallback={null}>
                    <LazyAddAppointmentModal
                        key="add-appt"
                        isOpen={showApptModal}
                        onClose={() => {
                            setShowApptModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddAppointment}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                        recentAppointments={recentAppointments as never}
                        onDeleteAppointment={(id) => h.handleDeleteEvent(id)}
                        onEditAppointment={(event) => setEditingEvent(event)}
                        browseOnly={isCaseLinkViewOnly}
                    />
                    </Suspense>
                ) : null}
        </>
    );
}
