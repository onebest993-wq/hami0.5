import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { SmartToast } from '../../ui/SmartToast';
import { safeGetItem } from '@/app/utils/storageUtils';
import { debug } from '@/app/utils/debug';

import { CaseStage } from '../LawyerShared';
import { buildInitialStagesFromFile } from './smartFile/stageInit';
import { buildInitialParentDataFromFile } from './smartFile/parentDataInit';
import { useSmartFileStageNavigation } from './hooks/useSmartFileStageNavigation';
import { useSmartFileJudgmentActions } from './hooks/useSmartFileJudgmentActions';
import { useSmartFileProceduralActions } from './hooks/useSmartFileProceduralActions';
import { useAuth } from '@/app/context/AuthContext';
import { useSmartFilePersist } from './hooks/useSmartFilePersist';
import { useSmartFileModalFlags } from './hooks/useSmartFileModalFlags';
import { useSmartFileStageActions } from './hooks/useSmartFileStageActions';
import { useSmartFileTimelineActions } from './hooks/useSmartFileTimelineActions';
import { useSmartFileDefaultJudgmentActions } from './hooks/useSmartFileDefaultJudgmentActions';
import { useSmartFilePleadingsActions } from './hooks/useSmartFilePleadingsActions';
import { shareCaseReport } from './smartFile/shareCaseReport';
import { SmartFileModalsPortal, type SmartFileModalsPortalProps } from './layout/SmartFileModalsPortal';
import { SmartFileMainPanel } from './layout/SmartFileMainPanel';
import { SmartFileChrome } from './layout/SmartFileChrome';
import { buildSmartFileLayoutProps } from './smartFile/viewProps';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { CalendarBridge } from '@/app/services/calendarBridge';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
function readFileString(file: Record<string, unknown>, key: string, fallback = ''): string {
    const value = file[key];
    return typeof value === 'string' ? value : fallback;
}

// --- TYPES ---
export interface SmartFileModalProps {
    file: Record<string, unknown>;
    theme?: Record<string, unknown>;
    shapeClass?: string;
    onClose: () => void;
    onUpdate?: (file: Record<string, unknown>) => void;
    onDelete?: () => void;
    onAddStage?: (stage: CaseStage) => void;
    onAddAlert?: (alert: unknown) => void;
}

// --- MAIN COMPONENT ---

export const SmartFileModalContent = ({ file, theme, shapeClass, onClose, onUpdate, onDelete, onAddStage, onAddAlert }: SmartFileModalProps) => {
    const { user } = useAuth();
    const initialStagesRef = useRef<CaseStage[] | null>(null);
    if (initialStagesRef.current === null) {
        initialStagesRef.current = buildInitialStagesFromFile(file);
    }

    // Deep-link من Global Search: قراءة معرّف الحدث المستهدف (مرة واحدة عند الفتح)
    const searchFocusEventIdRef = useRef<string | null>(
        typeof file.__searchFocusEventId === 'string' && file.__searchFocusEventId
            ? String(file.__searchFocusEventId)
            : null,
    );

    // scroll-to-event بعد التركيب: نبحث عن العنصر data-event-id ونقفز إليه مع تمييز قصير
    useEffect(() => {
        const targetId = searchFocusEventIdRef.current;
        if (!targetId || typeof document === 'undefined') return;
        searchFocusEventIdRef.current = null;
        // تأخير ليُكتمل render الـ stages/timeline
        const t = window.setTimeout(() => {
            const el = document.querySelector(`[data-event-id="${CSS.escape(targetId)}"]`);
            if (!el) return;
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-[#E6C673]', 'ring-offset-2', 'ring-offset-transparent');
                window.setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-[#E6C673]', 'ring-offset-2', 'ring-offset-transparent');
                }, 2200);
            } catch {
                // تجاهل بصمت — العنصر قد لا يكون قابلاً للتمييز
            }
        }, 320);
        return () => window.clearTimeout(t);
    }, []);

    const [parentData, setParentData] = useState(() => buildInitialParentDataFromFile(file));

    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        viewingStageIndex,
        setViewingStageIndex,
        currentStage,
        viewedStage,
        isViewingArchived,
        displayStage,
        displayTimeline,
        deletedEvents,
        stepperStages,
        currentStageId,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    } = useSmartFileStageNavigation(file, initialStagesRef.current);

    const [isEditingStageName, setIsEditingStageName] = useState(false);
    const [tempStageName, setTempStageName] = useState('');

    // OTHER STATE
    const [status, setStatus] = useState(() => readFileString(file, 'status', 'نشطة'));
    const [isPaused, setIsPaused] = useState(file?.status === 'paused' || false);
    const [pauseReason, setPauseReason] = useState(() => readFileString(file, 'stayReason'));
    const [linkedCaseNo, setLinkedCaseNo] = useState(() => readFileString(file, 'linkedCaseNo'));
    const [isInterrupted, setIsInterrupted] = useState(file?.status === 'interrupted' || false);
    // ✅ FIXED: Proper type for interruptionData
    const [interruptionData, setInterruptionData] = useState<Record<string, unknown> | null>(file?.interruptionData as Record<string, unknown> || null);

    const modalFlags = useSmartFileModalFlags();
    const {
        showApptModal, setShowApptModal,
        showEditInfoModal, setShowEditInfoModal,
        showNoteModal, setShowNoteModal,
        isActionsMenuOpen, setIsActionsMenuOpen,
        showDocModal, setShowDocModal,
        showPaymentModal, setShowPaymentModal,
        showTaskModal, setShowTaskModal,
        showIncidentalModal, setShowIncidentalModal,
        showPauseModal, setShowPauseModal,
        showInterruptionModal, setShowInterruptionModal,
        showResumeInterruptionModal, setShowResumeInterruptionModal,
        showInterlocutoryModal, setShowInterlocutoryModal,
        showAppealModal, setShowAppealModal,
        isTrashOpen, setIsTrashOpen,
        showJudgmentModal, setShowJudgmentModal,
        showExportMenu, setShowExportMenu,
        showProvisionalOrderModal, setShowProvisionalOrderModal,
        showFastTrackModal, setShowFastTrackModal,
        showAttachmentModal, setShowAttachmentModal,
        showJudgeRecusalModal, setShowJudgeRecusalModal,
        showTransferJurisdictionModal, setShowTransferJurisdictionModal,
        showCaseConsolidationModal, setShowCaseConsolidationModal,
        showAttorneyResignationModal, setShowAttorneyResignationModal,
        showExecutionTransferModal, setShowExecutionTransferModal,
        showNotificationModal, setShowNotificationModal,
        showObjectionRegistrationModal, setShowObjectionRegistrationModal,
        showObjectionJudgmentModal, setShowObjectionJudgmentModal,
        showAppealTransitionModal, setShowAppealTransitionModal,
        showCrossAppealModal, setShowCrossAppealModal,
        showActionModal, setShowActionModal,
        showExtraordinaryAppealModal, setShowExtraordinaryAppealModal,
        showMaterialErrorModal, setShowMaterialErrorModal,
        showTransitionModal, setShowTransitionModal,
        tempJudgmentData, setTempJudgmentData,
        editingEvent, setEditingEvent,
        editingTask, setEditingTask,
        editingIncidental, setEditingIncidental,
        editingFastTrack, setEditingFastTrack,
        editingAttachment, setEditingAttachment,
    } = modalFlags;

    const { saveToCloud } = useSmartFilePersist({
        parentData,
        activeStageIndex,
        status,
        onUpdate,
    });

    const lawsuitFileId = String(parentData?.id ?? file?.id ?? '');

    const onCalendarUnlink = useCallback(
        (params: { sourceEventId: string }) => {
            CalendarBridge.remove('lawsuit', lawsuitFileId, params.sourceEventId, user?.id);
        },
        [lawsuitFileId, user?.id],
    );

    useEffect(() => {
        const handler = (ev: Event) => {
            const detail = (ev as CustomEvent<CalendarSourcePatchDetail>).detail;
            if (!detail || detail.sourceModule !== 'lawsuit') return;
            if (String(detail.sourceEntityId) !== lawsuitFileId) return;
            const raw = loadLawsuitFilesRaw();
            const row = raw.find(
                (f) => f && typeof f === 'object' && String((f as { id?: unknown }).id) === lawsuitFileId,
            );
            if (!row || typeof row !== 'object') return;
            const nextStages = (row as { stages?: unknown }).stages;
            if (Array.isArray(nextStages)) {
                setStages(nextStages as CaseStage[]);
            }
        };
        window.addEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
        return () => window.removeEventListener(CALENDAR_SOURCE_PATCHED_EVENT, handler);
    }, [lawsuitFileId, setStages]);

    const {
        handleUpdateHeader,
        handleUpdateCaseInfo,
        handleSaveNotification,
        handleStageSelect,
        handleQuickAction,
        handleToggleNotification,
        handleSaveStageName,
        setCaseData,
        handleToggleClient,
    } = useSmartFileStageActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        displayStage,
        parentData,
        setParentData,
        saveToCloud,
        modalSetters: {
            setShowApptModal,
            setShowNoteModal,
            setShowDocModal,
            setShowIncidentalModal,
            setShowInterlocutoryModal,
            setShowFastTrackModal,
            setShowAttachmentModal,
        },
        setIsEditingStageName,
        tempStageName,
    });

    const {
        handleDeleteEvent,
        handleRestoreEvent,
        handleHardDeleteEvent,
        handleEmptyTrash,
        handleEditEvent,
    } = useSmartFileTimelineActions({
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        saveToCloud,
        setEditingEvent,
        setIsTrashOpen,
        onCalendarUnlink,
    });

    const {
        handleDefaultObjection,
        handleWaiveObjection,
        handleRegisterObjection,
        handleObjectionJudgment,
        handleOtherAppeals,
    } = useSmartFileDefaultJudgmentActions({
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        saveToCloud,
        setShowObjectionRegistrationModal,
        calendarUserId: user?.id,
        lawsuitFileId,
        caseNo: typeof parentData?.caseNo === 'string' ? parentData.caseNo : undefined,
        court: typeof parentData?.court === 'string' ? parentData.court : undefined,
        parties: parentData?.parties,
        clientName:
            Array.isArray(parentData?.parties) &&
            parentData.parties[0] &&
            typeof parentData.parties[0] === 'object' &&
            typeof (parentData.parties[0] as { name?: string }).name === 'string'
                ? (parentData.parties[0] as { name: string }).name
                : undefined,
    });

    const { handleClosePleadings, handleReopenPleadings, handleAppealRegistration } =
        useSmartFilePleadingsActions({
            stages,
            setStages,
            activeStageIndex,
            currentStage,
            parentData,
            saveToCloud,
        });

    const handleShare = useCallback(() => {
        shareCaseReport(currentStage as Parameters<typeof shareCaseReport>[0]);
    }, [currentStage]);

    const {
        handleJudgmentConfirm,
        handleAppealTransition,
        handleCrossAppeal,
        handleCassationDecision,
        handleTransitionConfirm,
    } = useSmartFileJudgmentActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
        setShowTransitionModal,
    });

    const {
        handleAddTask,
        handleToggleTask,
        handleAddIncidentalCase,
        handleSaveFastTrack,
        handleSaveAttachment,
        handleAddCrossAppeal,
        handleCancelCrossAppeal,
        handleJudgeRecusal,
        handleTransferJurisdiction,
        handleCaseConsolidation,
        handleAttorneyResignation,
        handleExecutionTransfer,
        handleExportPDF,
        handleMaterialErrorCorrection,
        handleResolveIncidentalCase,
        handleAddAppointment,
        handleAddAction,
        handleAddNote,
        handleAddDoc,
        handleAddPayment,
        handlePauseConfirm,
        handleResume,
        handleInterruptionToggle,
        handleExtraordinaryAppeal,
        handleProvisionalOrderConfirm,
        handleInterlocutoryAppealConfirm,
        handleInterruptionConfirm,
        handleResumeInterruptionConfirm,
        handleAbandonment,
        handleResumeAbandonment,
    } = useSmartFileProceduralActions({
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setIsInterrupted,
        setInterruptionData,
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowAttorneyResignationModal,
        setShowExecutionTransferModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId: user?.id,
    });

    debug.log('📊 Stage Isolation Check:', {
        activeStageIndex,
        viewingStageIndex,
        isViewingArchived,
        activeStageTimeline: currentStage?.timeline?.length || 0,
        viewedStageTimeline: viewedStage?.timeline?.length || 0,
        displayTimelineCount: displayTimeline.length
    });

    // ADAPTER FOR USER PROVIDED CODE
    const isPleadingsClosed = displayStage?.isPleadingsClosed;
    const lastJudgmentType = displayStage?.lastJudgmentType || displayStage?.judgmentForm;

    const modalHandlers = {
        handleUpdateCaseInfo,
        handleAddTask,
        handleAddDoc,
        handleAddNote,
        handleAddPayment,
        handleAddIncidentalCase,
        handleSaveFastTrack,
        handleSaveAttachment,
        handleAddAction,
        handleAddAppointment,
        handlePauseConfirm,
        handleInterruptionConfirm,
        handleResumeInterruptionConfirm,
        handleInterlocutoryAppealConfirm,
        handleRegisterObjection,
        handleObjectionJudgment,
        handleRestoreEvent,
        handleHardDeleteEvent,
        handleEmptyTrash,
        handleJudgmentConfirm,
        handleAppealRegistration,
        handleAppealTransition,
        handleCrossAppeal,
        handleProvisionalOrderConfirm,
        handleSaveNotification,
        handleExtraordinaryAppeal,
        handleMaterialErrorCorrection,
        handleJudgeRecusal,
        handleTransferJurisdiction,
        handleCaseConsolidation,
        handleAttorneyResignation,
        handleExecutionTransfer,
        handleQuickAction,
        handleAbandonment,
        handleInterruptionToggle,
        handleResume,
    } as SmartFileModalsPortalProps['handlers'];

    if (!file || !currentStage) return null;

    const layout = buildSmartFileLayoutProps({
        onClose,
        file,
        status,
        isViewingArchived,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        linkedCaseNo,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isPleadingsClosed,
        lastJudgmentType,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        setTempStageName,
        onSaveStageName: handleSaveStageName,
        onShare: handleShare,
        onStageSelect: handleStageSelect,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        stepperStages,
        currentStageId,
        deletedEvents,
        handlers: modalHandlers,
        handleResumeAbandonment,
        handleResume,
        handleToggleClient,
        handleInterruptionToggle,
        handleAbandonment,
        handleToggleNotification,
        handleCassationDecision,
        handleClosePleadings,
        handleReopenPleadings,
        handleDefaultObjection,
        handleWaiveObjection,
        handleOtherAppeals,
        handleExportPDF,
        handleResolveIncidentalCase,
        handleQuickAction,
        handleToggleTask,
        handleDeleteEvent,
        handleEditEvent,
        handleCancelCrossAppeal,
        handleAddCrossAppeal,
        setParentData,
        flags: {
            showExportMenu,
            setShowExportMenu,
            isTrashOpen,
            setIsTrashOpen,
            setShowEditInfoModal,
            isActionsMenuOpen,
            setIsActionsMenuOpen,
            showEditInfoModal,
            showTaskModal,
            setShowTaskModal,
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
            showActionModal,
            setShowActionModal,
            showApptModal,
            setShowApptModal,
            showPauseModal,
            setShowPauseModal,
            showInterruptionModal,
            setShowInterruptionModal,
            showResumeInterruptionModal,
            setShowResumeInterruptionModal,
            showInterlocutoryModal,
            setShowInterlocutoryModal,
            showObjectionRegistrationModal,
            setShowObjectionRegistrationModal,
            showObjectionJudgmentModal,
            setShowObjectionJudgmentModal,
            showJudgmentModal,
            setShowJudgmentModal,
            showAppealModal,
            setShowAppealModal,
            showAppealTransitionModal,
            setShowAppealTransitionModal,
            showCrossAppealModal,
            setShowCrossAppealModal,
            showProvisionalOrderModal,
            setShowProvisionalOrderModal,
            showNotificationModal,
            setShowNotificationModal,
            showExtraordinaryAppealModal,
            setShowExtraordinaryAppealModal,
            showMaterialErrorModal,
            setShowMaterialErrorModal,
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
            tempJudgmentData,
            setTempJudgmentData,
        },
    });

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[100] bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.dossier}
            >
                
                {/* --- MAIN FRAME --- 🔥 CRITICAL: overflow-visible to prevent dropdown clipping */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full max-w-none mx-0 my-0 bg-[#0F121E] rounded-none border-0 flex flex-col shadow-none overflow-visible print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none will-change-opacity"
                >
                    
                    {/* --- MAIN CONTENT AREA --- 🔥 CRITICAL: overflow-visible */}
                    <div className="flex-1 flex flex-col bg-[#0F121E] relative overflow-visible">
                        
                        <SmartFileChrome {...layout.chrome} />
                        <SmartFileMainPanel {...layout.mainPanel} />

                    </div>
                </motion.div>

                <SmartFileModalsPortal {...layout.modalsPortal} />

            </motion.div>
        </AnimatePresence>
    );
};
