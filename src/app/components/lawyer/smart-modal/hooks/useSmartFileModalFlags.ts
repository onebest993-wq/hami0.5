import { useEffect, useState } from 'react';
import type { IncidentalCase, Task, TimelineEvent } from '../../LawyerShared';
import type { JudgmentPayload } from '../smartFile/judgmentTypes';

export function useSmartFileModalFlags() {
    const [showApptModal, setShowApptModal] = useState(false);
    const [showEditInfoModal, setShowEditInfoModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showIncidentalModal, setShowIncidentalModal] = useState(false);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [showInterruptionModal, setShowInterruptionModal] = useState(false);
    const [showResumeInterruptionModal, setShowResumeInterruptionModal] = useState(false);
    const [showInterlocutoryModal, setShowInterlocutoryModal] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [showJudgmentModal, setShowJudgmentModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showProvisionalOrderModal, setShowProvisionalOrderModal] = useState(false);
    const [showFastTrackModal, setShowFastTrackModal] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [showJudgeRecusalModal, setShowJudgeRecusalModal] = useState(false);
    const [showTransferJurisdictionModal, setShowTransferJurisdictionModal] = useState(false);
    const [showCaseConsolidationModal, setShowCaseConsolidationModal] = useState(false);
    const [showAttorneyResignationModal, setShowAttorneyResignationModal] = useState(false);
    const [showExecutionTransferModal, setShowExecutionTransferModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showObjectionRegistrationModal, setShowObjectionRegistrationModal] = useState(false);
    const [showObjectionJudgmentModal, setShowObjectionJudgmentModal] = useState(false);
    const [showAppealTransitionModal, setShowAppealTransitionModal] = useState(false);
    const [showCrossAppealModal, setShowCrossAppealModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [showExtraordinaryAppealModal, setShowExtraordinaryAppealModal] = useState<boolean | string>(false);
    const [showMaterialErrorModal, setShowMaterialErrorModal] = useState<string | null>(null);
    const [showTransitionModal, setShowTransitionModal] = useState(false);
    const [tempJudgmentData, setTempJudgmentData] = useState<JudgmentPayload | null>(null);

    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingIncidental, setEditingIncidental] = useState<IncidentalCase | null>(null);
    const [editingFastTrack, setEditingFastTrack] = useState<Record<string, unknown> | null>(null);
    const [editingAttachment, setEditingAttachment] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (!editingEvent) return;
        if (editingEvent.type === 'appointment') setShowApptModal(true);
        if (editingEvent.type === 'note') setShowNoteModal(true);
        if (editingEvent.type === 'document') setShowDocModal(true);

        const eventWithFlags = editingEvent as TimelineEvent & { isPause?: boolean; isInterruption?: boolean };
        if (eventWithFlags.isPause || editingEvent.title.includes('استئخار')) setShowPauseModal(true);
        if (eventWithFlags.isInterruption || editingEvent.title.includes('انقطاع')) {
            setShowInterruptionModal(true);
        }
        if (editingEvent.type === 'decision' && editingEvent.title.includes('طعن تمييزي')) {
            setShowInterlocutoryModal(true);
        }
    }, [editingEvent]);

    useEffect(() => {
        if (editingTask) setShowTaskModal(true);
    }, [editingTask]);

    useEffect(() => {
        if (editingIncidental) setShowIncidentalModal(true);
    }, [editingIncidental]);

    useEffect(() => {
        if (editingFastTrack) setShowFastTrackModal(true);
    }, [editingFastTrack]);

    useEffect(() => {
        if (editingAttachment) setShowAttachmentModal(true);
    }, [editingAttachment]);

    return {
        showApptModal,
        setShowApptModal,
        showEditInfoModal,
        setShowEditInfoModal,
        showNoteModal,
        setShowNoteModal,
        isActionsMenuOpen,
        setIsActionsMenuOpen,
        showDocModal,
        setShowDocModal,
        showPaymentModal,
        setShowPaymentModal,
        showTaskModal,
        setShowTaskModal,
        showIncidentalModal,
        setShowIncidentalModal,
        showPauseModal,
        setShowPauseModal,
        showInterruptionModal,
        setShowInterruptionModal,
        showResumeInterruptionModal,
        setShowResumeInterruptionModal,
        showInterlocutoryModal,
        setShowInterlocutoryModal,
        showAppealModal,
        setShowAppealModal,
        isTrashOpen,
        setIsTrashOpen,
        showJudgmentModal,
        setShowJudgmentModal,
        showExportMenu,
        setShowExportMenu,
        showProvisionalOrderModal,
        setShowProvisionalOrderModal,
        showFastTrackModal,
        setShowFastTrackModal,
        showAttachmentModal,
        setShowAttachmentModal,
        showJudgeRecusalModal,
        setShowJudgeRecusalModal,
        showTransferJurisdictionModal,
        setShowTransferJurisdictionModal,
        showCaseConsolidationModal,
        setShowCaseConsolidationModal,
        showAttorneyResignationModal,
        setShowAttorneyResignationModal,
        showExecutionTransferModal,
        setShowExecutionTransferModal,
        showNotificationModal,
        setShowNotificationModal,
        showObjectionRegistrationModal,
        setShowObjectionRegistrationModal,
        showObjectionJudgmentModal,
        setShowObjectionJudgmentModal,
        showAppealTransitionModal,
        setShowAppealTransitionModal,
        showCrossAppealModal,
        setShowCrossAppealModal,
        showActionModal,
        setShowActionModal,
        showExtraordinaryAppealModal,
        setShowExtraordinaryAppealModal,
        showMaterialErrorModal,
        setShowMaterialErrorModal,
        showTransitionModal,
        setShowTransitionModal,
        tempJudgmentData,
        setTempJudgmentData,
        editingEvent,
        setEditingEvent,
        editingTask,
        setEditingTask,
        editingIncidental,
        setEditingIncidental,
        editingFastTrack,
        setEditingFastTrack,
        editingAttachment,
        setEditingAttachment,
    };
}
