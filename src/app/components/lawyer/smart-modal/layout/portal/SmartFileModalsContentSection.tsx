import React, { Suspense } from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import {
    AddAppointmentModal,
    AddDocumentModal,
    AddNoteModal,
    AddPaymentModal,
} from '../../modals/contentEntryModals';
import { LazyEditCaseInfoModal, LazyAddIncidentalCaseModal, LazyFastTrackModal, LazyAttachmentShieldModal } from '../../lazySmartFileModalChunks';
import type { SmartFileCaseFormData } from '../../smartFile/modalFormTypes';
import { inferLawsuitTypeFromDocType } from '@/app/services/dossier-notes/dossierLawArticleTooltips';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

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

/** نوافذ الإدخال السريع — تحميل مباشر (بدون lazy) لتفادي تجميد React */
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
                    <AddDocumentModal
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
                    />
                ) : null}
                {showNoteModal ? (
                    <AddNoteModal
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
                    />
                ) : null}
                {showPaymentModal ? (
                    <AddPaymentModal
                        key="add-payment"
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onAdd={h.handleAddPayment}
                    />
                ) : null}
                {showIncidentalModal ? (
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
                        currentStage={currentStage}
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
                    <AddAppointmentModal
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
                    />
                ) : null}
        </>
    );
}
