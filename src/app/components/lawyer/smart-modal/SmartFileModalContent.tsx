// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Plus, Check, MoreHorizontal, Trash2, RotateCcw, Scale, Clock, PauseCircle, Edit2, Printer, Share2, Lock, ChevronLeft, Shield, ShieldCheck, AlertTriangle, Eye, Sparkles, ArrowRightLeft 
} from 'lucide-react';

import { SmartToast } from '../../ui/SmartToast';
import { validateTaskData, validatePaymentData, validateDocumentData, validateJudgmentData } from '@/app/utils/validationUtils';
import { safeSetItem, safeGetItem } from '@/app/utils/storageUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { formatDateToLocalYmd, getLocalTodayYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';

import { 
    CaseStage, Task, TimelineEvent, DocumentCategory, IncidentalCase, IncidentalStatus 
} from '../LawyerShared';
import {
    LazySmartHeader,
    LazyFinancialCard,
    LazyGhostAIInsightDeck,
    LazyQuickActions,
    LazyToDoList,
    LazyFastTrackPetitionsList,
    LazyAttachmentShieldCard,
    LazyIncidentalCasesManager,
    LazyTimelineFeed,
    LazyLegalActionsMenu,
} from './lazySmartFileModalWidgets';
import {
    LazyAddActionModal,
    LazyAddAppointmentModal,
    LazyAddDocumentModal,
    LazyAddIncidentalCaseModal,
    LazyAddNoteModal,
    LazyAddPaymentModal,
    LazyAddProvisionalOrderModal,
    LazyAddTaskModal,
    LazyAppealRegistrationModal,
    LazyAppealTransitionModal,
    LazyAttachmentShieldModal,
    LazyAttorneyResignationModal,
    LazyCaseConsolidationModal,
    LazyCrossAppealModal,
    LazyEditCaseInfoModal,
    LazyExecutionTransferModal,
    LazyExtraordinaryAppealModal,
    LazyFastTrackModal,
    LazyInterlocutoryAppealModal,
    LazyInterruptionModal,
    LazyJudgeRecusalModal,
    LazyJudicialNotificationModal,
    LazyMaterialErrorCorrectionModal,
    LazyObjectionJudgmentModal,
    LazyObjectionRegistrationModal,
    LazyPauseCaseModal,
    LazyResumeInterruptionModal,
    LazySmartJudgmentModal,
    LazyTrashModal,
    LazyTransferJurisdictionModal,
} from './lazySmartFileModalChunks';

const SMART_FILE_MODAL_LAZY_FALLBACK = null;

// --- TYPES ---
// ✅ FIXED: Proper interface for SmartFileModal props
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
    // ========================================
    // CRITICAL: PARENT-CHILD ARCHITECTURE
    // ========================================
    
    // PARENT DATA (البيانات الثابتة - لا تتغير أبداً)
    const [parentData, setParentData] = useState({
        id: file?.id,
        originalParties: file?.originalParties || file?.parties || [], // الأسماء الأصلية للخصوم
        feesTotal: file?.feesTotal || 0,  // ✅ الأموال لا تتصفر أبداً
        feesPaid: file?.feesPaid || 0,     // ✅ الأموال لا تتصفر أبداً
        docType: file?.docType || file?.type || '',
        createdDate: file?.date || getLocalTodayYmd(),
        representedParty: (file?.representedParty === 'plaintiff' || file?.representedParty === 'client') ? 'المدعي' : 
                          (file?.representedParty === 'defendant' || file?.representedParty === 'opponent') ? 'المدعى عليه' : 
                          file?.representedParty || null // 'المدعي' | 'المدعى عليه' | null
    });

    // STAGES ARRAY (مصفوفة المراحل - كل مرحلة = إضبارة فرعية)
    // ✅ FIXED: Proper type for stages
    const [stages, setStages] = useState<CaseStage[]>(() => {
        // Initialize from file or create first stage
        if (file?.stages && Array.isArray(file.stages) && file.stages.length > 0) {
            return file.stages as CaseStage[];
        } else {
            // Create initial stage from file data
            return [{
                id: `stage_${Date.now()}`,
                stageName: file?.currentStage || 'البداءة',
                caseNo: file?.caseNo || '',
                court: file?.court || '',
                judge: file?.judge || '',
                parties: file?.parties || [],
                timeline: file?.history || [],
                tasks: file?.tasks || [],
                incidentalCases: file?.incidentalCases || [],
                createdDate: file?.date || getLocalTodayYmd(),
                finalDecision: null,
                decisionDate: null,
                status: 'active' // active | completed
            }];
        }
    });

    // ACTIVE STAGE INDEX (المرحلة النشطة)
    const [activeStageIndex, setActiveStageIndex] = useState(() => {
        return file?.activeStageIndex !== undefined ? file.activeStageIndex : stages.length - 1;
    });

    // ========================================
    // CRITICAL: VIEWING STATE (The Digital Book Navigation)
    // ========================================
    const [viewingStageIndex, setViewingStageIndex] = useState(() => {
        // Start by viewing the active stage
        return file?.activeStageIndex !== undefined ? file.activeStageIndex : stages.length - 1;
    });

    // --- STAGE NAME EDITOR STATE ---
    const [isEditingStageName, setIsEditingStageName] = useState(false);
    const [tempStageName, setTempStageName] = useState('');

    // Swipe gesture state
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    // OTHER STATE
    const [status, setStatus] = useState<'نشطة' | 'مستأخرة' | 'منقطعة' | 'منتهية' | 'مكتسبة الدرجة القطعية'>(file?.status || 'نشطة');
    const [isPaused, setIsPaused] = useState(file?.status === 'paused' || false);
    const [pauseReason, setPauseReason] = useState(file?.stayReason || '');
    const [linkedCaseNo, setLinkedCaseNo] = useState(file?.linkedCaseNo || '');
    const [isInterrupted, setIsInterrupted] = useState(file?.status === 'interrupted' || false);
    // ✅ FIXED: Proper type for interruptionData
    const [interruptionData, setInterruptionData] = useState<Record<string, unknown> | null>(file?.interruptionData as Record<string, unknown> || null);
    
    // Modals Visibility
    const [showApptModal, setShowApptModal] = useState(false);
    const [showEditInfoModal, setShowEditInfoModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    // NEW LEGAL ACTIONS MENU
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
    const [showFastTrackModal, setShowFastTrackModal] = useState(false); // 🔥 NEW: Fast-Track
    const [showAttachmentModal, setShowAttachmentModal] = useState(false); // 🔥 NEW: Attachment Shield
    const [showJudgeRecusalModal, setShowJudgeRecusalModal] = useState(false); // 🔥 NEW: Command Center
    const [showTransferJurisdictionModal, setShowTransferJurisdictionModal] = useState(false);
    const [showCaseConsolidationModal, setShowCaseConsolidationModal] = useState(false);
    const [showAttorneyResignationModal, setShowAttorneyResignationModal] = useState(false);
    const [showExecutionTransferModal, setShowExecutionTransferModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showObjectionRegistrationModal, setShowObjectionRegistrationModal] = useState(false);
    const [showObjectionJudgmentModal, setShowObjectionJudgmentModal] = useState(false);
    const [showAppealTransitionModal, setShowAppealTransitionModal] = useState(false); // 🔥 NEW
    const [showCrossAppealModal, setShowCrossAppealModal] = useState(false); // 🔥 NEW
    const [showActionModal, setShowActionModal] = useState(false); // 🔥 NEW: Action Modal
    const [showExtraordinaryAppealModal, setShowExtraordinaryAppealModal] = useState(false); // 🔥 NEW: Extraordinary Appeals
    const [showMaterialErrorModal, setShowMaterialErrorModal] = useState<string | null>(null); // 🔥 NEW: Material Error Correction ('correction' | 'clarification')
    // ✅ FIXED: Proper type for tempJudgmentData
    const [tempJudgmentData, setTempJudgmentData] = useState<Record<string, unknown> | null>(null); // 🔥 Store judgment data temporarily

    // Edit Mode State
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editingIncidental, setEditingIncidental] = useState<IncidentalCase | null>(null);
    // ✅ FIXED: Proper type for editingFastTrack and editingAttachment
    const [editingFastTrack, setEditingFastTrack] = useState<Record<string, unknown> | null>(null); // 🔥 NEW: Fast-Track Edit
    const [editingAttachment, setEditingAttachment] = useState<Record<string, unknown> | null>(null); // 🔥 NEW: Attachment Edit

    // EXPERT MODE STATE (The Omniscient Legal Monitor)
    const [isExpertMode, setIsExpertMode] = useState(false);

    // ========================================
    // DERIVED STATE: Current Active Stage
    // ========================================
    const currentStage = stages[activeStageIndex];
    
    // ========================================
    // CRITICAL: VIEWING LOGIC (The Digital Book)
    // ========================================
    const viewedStage = stages[viewingStageIndex];
    const isViewingArchived = viewedStage?.status === 'completed' || viewedStage?.status === 'locked' || viewedStage?.isVoided;
    
    // ========================================
    // CRITICAL: DATA ISOLATION ENFORCEMENT
    // ========================================
    // We display data from the VIEWED stage, NOT the active stage
    // This ensures complete data isolation between stages
    const displayStage = viewedStage || currentStage;
    const displayTimeline = (displayStage?.timeline || []).filter((e: TimelineEvent) => !e.isDeleted);
    const deletedEvents = (displayStage?.timeline || []).filter((e: TimelineEvent) => e.isDeleted);
    
    debug.log('📊 Stage Isolation Check:', {
        activeStageIndex,
        viewingStageIndex,
        isViewingArchived,
        activeStageTimeline: currentStage?.timeline?.length || 0,
        viewedStageTimeline: viewedStage?.timeline?.length || 0,
        displayTimelineCount: displayTimeline.length
    });
    
    // ========================================
    // SWIPE GESTURE HANDLERS (Touch Navigation)
    // ========================================
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && viewingStageIndex < stages.length - 1) {
            // Swipe left = go to next stage
            setViewingStageIndex(viewingStageIndex + 1);
        }

        if (isRightSwipe && viewingStageIndex > 0) {
            // Swipe right = go to previous stage
            setViewingStageIndex(viewingStageIndex - 1);
        }
    };

    const isReadOnly = false; // Will be implemented with view switching
    
    // --- EFFECTS ---
    
    // Open correct modal when editing event
    useEffect(() => {
        if (editingEvent) {
            if (editingEvent.type === 'appointment') setShowApptModal(true);
            if (editingEvent.type === 'note') setShowNoteModal(true);
            if (editingEvent.type === 'document') setShowDocModal(true);
            
            // NEW: Handle Special Action Edits
            const eventWithFlags = editingEvent as TimelineEvent & { isPause?: boolean; isInterruption?: boolean };
            if (eventWithFlags.isPause || editingEvent.title.includes('استئخار')) setShowPauseModal(true);
            if (eventWithFlags.isInterruption || editingEvent.title.includes('انقطاع')) setShowInterruptionModal(true);
            if (editingEvent.type === 'decision' && editingEvent.title.includes('طعن تمييزي')) setShowInterlocutoryModal(true);
        }
    }, [editingEvent]);

    // New Effects for Task/Incidental Editing
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

    // Build Stepper from actual stages array
    const [stepperStages, setStepperStages] = useState<CaseStage[]>([]);
    const [currentStageId, setCurrentStageId] = useState('stg_1');

    useEffect(() => {
        // Build stepper from ACTUAL stages in the array
        const builtStages: CaseStage[] = stages.map((stage, idx) => ({
            id: `stg_${idx + 1}`,
            name: stage.stageName,
            status: idx === activeStageIndex ? 'active' : (stage.status === 'completed' || stage.status === 'locked' ? 'locked' : 'future')
        }));
        
        setStepperStages(builtStages);
        setCurrentStageId(`stg_${activeStageIndex + 1}`);
    }, [stages, activeStageIndex]);

    // CRITICAL: Sync viewingStageIndex with activeStageIndex
    useEffect(() => {
        setViewingStageIndex(activeStageIndex);
    }, [activeStageIndex]);

    // --- HANDLERS ---

    const handleUpdateHeader = (newData: Partial<CaseStage>) => {
        // Update current stage data
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...currentStage,
            court: newData.court,
            judge: newData.judge,
            caseNo: newData.caseNo,
            parties: newData.parties
        };
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };
    
    // Handler for unified Edit Case Info Modal
    const handleUpdateCaseInfo = (newData: Record<string, unknown>) => {
        // Update global case type if changed
        if (newData.type) {
            setParentData(prev => ({ ...prev, docType: newData.type }));
        }

        // Update represented party if changed
        if (newData.representedParty !== undefined) {
            setParentData(prev => ({ ...prev, representedParty: newData.representedParty }));
        }

        // Update current stage data
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...currentStage,
            court: newData.court,
            judge: newData.judge,
            caseNo: newData.caseNo,
            parties: newData.parties,
            stageName: newData.stageName || currentStage.stageName, // ✅ Update stage name if changed
            extraordinaryAppealType: newData.extraordinaryType, // ✅ Save Extraordinary Appeal Type
            type: newData.type, // Also update stage type just in case
            hasCrossAppeal: newData.hasCrossAppeal, // ✅ CRITICAL: Save cross-appeal state
            // 🎯 CRITICAL LEGAL DATA PRESERVATION: Save First Instance data for Appeal stage
            firstInstanceCaseNumber: newData.firstInstanceCaseNumber,
            firstInstanceCourt: newData.firstInstanceCourt
        };
        setStages(updatedStages);
        saveToCloud(updatedStages, { ...parentData, docType: newData.type, representedParty: newData.representedParty });
    };

    // ========================================
    // JUDICIAL NOTIFICATIONS HANDLER
    // ========================================
    interface NotificationData {
        targetPerson: string;
        reason: string;
        isCompleted: boolean;
    }
    const handleSaveNotification = (data: NotificationData) => {
        const { targetPerson, reason, isCompleted } = data;
        
        const updatedStages = [...stages];
        const now = new Date().toISOString();

        // 1. ALWAYS Add/Update Admin Task (using existing tasks list for visibility)
        const newTask: Task = {
            id: `task_${Date.now()}`,
            title: `متابعة تبليغ: ${targetPerson}`,
            details: `السبب: ${reason}`,
            isCompleted: isCompleted,
            dueDate: now.split('T')[0]
        };
        
        updatedStages[activeStageIndex].tasks = [newTask, ...(currentStage.tasks || [])];
        
        // 2. IF Completed, ALSO push to Timeline
        if (isCompleted) {
            updatedStages[activeStageIndex].timeline = [{
                id: `notif_${Date.now()}`,
                type: 'decision',
                date: now.split('T')[0],
                title: 'إتمام تبليغ قضائي ✅',
                details: `تم تبليغ (${targetPerson}) بـ: ${reason}`,
                isSystemLog: true,
                isNew: true
            }, ...(currentStage.timeline || [])];
        }
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success(isCompleted ? "تم حفظ التبليغ وإضافته للسجل ✅" : "تم إضافة مهمة متابعة التبليغ ⏳");
    };
    
    const handleToggleClient = () => {}; // Placeholder
    
    // ✨ CRITICAL: Stage Selection Handler (Swipeable Book Navigation)
    const handleStageSelect = (stageId: string) => {
        debug.log('🎯 تم الضغط على المرحلة:', stageId);
        
        // Safety check
        if (!stageId || typeof stageId !== 'string') {
            debug.error('❌ خطأ: stageId غير صالح:', stageId);
            return;
        }
        
        // Extract index from stageId (e.g., "stg_1" -> 0)
        const stageIndex = parseInt(stageId.replace('stg_', '')) - 1;
        
        // Safety check: ensure index is valid
        if (isNaN(stageIndex) || stageIndex < 0 || stageIndex >= stages.length) {
            debug.error('❌ خطأ: index خارج النطاق:', stageIndex, 'عدد المراحل:', stages.length);
            return;
        }
        
        debug.log('✅ الانتقال للمرحلة:', stages[stageIndex]?.stageName, 'Index:', stageIndex);
        
        // Update BOTH viewing and current stage IDs
        setViewingStageIndex(stageIndex);
        setCurrentStageId(stageId);
        
        // IMPORTANT: Only update activeStageIndex if clicking on active stage
        // This prevents accidentally changing the active stage when just viewing
        if (stages[stageIndex]?.status === 'active') {
            setActiveStageIndex(stageIndex);
        }
    };

    const handleQuickAction = (actionId: string) => {
        if (actionId === 'appointment') setShowApptModal(true);
        if (actionId === 'note') setShowNoteModal(true);
        if (actionId === 'document') setShowDocModal(true);
        if (actionId === 'incidental') setShowIncidentalModal(true);
        if (actionId === 'interlocutory_appeal') setShowInterlocutoryModal(true);
        if (actionId === 'fast_track') setShowFastTrackModal(true); // 🔥 NEW: Fast-Track
        if (actionId === 'attachment_shield') setShowAttachmentModal(true); // 🔥 NEW: Attachment Shield
    };

    const handleToggleNotification = () => {
        const statuses = ['waiting', 'in_person', 'via_media', 'publication'];
        // Determine current status: check party notificationStatus FIRST, then fallback to stage status
        const partyStatus = currentStage.parties && currentStage.parties[1] ? currentStage.parties[1].notificationStatus : undefined;
        const currentStatus = partyStatus || currentStage.defendantNotificationStatus || 'waiting';
        
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        const updatedStages = [...stages];
        
        // Update both the party object (preferred) AND stage object (legacy/fallback)
        const updatedParties = [...(currentStage.parties || [])];
        if (updatedParties[1]) {
            updatedParties[1] = { ...updatedParties[1], notificationStatus: nextStatus };
        }

        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            defendantNotificationStatus: nextStatus as 'pending' | 'notified' | 'verified',
            parties: updatedParties
        };
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    // ========================================
    // DEFAULT JUDGMENT HANDLERS (اعتراض غيابي)
    // ========================================
    // DEFAULT JUDGMENT HANDLERS (اعتراض غيابي)
    // ========================================
    
    // 1. Triggered by "Object" button -> Opens Modal
    const handleDefaultObjection = () => {
        setShowObjectionRegistrationModal(true);
    };

    // 2. Triggered by "Waive" button
    const handleWaiveObjection = () => {
        const updatedStages = [...stages];
        
        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            // Update Judgment Form to bypass the "Default" logic block in SmartHeader
            judgmentForm: 'غيابي (تم ترك حق الاعتراض)',
            lastJudgmentType: 'غيابي (متروك)',
        };

        updatedStages[activeStageIndex].timeline = [{
            id: `waive_obj_${Date.now()}`,
            type: 'decision',
            date: getLocalTodayYmd(),
            title: '⏭️ ترك الحكم الغيابي',
            details: 'تم اختيار ترك الحكم غيابياً وتجاوز مرحلة الاعتراض لغرض الطعن الاستئنافي/التمييزي مباشرة.',
            isSystemLog: true,
            isNew: true
        }, ...currentStage.timeline];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم تجاوز مرحلة الاعتراض. يمكنك الآن تقديم الطعن 🔓');
    };

    // 3. Saved from Modal
    interface ObjectionData {
        objectionDate: string;
        sessionDate: string;
        receiptNumber: string;
    }
    const handleRegisterObjection = (data: ObjectionData) => {
        const { objectionDate, sessionDate, receiptNumber } = data;
        const updatedStages = [...stages];
        
        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            isPleadingsClosed: false, // Unlock
            stageName: `${currentStage.stageName.split(' (')[0]} (اعتراض غيابي)`, // Append status
            status: 'active',
            // Track objection state
            isUnderObjection: true
        };

        updatedStages[activeStageIndex].timeline = [{
            id: `reg_obj_${Date.now()}`,
            type: 'decision',
            date: objectionDate,
            title: '🛡️ تسجيل اعتراض غيابي',
            details: `تم تقديم الاعتراض الغيابي وتحديد موعد الجلسة الأولى بتاريخ ${sessionDate}.\nرقم الوصل: ${receiptNumber || 'غير مدخل'}`,
            isNew: true
        }, ...currentStage.timeline];
        
        // Add Hearing Appointment automatically
        updatedStages[activeStageIndex].timeline = [{
            id: `appt_obj_${Date.now()}`,
            type: 'appointment',
            date: sessionDate,
            title: 'جلسة مرافعة (اعتراض غيابي)',
            details: 'نظر الاعتراض الغيابي',
            isNew: true
        }, ...updatedStages[activeStageIndex].timeline];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم بدء مرافعة الاعتراض الغيابي بنجاح ✅');
    };

    // 4. Finalize Objection Judgment
    interface JudgmentData {
        outcome: string;
        details: string;
    }
    const handleObjectionJudgment = (data: JudgmentData) => {
        const { outcome, details } = data;
        const updatedStages = [...stages];
        const now = getLocalTodayYmd();
        
        let decisionTitle = 'قرار حكم في الاعتراض';
        let decisionText = '';
        let newStatus = 'completed';
        let newJudgmentForm = currentStage.judgmentForm; // Default to previous

        switch (outcome) {
            case 'rejected_formally':
                decisionTitle = 'رد الاعتراض شكلاً';
                decisionText = 'رد الاعتراض شكلاً وتأييد الحكم الغيابي.';
                // Revert to closed state, effectively confirming original
                newJudgmentForm = 'حضوري (تأييد الغيابي)';
                break;
            case 'petition_nullified':
                decisionTitle = 'إبطال عريضة الاعتراض';
                decisionText = 'إبطال عريضة الاعتراض لعدم الحضور/الترك.';
                newJudgmentForm = 'حضوري (تأييد الغيابي)';
                break;
            case 'upheld':
                decisionTitle = 'قبول شكلاً وتأييد الحكم';
                decisionText = 'قبول الاعتراض شكلاً ورده موضوعاً وتأييد الحكم الغيابي.';
                newJudgmentForm = 'حضوري (تأييد الغيابي)';
                break;
            case 'cancelled_new_judgment':
                decisionTitle = 'إلغاء الحكم الغيابي';
                decisionText = 'إلغاء الحكم الغيابي وإصدار حكم جديد.';
                newJudgmentForm = 'حضوري';
                break;
        }

        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            isPleadingsClosed: true,
            status: newStatus,
            finalDecision: decisionText,
            judgmentForm: newJudgmentForm,
            // Clear objection flag
            isUnderObjection: false
        };

        updatedStages[activeStageIndex].timeline = [{
            id: `judg_obj_${Date.now()}`,
            type: 'decision',
            date: now,
            title: `⚖️ ${decisionTitle}`,
            details: `${details || decisionText}\n\n(أصبحت الدعوى قابلة للطعن حسب الطرق القانونية)`,
            isSystemLog: true,
            isNew: true
        }, ...updatedStages[activeStageIndex].timeline];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم حسم الاعتراض الغيابي وإصدار القرار ⚖️');
    };

    const handleOtherAppeals = () => {
        debug.log('🔓 فك القفل للطعن الآخر...');
        const updatedStages = [...stages];
        
        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            isPleadingsClosed: false, // Unlock Only
            status: 'active'
        };

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم فك قفل الدعوى. يرجى تسجيل مرحلة الطعن يدوياً 🔓');
    };

    const handleShare = async () => {
        interface PartyWithRole {
            name?: string;
            role?: string;
            isClient?: boolean;
        }
        const parties = (currentStage.parties || []) as PartyWithRole[];
        // Enhanced Arabic Role Detection
        const plaintiff = parties.find((p) => p.role === 'المدعي' || p.role === 'plaintiff' || p.role === 'الموكل' || p.isClient) || parties[0] || { name: 'غير محدد' };
        const defendant = parties.find((p) => p.role === 'المدعى عليه' || p.role === 'defendant' || p.role === 'الخصم' || !p.isClient) || parties[1] || { name: 'غير محدد' };
        
        const lastEvent = currentStage.timeline && currentStage.timeline.length > 0 ? currentStage.timeline[0] : null;
        const lastUpdateText = lastEvent ? `${lastEvent.title} (${lastEvent.date})` : 'لا توجد إجراءات مسجلة بعد';

        const text = `📌 تقرير حالة دعوى قضائية

المحكمة: ${currentStage.court || 'غير محدد'}
رقم الدعوى: ${currentStage.caseNo || 'غير محدد'}

الطرف الأول: ${plaintiff.name}
الطرف الثاني: ${defendant.name}

آخر إجراء: ${lastUpdateText}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'تقرير حالة الدعوى',
                    text: text,
                });
            } else {
                throw new Error('Web Share API not supported');
            }
        } catch (error) {
            // Fallback: Try Clipboard API
            try {
                await navigator.clipboard.writeText(text);
                SmartToast.success("تم نسخ التقرير إلى الحافظة.");
            } catch (clipboardError) {
                // Fallback: Try execCommand (for iframes/older browsers)
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    SmartToast.success("تم نسخ التقرير إلى الحافظة.");
                } catch (execError) {
                    SmartToast.error("عذراً، لم نتمكن من نسخ النص. يرجى النسخ يدوياً.");
                    debug.error('Copy failed', execError);
                }
                document.body.removeChild(textArea);
            }
        }
    };

    const handleAddTask = (taskData: Task) => {
        try {
            // ✅ Validation
            const validation = validateTaskData({ task: taskData.title, deadline: taskData.dueDate });
            if (!validation.valid) {
                SmartToast.error(validation.error || 'بيانات المهمة غير صحيحة');
                return;
            }

            const updatedStages = [...stages];
            
            if (taskData.id) {
                // Update existing
                updatedStages[activeStageIndex].tasks = currentStage.tasks.map((t: Task) => 
                    t.id === taskData.id ? { ...t, ...taskData } : t
                );
                setEditingTask(null);
                SmartToast.success('تم تحديث المهمة بنجاح ✅');
            } else {
                // Add new
                const newTask: Task = {
                    id: `task_${Date.now()}`,
                    title: taskData.title,
                    dueDate: taskData.dueDate,
                    isCompleted: false
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...currentStage.tasks];
                SmartToast.success('تمت إضافة المهمة بنجاح ✅');
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
        } catch (error) {
            logError('handleAddTask', error, taskData);
            SmartToast.error('حدث خطأ أثناء حفظ المهمة');
        }
    };

    const handleToggleTask = (taskId: string) => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex].tasks = currentStage.tasks.map((t: Task) => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleAddIncidentalCase = (data: IncidentalCase) => {
        const updatedStages = [...stages];

        if (data.id) {
            // Update existing
            updatedStages[activeStageIndex].incidentalCases = currentStage.incidentalCases.map((c: IncidentalCase) => 
                c.id === data.id ? { ...c, ...data } : c
            );
            setEditingIncidental(null);
        } else {
            // Add new
            const newCase: IncidentalCase = {
                id: `inc_${Date.now()}`,
                type: data.type,
                partyName: data.partyName,
                details: data.details,
                date: getLocalTodayYmd(),
                status: 'active'
            };
            updatedStages[activeStageIndex].incidentalCases = [newCase, ...currentStage.incidentalCases];
        }
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    // 🔥 NEW: FAST-TRACK HANDLER (الطلبات المستعجلة)
    interface FastTrackData {
        id?: string;
        type?: string;
        status?: string;
        [key: string]: unknown;
    }
    const handleSaveFastTrack = (data: FastTrackData) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];
        
        // Initialize fastTrackPetitions array if it doesn't exist
        if (!currentStage.fastTrackPetitions) {
            currentStage.fastTrackPetitions = [];
        }

        if (data.id) {
            // Update existing petition
            currentStage.fastTrackPetitions = (currentStage.fastTrackPetitions || []).map((p: FastTrackData) =>
                p.id === data.id ? { ...p, ...data } : p
            );
            setEditingFastTrack(null);
        } else {
            // Create new petition
            const newPetition = {
                id: `fast_${Date.now()}`,
                ...data,
                createdDate: getLocalTodayYmd()
            };
            currentStage.fastTrackPetitions = [newPetition, ...currentStage.fastTrackPetitions];
        }

        // ⚡ INTELLIGENT DEADLINE AUTOMATION - Auto-create Tasks based on status
        const submissionDate = new Date(data.submissionDate);
        
        if (data.status === '⏳ قيد الانتظار (7 أيام)') {
            // Calculate 7-day deadline
            const deadline = new Date(submissionDate);
            deadline.setDate(deadline.getDate() + 7);
            
            const trackingTask: Task = {
                id: `task_fast_${Date.now()}`,
                title: `⏱️ متابعة القضاء المستعجل: المحكمة ملزمة بالقرار خلال 7 أيام (قدم بتاريخ ${data.submissionDate})`,
                dueDate: formatDateToLocalYmd(deadline),
                isCompleted: false,
                priority: 'high',
                isNew: true
            };
            
            currentStage.tasks = [trackingTask, ...(currentStage.tasks || [])];
        } else if (data.status === '✅ صدر قرار بالقبول' || data.status === '❌ صدر قرار بالرفض') {
            // 3-day grievance warning
            const deadline = new Date(submissionDate);
            deadline.setDate(deadline.getDate() + 3);
            
            const grievanceTask: Task = {
                id: `task_fast_${Date.now()}`,
                title: `🚨 انتبه: يحق التظلم من القرار الولائي خلال (3 أيام) فقط من تاريخ التبليغ أو الرفض!`,
                dueDate: formatDateToLocalYmd(deadline),
                isCompleted: false,
                priority: 'high',
                isNew: true
            };
            
            currentStage.tasks = [grievanceTask, ...(currentStage.tasks || [])];
        }

        // ⚡ ADD TO TIMELINE with special amber styling
        const timelineEvent: TimelineEvent = {
            id: `timeline_fast_${Date.now()}`,
            type: 'action',
            date: data.submissionDate,
            time: data.grievanceTime || '',
            title: `⚡ ${data.requestType} - ${data.status}`,
            details: `${data.subject}\n\n${data.status === '⚖️ قيد نظر التظلم' && data.grievanceDate ? `📅 موعد جلسة التظلم: ${data.grievanceDate}\n` : ''}${data.grievanceOutcome ? `النتيجة: ${data.grievanceOutcome}` : ''}`,
            isFastTrack: true, // 🔥 Special flag for styling
            fastTrackStatus: data.status,
            isNew: true
        };

        currentStage.timeline = [timelineEvent, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم حفظ الطلب المستعجل بنجاح ⚡');
        setShowFastTrackModal(false);
    };

    // 🔥 NEW: ATTACHMENT SHIELD HANDLER (الحجز الاحتياطي) - Articles 231-250
    interface AttachmentData {
        id?: string;
        [key: string]: unknown;
    }
    const handleSaveAttachment = (data: AttachmentData) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];
        
        // Initialize attachments array if it doesn't exist
        if (!currentStage.attachments) {
            currentStage.attachments = [];
        }

        if (data.id) {
            // Update existing attachment
            currentStage.attachments = (currentStage.attachments || []).map((a: AttachmentData) =>
                a.id === data.id ? { ...a, ...data } : a
            );
            setEditingAttachment(null);
        } else {
            // Create new attachment
            const newAttachment = {
                id: `attach_${Date.now()}`,
                ...data,
                createdDate: getLocalTodayYmd()
            };
            currentStage.attachments = [newAttachment, ...currentStage.attachments];
        }

        // ⚡ THE 'GUILLOTINE' TIMERS - Automated Task Generation
        const submissionDate = new Date(data.submissionDate);
        const notificationDate = data.notificationDate ? new Date(data.notificationDate) : null;

        // TIMER 1: 24-hour court decision deadline
        if (data.status === 'مُقدم - بانتظار القرار (24 ساعة)') {
            const decisionDeadline = new Date(submissionDate);
            decisionDeadline.setDate(decisionDeadline.getDate() + 1);
            
            const radarTask: Task = {
                id: `task_attach_${Date.now()}`,
                title: `⏱️ رادار الحجز: المحكمة ملزمة بإصدار القرار في اليوم التالي كحد أقصى (المادة 233)`,
                dueDate: formatDateToLocalYmd(decisionDeadline),
                isCompleted: false,
                priority: 'high',
                isNew: true
            };
            
            currentStage.tasks = [radarTask, ...(currentStage.tasks || [])];
        }

        // TIMER 2: Fatal 8-day lawsuit filing deadline (if pre-lawsuit attachment)
        if (data.status === 'صدر قرار بالحجز ✅' && data.timing === 'قبل إقامة الدعوى (مستعجل)' && notificationDate) {
            const lawsuit8DayDeadline = new Date(notificationDate);
            lawsuit8DayDeadline.setDate(lawsuit8DayDeadline.getDate() + 8);
            
            const guillotineTask: Task = {
                id: `task_attach_guillotine_${Date.now()}`,
                title: `🚨 مقصلة الـ 8 أيام: يجب إقامة دعوى الموضوع خلال 8 أيام من التبليغ، وإلا يبطل الحجز (المادة 237)!`,
                dueDate: formatDateToLocalYmd(lawsuit8DayDeadline),
                isCompleted: false,
                priority: 'critical',
                isNew: true
            };
            
            // 3-month expiration warning
            const expiration3MonthDate = new Date(submissionDate);
            expiration3MonthDate.setMonth(expiration3MonthDate.getMonth() + 3);
            
            const expirationTask: Task = {
                id: `task_attach_expire_${Date.now()}`,
                title: `⚠️ تذكير: يبطل الحجز كلياً بعد 3 أشهر إذا لم يتم التبليغ وإقامة الدعوى (المادة 237)`,
                dueDate: formatDateToLocalYmd(expiration3MonthDate),
                isCompleted: false,
                priority: 'medium',
                isNew: true
            };
            
            currentStage.tasks = [guillotineTask, expirationTask, ...(currentStage.tasks || [])];
        }

        // TIMER 3: 3-day grievance deadline
        if ((data.status === 'صدر قرار بالحجز ✅' || data.status === 'رُفض الطلب ❌') && notificationDate) {
            const grievanceDeadline = new Date(notificationDate);
            grievanceDeadline.setDate(grievanceDeadline.getDate() + 3);
            
            const grievanceTask: Task = {
                id: `task_attach_grieve_${Date.now()}`,
                title: `⚖️ التظلم: يحق تقديم تظلم من قرار الحجز خلال 3 أيام فقط (المادة 240)`,
                dueDate: formatDateToLocalYmd(grievanceDeadline),
                isCompleted: false,
                priority: 'high',
                isNew: true
            };
            
            currentStage.tasks = [grievanceTask, ...(currentStage.tasks || [])];
        }

        // ⚡ ADD TO TIMELINE with special red styling
        const timelineEvent: TimelineEvent = {
            id: `timeline_attach_${Date.now()}`,
            type: 'action',
            date: data.submissionDate,
            title: `🔒 طلب حجز احتياطي - ${data.status}`,
            details: `التوقيت: ${data.timing}\nالأساس القانوني: ${data.legalBasis}\nالمال المحجوز: ${data.attachedProperty}\nالقيمة التقديرية: ${data.estimatedValue} IQD${data.depositAmount && parseFloat(data.depositAmount) > 0 ? `\nالكفالة المودعة: ${data.depositAmount} IQD` : ''}\n${data.notificationDate ? `\n📅 تاريخ التبليغ: ${data.notificationDate}` : ''}${data.hasGrievance && data.grievanceDate ? `\n\n⚖️ تظلم مقدم في: ${data.grievanceDate}` : ''}${data.grievanceOutcome ? `\nالنتيجة: ${data.grievanceOutcome}` : ''}`,
            isAttachment: true, // 🔥 Special flag for styling
            attachmentStatus: data.status,
            isNew: true
        };

        currentStage.timeline = [timelineEvent, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم حفظ طلب الحجز الاحتياطي بنجاح 🔒');
        setShowAttachmentModal(false);
    };

    const handleAddCrossAppeal = () => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            hasCrossAppeal: true
        };
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم إضافة الاستئناف المتقابل بنجاح ⚖️');
    };

    const handleCancelCrossAppeal = () => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            hasCrossAppeal: false
        };
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم إلغاء الاستئناف المتقابل');
    };

    // 🔥 NEW: COMMAND CENTER HANDLERS - Procedural Maneuvers & Lifecycle

    const handleJudgeRecusal = (data: { reason: string; requestDate: string }) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];

        // Freeze the case
        currentStage.isJudgeRecusalPending = true;
        currentStage.judgeRecusalData = data;

        // Add timeline event
        currentStage.timeline = [{
            id: `judge_recusal_${Date.now()}`,
            type: 'alert',
            date: data.requestDate,
            title: '🛑 تم تقديم طلب رد القاضي - الدعوى مجمدة',
            details: `السبب: ${data.reason}\n\n⚠️ الدعوى قيد التجميد حتى البت في طلب الرد.`,
            isNew: true,
            color: 'rose'
        }, ...(currentStage.timeline || [])];

        // Add task
        currentStage.tasks = [{
            id: `task_recusal_${Date.now()}`,
            title: '⏳ متابعة طلب رد القاضي - الدعوى مجمدة',
            dueDate: addCalendarDaysYmd(getLocalTodayYmd(), 7),
            isCompleted: false,
            priority: 'high',
            isNew: true
        }, ...(currentStage.tasks || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.info('تم تجميد الدعوى - قيد نظر طلب الرد 🛑');
        setShowJudgeRecusalModal(false);
    };

    const handleTransferJurisdiction = (data: { newCourt: string; transferDate: string; notes: string }) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];

        // Update court name
        currentStage.court = data.newCourt;

        // Add bold timeline event
        currentStage.timeline = [{
            id: `transfer_${Date.now()}`,
            type: 'milestone',
            date: data.transferDate,
            title: `🔀 إحالة الدعوى لعدم الاختصاص → ${data.newCourt}`,
            details: `تم إحالة الدعوى إلى: ${data.newCourt}\n${data.notes ? `\nالسبب: ${data.notes}` : ''}\n\n✅ الدعوى نشطة في المحكمة الجديدة.`,
            isNew: true,
            color: 'purple'
        }, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success(`تم إحالة الدعوى إلى: ${data.newCourt} 🔀`);
        setShowTransferJurisdictionModal(false);
    };

    const handleCaseConsolidation = (data: { linkedCaseNo: string; consolidationDate: string; notes: string }) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];

        // Add consolidation badge data
        currentStage.consolidatedWith = data.linkedCaseNo;

        // Add timeline event
        currentStage.timeline = [{
            id: `consolidation_${Date.now()}`,
            type: 'milestone',
            date: data.consolidationDate,
            title: `🔗 توحيد الدعاوى - مع القضية رقم ${data.linkedCaseNo}`,
            details: `تم توحيد الدعوى مع القضية رقم: ${data.linkedCaseNo}\n${data.notes ? `\nالسبب: ${data.notes}` : ''}`,
            isNew: true,
            color: 'teal'
        }, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success(`تم التوحيد مع القضية: ${data.linkedCaseNo} 🔗`);
        setShowCaseConsolidationModal(false);
    };

    const handleAttorneyResignation = (data: { resignationType: string; resignationDate: string; notes: string }) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];

        // Mark as resigned
        currentStage.isAttorneyResigned = true;
        currentStage.resignationData = data;

        // Add RED timeline event
        currentStage.timeline = [{
            id: `resignation_${Date.now()}`,
            type: 'alert',
            date: data.resignationDate,
            title: `🚫 انتهى التمثيل القانوني (${data.resignationType})`,
            details: `نوع الإنهاء: ${data.resignationType}\nالسبب: ${data.reason}\n\n⚠️ تم تعطيل جميع وظائف التحرير والجدولة في هذه القضية نهائياً.`,
            isNew: true,
            color: 'red'
        }, ...(currentStage.timeline || [])];

        // Update parent status
        setParentData({ ...parentData, status: 'انتهت الوكالة' });

        setStages(updatedStages);
        saveToCloud(updatedStages, { ...parentData, status: 'انتهت الوكالة' });
        SmartToast.error('تم إنهاء التمثيل القانوني نهائياً 🚫');
        setShowAttorneyResignationModal(false);
    };

    const handleExecutionTransfer = (data: { executionFileNo: string; executionCourt: string; notes: string }) => {
        const updatedStages = [...stages];
        const currentStage = updatedStages[activeStageIndex];

        // Mark as in execution
        currentStage.isInExecution = true;
        currentStage.executionData = data;

        // Add MASSIVE Green/Gold timeline event
        currentStage.timeline = [{
            id: `execution_${Date.now()}`,
            type: 'milestone',
            date: data.depositDate,
            title: `💼 إحالة لمديرية التنفيذ - رقم الإضبارة: ${data.executionFileNo}`,
            details: `انتقال من مرحلة التقاضي إلى المرحلة التنفيذية\n\nرقم الإضبارة التنفيذية: ${data.executionFileNo}\n${data.executionCourt ? `مديرية التنفيذ: ${data.executionCourt}\n` : ''}تاريخ الإيداع: ${data.depositDate}\n${data.notes ? `\nملاحظات: ${data.notes}` : ''}\n\n✅ الدعوى الآن في المرحلة التنفيذية.`,
            isNew: true,
            color: 'gold'
        }, ...(currentStage.timeline || [])];

        // Update parent status
        setStatus('قيد التنفيذ');

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم الانتقال للمرحلة التنفيذية بنجاح 💼');
        setShowExecutionTransferModal(false);
    };

    const handleExportPDF = () => {
        SmartToast.info('جاري تصدير الإضبارة... (قريباً) 🖨️');
    };

    // 🔥 NEW: Material Error Correction Handler
    const handleMaterialErrorCorrection = (data: { correctionType: string; errorDetails: string; requestDate: string }) => {
        try {
            const updatedStages = [...stages];
            const currentStageIndex = viewingStageIndex >= 0 ? viewingStageIndex : activeStageIndex;
            
            if (updatedStages[currentStageIndex]) {
                const newEvent: TimelineEvent = {
                    id: Date.now().toString(),
                    type: data.correctionType === 'clarification' ? 'note' : 'document',
                    title: data.correctionType === 'clarification' 
                        ? '📌 طلب توضيح حكم غامض' 
                        : '✏️ طلب تصحيح خطأ مادي',
                    date: data.requestDate,
                    description: data.errorDetails,
                    icon: data.correctionType === 'clarification' ? 'HelpCircle' : 'FileEdit'
                };

                updatedStages[currentStageIndex] = {
                    ...updatedStages[currentStageIndex],
                    timeline: [...(updatedStages[currentStageIndex].timeline || []), newEvent]
                };

                setStages(updatedStages);
                saveToCloud(updatedStages);
                
                const successMessage = data.correctionType === 'clarification'
                    ? 'تم تسجيل طلب التوضيح بنجاح ✅'
                    : 'تم تسجيل طلب التصحيح بنجاح ✅';
                    
                SmartToast.success(successMessage);
                setShowMaterialErrorModal(null);
            }
        } catch (error) {
            debug.error('❌ خطأ في تسجيل طلب التصحيح/التوضيح:', error);
            SmartToast.error('حدث خطأ أثناء حفظ الطلب');
        }
    };

    const handleResolveIncidentalCase = (id: string, status: IncidentalStatus) => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex].incidentalCases = currentStage.incidentalCases.map((c: IncidentalCase) => 
            c.id === id ? { ...c, status } : c
        );
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleAddAppointment = (data: { date: string; description: string; court?: string; [key: string]: unknown }) => {
        const updatedStages = [...stages];
        let autoLock = false;
        
        // 🔥 NEW: Auto-Task Generation for Witnesses/Experts
        if (data.purpose === 'انتخاب خبير / كشف') {
            // We can't call handleAddTask directly because it modifies state and triggers save.
            // Instead, we should modify the updatedStages object directly if we want atomic update, 
            // OR just accept that we trigger two updates. 
            // Calling handleAddTask is safer for code reuse but might cause race condition if we don't handle it carefully.
            // Let's modify updatedStages directly to be safe.
            const newTask: Task = {
                id: `task_auto_${Date.now()}`,
                title: `⚠️ تسديد أمانة الخبير والمصاريف لجلسة ${data.date}`,
                dueDate: data.date,
                isCompleted: false
            };
            updatedStages[activeStageIndex].tasks = [newTask, ...(currentStage.tasks || [])];
            SmartToast.info("تم إضافة مهمة إدارية لتسديد أجور الخبير تلقائياً 🤖");
        }
        if (data.purpose === 'استماع شهود') {
             const newTask: Task = {
                id: `task_auto_${Date.now()}`,
                title: `⚠️ تسديد نفقات الشهود لجلسة ${data.date}`,
                dueDate: data.date,
                isCompleted: false
            };
            updatedStages[activeStageIndex].tasks = [newTask, ...(currentStage.tasks || [])];
             SmartToast.info("تم إضافة مهمة إدارية لتسديد نفقات الشهود تلقائياً 🤖");
        }

        // 🔮 AUTOMATIC LOCK TRIGGER
        // If the hearing outcome/title mentions "Closing of Pleadings", lock the case globally.
        if (
            (data.title && (data.title.includes('ختام المرافعة') || data.title.includes('حجز الدعوى'))) ||
            (data.details && (data.details.includes('ختام المرافعة') || data.details.includes('حجز الدعوى')))
        ) {
            updatedStages[activeStageIndex].isPleadingsClosed = true;
            autoLock = true;
        }

        if (data.id) {
            // Update existing
            updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                e.id === data.id ? { ...e, ...data, type: 'appointment' } : e
            );
            setEditingEvent(null);
        } else {
            // Add new
            updatedStages[activeStageIndex].timeline = [{
                id: `appt_${Date.now()}`,
                type: 'appointment',
                date: data.date,
                title: data.title,
                details: data.details,
                subType: data.purpose, // Save purpose
                isNew: true
            }, ...(updatedStages[activeStageIndex].timeline || [])]; // Use updatedStages timeline which might have changed above? No, timeline is separate from tasks.
        }
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
        
        if (autoLock) {
            SmartToast.success("تم حجز الدعوى للقرار تلقائياً بناءً على نتيجة الجلسة 🔒");
        }
    };

    const handleAddAction = (data: { title: string; date: string; description: string; [key: string]: unknown }) => {
        const updatedStages = [...stages];
        
        if (data.isStayed) {
             setStatus('مستأخرة');
             setIsPaused(true);
             setPauseReason(data.title); 
        }

        // ========================================
        // 🔥 NEW: LITIGATION INCIDENTS LOGIC (عوارض الخصومة)
        // ========================================
        if (data.litigationIncidentType) {
            const currentStage = updatedStages[activeStageIndex];
            
            if (data.litigationIncidentType === 'ترك الدعوى للمراجعة') {
                // 1. Change case status
                setStatus('متروكة للمراجعة');
                
                // 2. Create high-priority task
                const urgentTask = {
                    id: `task_${Date.now()}`,
                    title: `🚨 تحذير: تجديد الدعوى المتروكة قبل مرور 10 أيام لمنع إبطالها (تاريخ الترك: ${data.date})`,
                    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(data.date || '').trim())
                        ? addCalendarDaysYmd(String(data.date).trim().slice(0, 10), 8)
                        : formatDateToLocalYmd(
                              (() => {
                                  const d = new Date(data.date);
                                  d.setDate(d.getDate() + 8);
                                  return d;
                              })()
                          ), // 8 days warning
                    isNew: true,
                    priority: 'high'
                };
                updatedStages[activeStageIndex].tasks = [urgentTask, ...(currentStage.tasks || [])];
                
                // 3. Add timeline event
                const event: TimelineEvent = {
                    id: `action_${Date.now()}`,
                    type: 'decision',
                    date: data.date,
                    title: '⏸️ ترك الدعوى للمراجعة',
                    details: `${data.title}\n\n⚠️ يجب تجديد السير بالدعوى خلال 10 أيام من هذا التاريخ وإلا تبطل.`,
                    isNew: true,
                    tags: ['#عوارض_الخصومة', '#غياب']
                };
                updatedStages[activeStageIndex].timeline = [event, ...currentStage.timeline];
                
                SmartToast.warning('تم ترك الدعوى للمراجعة - تحذير: يجب التجديد خلال 10 أيام! 🚨');
            } else if (data.litigationIncidentType === 'الوقف الاتفاقي') {
                // 1. Change case status
                setStatus('موقوفة اتفاقياً');
                setIsPaused(true);
                setPauseReason('الوقف الاتفاقي');
                
                // 2. Create high-priority task
                const urgentTask = {
                    id: `task_${Date.now()}`,
                    title: `🚨 تحذير: استئناف السير بالدعوى الموقوفة قبل مرور 15 يوماً من تاريخ ${data.stayEndDate}`,
                    dueDate: (() => {
                        const raw = String(data.stayEndDate || '').trim().slice(0, 10);
                        const base = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                            ? parseLocalNotificationDate(raw)
                            : new Date(data.stayEndDate);
                        base.setDate(base.getDate() - 3);
                        return formatDateToLocalYmd(base);
                    })(), // 3 days before end
                    isNew: true,
                    priority: 'high'
                };
                updatedStages[activeStageIndex].tasks = [urgentTask, ...(currentStage.tasks || [])];
                
                // 3. Add timeline event
                const event: TimelineEvent = {
                    id: `action_${Date.now()}`,
                    type: 'decision',
                    date: data.date,
                    title: '⏸️ الوقف الاتفاقي للدعوى',
                    details: `${data.title}\n\nنهاية مدة الوقف: ${data.stayEndDate}\n\n⚠️ يجب استئناف السير بالدعوى قبل مرور 15 يوماً من تاريخ انتهاء الوقف.`,
                    isNew: true,
                    tags: ['#عوارض_الخصومة', '#وقف_اتفاقي']
                };
                updatedStages[activeStageIndex].timeline = [event, ...currentStage.timeline];
                
                SmartToast.warning('تم إيقاف الدعوى اتفاقياً - تحذير: يجب الاستئناف في الوقت المحدد! ⏸️');
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
            return;
        }

        // ========================================
        // INCIDENTAL LAWSUIT LOGIC (م 66, 67, 69)
        // ========================================
        if (data.type === 'incidental') {
            debug.log('⚖️ تسجيل دعوى حادثة:', data.incidentalType);
            
            // 1. ADD TIMELINE EVENT (Deep Blue)
            const incidentalEvent: TimelineEvent = {
                id: `incidental_${Date.now()}`,
                type: 'decision', // Use decision base
                date: data.date || getLocalTodayYmd(),
                title: data.title,
                details: `${data.details}\n\n📝 تم دفع الرسم القانوني بموجب الوصل المرقم ${data.feeReceipt}.`,
                isNew: true,
                tags: ['#دعوى_حادثة', data.incidentalType === 'third_party' ? '#شخص_ثالث' : '#طلب_عارض']
            };
            
            updatedStages[activeStageIndex].timeline = [incidentalEvent, ...currentStage.timeline];

            // 2. THIRD PARTY INJECTION (Type C)
            if (data.incidentalType === 'third_party') {
                const newParty = {
                    id: `party_${Date.now()}`,
                    name: data.thirdPartyName,
                    role: data.thirdPartyRole, // 'شخص ثالث ...'
                    type: 'individual', // Default
                    notificationStatus: 'waiting'
                };

                // Add to parties array if not exists
                // Note: We might want to separate third parties or just add to main list with distinct role
                // The prompt says: "dynamically push the new third party into the caseData.parties array"
                const currentParties = updatedStages[activeStageIndex].parties || [];
                updatedStages[activeStageIndex].parties = [...currentParties, newParty];
                
                // Also update parent parties to reflect globally? Usually stages have their own parties state now.
                // But for header display, we often read from stage.
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
            SmartToast.success("تم تسجيل الدعوى الحادثة بنجاح ⚖️");
            return;
        }

        // ========================================
        // REGULAR ACTION LOGIC
        // ========================================
        const newEvent: TimelineEvent = {
            id: data.id || `action_${Date.now()}`,
            type: 'decision', 
            date: data.date,
            title: data.title,
            details: data.details,
            isNew: !data.id,
            isStayed: data.isStayed, 
            isSessionRecord: true 
        };

        if (data.id) {
             updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                e.id === data.id ? { ...e, ...newEvent } : e
            );
            setEditingEvent(null);
        } else {
             updatedStages[activeStageIndex].timeline = [newEvent, ...currentStage.timeline];
        }

        setStages(updatedStages);
        saveToCloud(updatedStages);
        
        if (data.isStayed) {
            SmartToast.warning("تم استئخار الدعوى وتجميد الإجراءات ⏸️");
        }
    };

    const handleAddNote = (data: { text: string; date: string; [key: string]: unknown }) => {
        const updatedStages = [...stages];
        let autoLock = false;

        // 🔮 AUTOMATIC LOCK TRIGGER
        if (
            (data.title && (data.title.includes('ختام المرافعة') || data.title.includes('حجز الدعوى'))) ||
            (data.details && (data.details.includes('ختام المرافعة') || data.details.includes('حجز الدعوى')))
        ) {
            updatedStages[activeStageIndex].isPleadingsClosed = true;
            autoLock = true;
        }
        
        if (data.id) {
            updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                e.id === data.id ? { ...e, ...data, type: 'note', tags: data.tags } : e
            );
            setEditingEvent(null);
        } else {
            updatedStages[activeStageIndex].timeline = [{
                id: `note_${Date.now()}`,
                type: 'note',
                date: getLocalTodayYmd(),
                title: data.title,
                details: data.details,
                tags: data.tags, // 🔥 NEW
                isNew: true
            }, ...currentStage.timeline];
        }
        setStages(updatedStages);
        saveToCloud(updatedStages);

        if (autoLock) {
            SmartToast.success("تم حجز الدعوى للقرار تلقائياً 🔒");
        }
    };

    const handleAddDoc = (data: { title: string; file: File | string; notes?: string; date: string; [key: string]: unknown }) => {
        try {
            // ✅ Validation
            const validation = validateDocumentData({ 
                docName: data.title, 
                docType: data.category, 
                date: data.date || getLocalTodayYmd()
            });
            if (!validation.valid) {
                SmartToast.error(validation.error || 'بيانات المستند غير صحيحة');
                return;
            }

            const updatedStages = [...stages];
            
            if (data.id) {
                updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                    e.id === data.id ? { ...e, ...data, type: 'document', docCategory: data.category, evidentiaryWeight: data.evidentiaryWeight } : e
                );
                setEditingEvent(null);
                SmartToast.success('تم تحديث المستند بنجاح ✅');
            } else {
                updatedStages[activeStageIndex].timeline = [{
                    id: `doc_${Date.now()}`,
                    type: 'document',
                    date: getLocalTodayYmd(),
                    title: data.title,
                    details: data.details,
                    docCategory: data.category,
                    evidentiaryWeight: data.evidentiaryWeight, // 🔥 NEW
                    isNew: true
                }, ...currentStage.timeline];
                SmartToast.success('تمت إضافة المستند بنجاح ✅');
            }
            
            setStages(updatedStages);
            saveToCloud(updatedStages);
        } catch (error) {
            logError('handleAddDoc', error, data);
            SmartToast.error('حدث خطأ أثناء حفظ المستند');
        }
    };

    const handleAddPayment = (amount: number, date: string) => {
        try {
            // ✅ Validation
            const validation = validatePaymentData({ amount, date });
            if (!validation.valid) {
                SmartToast.error(validation.error || 'بيانات الدفعة غير صحيحة');
                return;
            }

            // ✅ CRITICAL: Update PARENT fees, not stage fees
            const updatedParent = {
                ...parentData,
                feesPaid: Number(parentData.feesPaid) + amount
            };
            setParentData(updatedParent);
            
            // Add timeline event to current stage
            const updatedStages = [...stages];
            updatedStages[activeStageIndex].timeline = [{
                id: `pay_${Date.now()}`,
                type: 'note',
                date: date,
                title: 'دفعة مالية مستلمة',
                details: `تم استلام مبلغ ${amount.toLocaleString()} د.ع كجزء من الأتعاب.`,
                isNew: true
            }, ...currentStage.timeline];
        
            setStages(updatedStages);
            saveToCloud(updatedStages, updatedParent);
            SmartToast.success(`تم تسجيل دفعة ${amount.toLocaleString()} د.ع بنجاح ✅`);
        } catch (error) {
            logError('handleAddPayment', error, { amount, date });
            SmartToast.error('حدث خطأ أثناء تسجيل الدفعة');
        }
    };

    const handleDeleteEvent = (id: string) => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
            e.id === id ? { ...e, isDeleted: true } : e
        );
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleRestoreEvent = (id: string) => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
            e.id === id ? { ...e, isDeleted: false } : e
        );
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleHardDeleteEvent = (id: string) => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex].timeline = currentStage.timeline.filter((e: TimelineEvent) => e.id !== id);
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleEmptyTrash = () => {
        if (confirm('هل أنت متأكد من إفراغ سلة المهملات؟')) {
            const updatedStages = [...stages];
            updatedStages[activeStageIndex].timeline = currentStage.timeline.filter((e: TimelineEvent) => !e.isDeleted);
            setStages(updatedStages);
            saveToCloud(updatedStages);
            setIsTrashOpen(false);
        }
    };
    
    const handleEditEvent = (id: string) => {
        const event = currentStage.timeline.find((e: TimelineEvent) => e.id === id);
        if (event) setEditingEvent(event);
    };

    const handlePauseConfirm = (pauseData: { reason: string; linkedCaseNo?: string; id?: string; [key: string]: unknown }) => {
        const { reason, linkedCaseNo, id } = pauseData;
        const updatedStages = [...stages];

        if (id) {
            // Update existing event
            updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                e.id === id ? { 
                    ...e, 
                    title: 'قرار استئخار الدعوى ⏸️',
                    details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo}`,
                    // Ideally store raw data if possible, but for now we rely on re-parsing or just updating details
                } : e
            );
            
            // Also update stage state if it matches current pause
            if (isPaused && pauseReason === currentStage.stayReason) {
                 setPauseReason(reason);
                 setLinkedCaseNo(linkedCaseNo);
            }
            setEditingEvent(null);
        } else {
            // New Pause
            setStatus('مستأخرة');
            setIsPaused(true);
            setPauseReason(reason);
            setLinkedCaseNo(linkedCaseNo);
            
            updatedStages[activeStageIndex].timeline = [{
                id: `pause_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: 'قرار استئخار الدعوى ⏸️',
                details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo}`,
                isNew: true,
                isPause: true
            }, ...currentStage.timeline];
        }
        
        setShowPauseModal(false);
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };
    
    const handleResume = () => {
        // This is a direct resume (e.g. from Pause/Stay)
        // For Interruption, we use handleResumeInterruptionConfirm via Modal
        setStatus('نشطة');
        setIsPaused(false);
        setPauseReason('');
        
        // Add timeline event
        const updatedStages = [...stages];
        const newEvent: TimelineEvent = {
            id: `resume_${Date.now()}`,
            type: 'decision',
            date: getLocalTodayYmd(),
            title: '▶️ استئناف السير في الدعوى (من استئخار)',
            details: 'تم رفع التجميد واستئناف السير في الدعوى بشكل طبيعي.',
            isNew: true
        };
        
        updatedStages[activeStageIndex].timeline = [newEvent, ...(currentStage.timeline || [])];
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };



    const handleInterruptionToggle = () => {
        if (isInterrupted) {
            // Turning OFF -> Ask for Confirmation
            setShowResumeInterruptionModal(true);
        } else {
            // Turning ON -> Show Setup Modal
            setShowInterruptionModal(true);
        }
    };

    // ========================================
    // EXTRAORDINARY APPEALS HANDLER
    // ========================================
    const handleExtraordinaryAppeal = (data: { type: string; date: string; court: string; reasons: string; [key: string]: unknown }) => {
        const { type, date, court, reasons } = data;
        const updatedStages = [...stages];
        
        let newStatus = status;
        let statusLabel = '';
        let timelineTitle = '';
        let timelineDetails = `تاريخ التقديم: ${date}\nمقدمة إلى: ${court}\n\nالأسباب:\n${reasons}`;

        // 1. STATE OVERRIDE MUTATIONS (The Legal Re-opening)
        if (type === 'إعادة المحاكمة') {
            newStatus = 'قيد نظر إعادة المحاكمة';
            statusLabel = 'قيد نظر إعادة المحاكمة';
            timelineTitle = '🔄 تسجيل طلب إعادة المحاكمة';
            // Un-freeze slightly
            updatedStages[activeStageIndex].status = 'active'; 
        } else if (type === 'تصحيح القرار التمييزي') {
            newStatus = 'قيد نظر التصحيح التمييزي';
            statusLabel = 'قيد نظر التصحيح التمييزي';
            timelineTitle = '⚠️ طلب تصحيح القرار التمييزي';
             // Un-freeze slightly
            updatedStages[activeStageIndex].status = 'active';
        } else if (type === 'اعتراض الغير') {
            // Objection doesn't necessarily freeze, but we note it
            timelineTitle = '🙋‍♂️ تسجيل اعتراض الغير على الحكم';
            statusLabel = 'اعتراض الغير';
            // Status might remain 'active' or specific if needed, but per prompt: "do not necessarily freeze... unless manually requested"
            // We just add event.
        } else if (type === 'رد القاضي') {
            // 🔥 NEW: Judge Recusal - Freezes the case immediately
            newStatus = 'قيد نظر طلب رد القاضي';
            statusLabel = 'قيد نظر طلب رد القاضي';
            timelineTitle = '⚖️ طلب رد القاضي أو نقل الدعوى';
            // Freeze case completely
            setIsPaused(true);
            setPauseReason('قيد نظر طلب رد القاضي');
        }

        // 2. Update Global Status if changed
        if (newStatus !== status) {
            setStatus(newStatus);
        }

        // 3. Add Timeline Event (High Contrast)
        const newEvent: TimelineEvent = {
            id: `extra_appeal_${Date.now()}`,
            type: 'decision', // Uses decision icon/type base
            date: date,
            title: timelineTitle,
            details: timelineDetails,
            isNew: true,
            isSystemLog: true, // Mark as special system event
            tags: ['#طعن_استثنائي', type] // Add tag for filtering
        };

        updatedStages[activeStageIndex].timeline = [newEvent, ...currentStage.timeline];
        
        // 4. Update Stage Metadata to reflect this extraordinary state
        updatedStages[activeStageIndex].extraordinaryAppealType = type;

        setStages(updatedStages);
        saveToCloud(updatedStages);
        setShowExtraordinaryAppealModal(false);
        SmartToast.success(`تم تسجيل ${type} بنجاح وتحديث حالة الدعوى ⚖️`);
    };

    // ========================================
    // PROVISIONAL ORDERS HANDLER
    // ========================================
    const handleProvisionalOrderConfirm = (data: { type: string; targetParty: string; [key: string]: unknown }) => {
        const { type, targetParty } = data;
        
        // 1. Update Stage Data (Add to provisionalOrders)
        const updatedStages = [...stages];
        const currentOrders = updatedStages[activeStageIndex].provisionalOrders || [];
        
        updatedStages[activeStageIndex] = {
            ...currentStage,
            provisionalOrders: [...currentOrders, {
                id: `ord_${Date.now()}`,
                type,
                targetParty,
                date: getLocalTodayYmd()
            }]
        };

        // 2. Add Timeline Event
        updatedStages[activeStageIndex].timeline = [{
            id: `order_${Date.now()}`,
            type: 'decision', // Use decision for legal orders
            title: `🔒 صدر قرار ولائي (${type})`,
            details: `صدر قرار ولائي بـ (${type}) بحق (${targetParty}).\n\n⚠️ هذا الإجراء لا يوقف سير الدعوى ولكنه يفرض قيوداً قانونية.`,
            date: getLocalTodayYmd(),
            isNew: true
        }, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages);
        setShowProvisionalOrderModal(false);
        SmartToast.warning(`تم إصدار قرار ولائي (${type}) بنجاح`);
    };

    const handleInterlocutoryAppealConfirm = (data: { decisionType: string; decisionDate: string; calculatedDeadline: string; id: string; [key: string]: unknown }) => {
        const { decisionType, decisionDate, calculatedDeadline, id } = data;
        const updatedStages = [...stages];
        
        if (id) {
            // Update existing event
            updatedStages[activeStageIndex].timeline = currentStage.timeline.map((e: TimelineEvent) => 
                e.id === id ? { 
                    ...e, 
                    details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                    date: decisionDate
                } : e
            );
            setEditingEvent(null);
        } else {
            // 1. Add Timeline Event
            const newEvent: TimelineEvent = {
                id: `appeal_${Date.now()}`,
                type: 'decision', // Use decision type for legal actions
                title: 'طعن تمييزي في قرار إعدادي (مادة 216) ⚖️',
                details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                date: getLocalTodayYmd(),
                isNew: true
            };

            // 2. Add To-Do Task
            const newTask: Task = {
                id: `task_appeal_${Date.now()}`,
                title: `تقديم لائحة الطعن التمييزي (${decisionType})`,
                dueDate: calculatedDeadline,
                isCompleted: false
            };

            // Ensure we work with arrays even if undefined
            const currentTimeline = currentStage.timeline || [];
            const currentTasks = currentStage.tasks || [];

            updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
            updatedStages[activeStageIndex].tasks = [newTask, ...currentTasks];
        }
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
        setShowInterlocutoryModal(false);
    };

    const handleInterruptionConfirm = (data: { reason: string; affectedParty: string; date: string; notes: string; id: string; [key: string]: unknown }) => {
        const { reason, affectedParty, date, notes, id } = data;
        const updatedStages = [...stages];
        const currentTimeline = currentStage.timeline || [];

        if (id) {
            // Update existing event
            updatedStages[activeStageIndex].timeline = currentTimeline.map((e: TimelineEvent) => 
                e.id === id ? {
                    ...e,
                    date: date,
                    details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}⚖️ *الدعوى موقوفة بحكم القانون لحين تبليغ الورثة أو من يقوم مقام الخصم.*`
                } : e
            );
            
            // Update state if matching
            if (isInterrupted && interruptionData && interruptionData.id === id) {
                 setInterruptionData(data);
            }
            setEditingEvent(null);
        } else {
            // New Interruption
            setStatus('منقطعة');
            setIsInterrupted(true);
            setInterruptionData(data);
            
            // 🆕 Set Interruption Date
            updatedStages[activeStageIndex].interruptionDate = new Date().toISOString();

            const newEvent: TimelineEvent = {
                id: `interrupt_${Date.now()}`,
                type: 'decision',
                date: date,
                title: 'قرار بانقطاع السير في الدعوى 🛑',
                details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}⚖️ *الدعوى موقوفة بحكم القانون لحين تبليغ الورثة أو من يقوم مقام الخصم.*`,
                isNew: true
            };

            updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
        }
        
        setShowInterruptionModal(false);
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleResumeInterruptionConfirm = () => {
        setStatus('نشطة');
        setIsInterrupted(false);
        setInterruptionData(null);
        
        // Add timeline event for resuming interruption
        const updatedStages = [...stages];
        
        // 🆕 Clear Interruption Date
        updatedStages[activeStageIndex].interruptionDate = undefined;

        const newEvent: TimelineEvent = {
            id: `resume_int_${Date.now()}`,
            type: 'decision',
            date: getLocalTodayYmd(),
            title: '🟢 استئناف السير (زوال سبب الانقطاع)',
            details: 'تم تبليغ من يقوم مقام الخصم أو زوال السبب القانوني للانقطاع، واستئناف السير في الدعوى من النقطة التي وقفت عندها.',
            isNew: true
        };

        updatedStages[activeStageIndex].timeline = [newEvent, ...(currentStage.timeline || [])];
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
        setShowResumeInterruptionModal(false);
    };

    // ========================================
    // ABANDONMENT & WARNING RADAR LOGIC
    // ========================================
    const handleAbandonment = () => {
        const updatedStages = [...stages];
        const currentCount = currentStage.abandonmentCount || 0;
        
        if (currentCount === 0) {
            // First time allowed
            updatedStages[activeStageIndex] = {
                ...currentStage,
                abandonmentDate: new Date().toISOString(),
                abandonmentCount: 1,
                status: 'abandoned'
            };
            
            // Add timeline event
            updatedStages[activeStageIndex].timeline = [{
                id: `abandon_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: '⏸️ ترك الدعوى للمراجعة (للمرة الأولى)',
                details: 'تم ترك الدعوى للمراجعة. يجب تجديدها خلال 10 أيام وإلا تبطل عريضتها.',
                isNew: true
            }, ...(currentStage.timeline || [])];
            
            SmartToast.warning("تم ترك الدعوى للمراجعة - انتبه للمهلة القانونية (10 أيام)!");
        } else {
            // Second time! Fatal legal consequence.
            updatedStages[activeStageIndex] = {
                ...currentStage,
                isVoided: true,
                abandonmentDate: undefined,
                status: 'voided'
            };
            
            // Add timeline event
            updatedStages[activeStageIndex].timeline = [{
                id: `void_${Date.now()}`,
                type: 'decision',
                date: getLocalTodayYmd(),
                title: '❌ إبطال عريضة الدعوى',
                details: 'تم إبطال عريضة الدعوى قانوناً لتركها للمراجعة للمرة الثانية.',
                isNew: true
            }, ...(currentStage.timeline || [])];
            
            SmartToast.error("تم إبطال عريضة الدعوى قانوناً!");
        }

        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    const handleResumeAbandonment = () => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...currentStage,
            abandonmentDate: undefined,
            status: 'active'
            // NOTE: We do NOT reset abandonmentCount. It remains 1.
        };

         // Add timeline event
        updatedStages[activeStageIndex].timeline = [{
            id: `resume_abandon_${Date.now()}`,
            type: 'decision',
            date: getLocalTodayYmd(),
            title: '🔄 تجديد الدعوى',
            details: 'تم تجديد الدعوى بعد تركها للمراجعة.',
            isNew: true
        }, ...(currentStage.timeline || [])];
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success("تم تجديد الدعوى بنجاح");
    };
    
    // ========================================
    // CRITICAL: SMART JUDGMENT HANDLER (Time & State Engine)
    // ========================================
    const handleJudgmentConfirm = (judgmentData: { date: string; type: string; form: string; decision: string; [key: string]: unknown }) => {
        try {
            // ✅ Validation
            const validation = validateJudgmentData(judgmentData);
            if (!validation.valid) {
                SmartToast.error(validation.error || 'بيانات الحكم غير صحيحة');
                return;
            }

            const { action, judgmentType, judgmentForm, judgmentDate, notes, nextStage, openAppealTransitionModal } = judgmentData;

            debug.log('⚖️ بدء معالجة قرار الحكم:', action);

            // 🔥 NEW: If user clicked "Appeal", open the AppealTransitionModal instead of processing immediately
            if (openAppealTransitionModal) {
                debug.log('🔄 فتح نافذة بوابة الطعن...');
                setTempJudgmentData(judgmentData); // Store judgment data for later
                setShowAppealTransitionModal(true);
                return; // Don't process judgment yet
            }

        const updatedStages = [...stages];
        const jdRaw = String(judgmentDate || '').trim().slice(0, 10);
        const now = /^\d{4}-\d{2}-\d{2}$/.test(jdRaw)
            ? parseLocalNotificationDate(jdRaw)
            : new Date(judgmentDate);

        // Helper: Calculate date + days
        const addDays = (date: Date, days: number) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return formatDateToLocalYmd(result);
        };

        // ========================================
        // SCENARIO 1: تجميد وانتظار (Waiting for Appeal / Default Objection)
        // ========================================
        if (action === 'waiting_for_appeal') {
            // Calculate Appeal Deadline
            let appealDeadline = undefined;
            if (judgmentForm === 'غيابي') {
                appealDeadline = addDays(now, 10);
            } else if (judgmentForm === 'حضوري' && currentStage.stageName.includes('البداءة')) {
                 appealDeadline = addDays(now, 15);
            }

            // Determine Decision Text based on Type
            let decisionText = `محسومة - بانتظار الطعن (${judgmentType})`;
            if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') decisionText = 'محسومة لصالح الموكل - بانتظار الطعن';
            else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') decisionText = 'محسومة ضد الموكل - بانتظار الطعن';
            else if (judgmentType === 'رد الدعوى جزئياً') decisionText = 'محسومة جزئياً - بانتظار الطعن';

            // Mark current stage as completed
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: decisionText,
                judgmentForm: judgmentForm, 
                lastJudgmentType: judgmentForm as 'حضوري' | 'غيابي',
                decisionDate: judgmentDate,
                isPleadingsClosed: true, 
                appealDeadline: appealDeadline,
                legalTimers: {
                    appealDeadline: appealDeadline || addDays(now, 15),
                    cassationDeadline: addDays(now, 30),
                    defaultObjectionDeadline: judgmentForm === 'غيابي' ? addDays(now, 10) : undefined
                }
            };

            // Add timeline event
            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: `✅ حكم بـ ${judgmentType} (${judgmentForm})`,
                details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n⏳ الحالة: بانتظار انتهاء المدة القانونية للطعن.\n\n📅 مواعيد الطعن القانونية:\n- الاستئناف: متاح حتى ${addDays(now, 15)}\n- التمييز: متاح حتى ${addDays(now, 30)}`,
                isNew: true
            }, ...currentStage.timeline];

            debug.log(`✅ المرحلة "${currentStage.stageName}" تم ختمها كـ "${decisionText}"`);

            // 🔥 NEW: Check for Auto-Objection Trigger (from SmartJudgmentModal)
            // If user clicked "Save and Object", we open the objection modal now.
            if (judgmentData.openObjectionModal) {
                setTimeout(() => setShowObjectionRegistrationModal(true), 500);
            }
        }

        // ========================================
        // SCENARIO 2: مراجعة (Left for Review) - LEGACY SUPPORT ONLY
        // ========================================
        else if (action === 'archive_review') {
            // ... existing logic ...
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'متروكة للمراجعة',
                decisionDate: judgmentDate,
                legalTimers: {
                    reviewDeadline: addDays(now, 10)
                }
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: '🔄 قرار بترك الدعوى للمراجعة',
                details: `${notes}\n\n⚠️ الدعوى متروكة للمراجعة.\n⏳ سيتم الإبطال التلقائي إذا لم تتم المراجعة خلال:\n\n📅 موعد المراجعة النهائي: ${addDays(now, 10)}`,
                isNew: true
            }, ...currentStage.timeline];
        }

        // ========================================
        // SCENARIO 3: إبطال (Annulled)
        // ========================================
        else if (action === 'archive_annulled') {
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'مبطلة',
                decisionDate: judgmentDate
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: '⚫ قرار بإبطال الدعوى',
                details: `${notes}\n\n⚖️ تم إبطال الدعوى رسمياً.\n📁 الملف تم أرشفته كدعوى ملغاة.`,
                isNew: true
            }, ...currentStage.timeline];
        }

        // ========================================
        // 🔥 NEW SCENARIO 3.5: NON-MERIT TERMINATIONS (النهايات الرضائية)
        // ========================================
        else if (action === 'finalize_non_merit') {
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                decisionDate: judgmentDate,
                isPleadingsClosed: true
            };

            let titleText = '📜 ';
            let detailsText = '';

            if (judgmentType === 'تصديق الصلح والتسوية') {
                titleText += 'تصديق الصلح والتسوية (مكتسبة الدرجة القطعية)';
                detailsText = `${notes}\n\n✅ تم تصديق الصلح بين الأطراف.\n🏛️ يعتبر تصديق الصلح بمثابة حكم مكتسب الدرجة القطعية.\n🔒 لا يقبل أي طعن (مادة 455 مرافعات).`;
            } else if (judgmentType === 'التنازل عن الدعوى') {
                titleText += 'التنازل عن الدعوى (مكتسبة الدرجة القطعية)';
                detailsText = `${notes}\n\n✅ تنازل المدعي عن دعواه.\n🏛️ يعتبر التنازل إنهاءً نهائياً للدعوى.\n🔒 لا يقبل أي طعن.`;
            } else if (judgmentType === 'إبطال عريضة الدعوى') {
                titleText += 'إبطال عريضة الدعوى (مكتسبة الدرجة القطعية)';
                detailsText = `${notes}\n\n⚫ تم إبطال عريضة الدعوى قانوناً.\n🏛️ إنهاء نهائي للدعوى.\n🔒 لا يقبل أي طعن.`;
            }

            updatedStages[activeStageIndex].timeline = [{
                id: `non_merit_${Date.now()}`,
                type: 'milestone',
                date: judgmentDate,
                title: titleText,
                details: detailsText,
                isNew: true,
                color: 'emerald'
            }, ...currentStage.timeline];

            // Update parent status
            setStatus('مكتسبة الدرجة القطعية');

            SmartToast.success(`تم إنهاء الدعوى: ${judgmentType} ✅`);
        }

        // ========================================
        // SCENARIO 4: الانتقال للمرحلة الأخرى (Transition) - DYNAMIC
        // ========================================
        else if (action === 'transition') {
            debug.log('🔄 بدء عملية الانتقال للمرحلة التالية...');
            
            // Determine Decision Text based on Type
            let decisionText = `انتقال للمرحلة التالية (${judgmentType})`;
            let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;
            
            if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
                decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
                timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
            } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
                decisionText = 'رد الدعوى (حكم ضد الموكل)';
                timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
            } else if (judgmentType === 'رد الدعوى جزئياً') {
                decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
                timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
            }

            // STEP 1: Archive Current Stage
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'locked', 
                finalDecision: decisionText, // ✅ DYNAMIC DECISION
                decisionDate: judgmentDate,
                judgmentForm: judgmentForm
            };

            // Add judgment event to archived stage
            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: timelineTitle, // ✅ DYNAMIC TITLE
                details: `${notes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الانتقال مباشرة للمرحلة القادمة: ${nextStage}\n\n📁 تم أرشفة هذه المرحلة وحفظها كملف فرعي.`,
                isNew: true
            }, ...currentStage.timeline];

            debug.log(`📁 تم أرشفة مرحلة "${currentStage.stageName}" بالكامل`);

            // STEP 2: Wipe Parties (As requested by user)
            // No carrying over names or roles. Completely blank slate.
            const newParties = [
                { role: 'صفة اطرف الأول', name: '', type: 'individual' },
                { role: 'صفة الطرف الثاني', name: '', type: 'individual' }
            ];

            debug.log(`✨ تم تصفية أطراف الدعوى للمرحلة الجديدة: "${nextStage}"`);

            // STEP 4: CREATE THE NEW CLEAN SLATE STAGE (Child File)
            const newStageId = `stage_${Date.now()}`;
            const newStageObject = {
                id: newStageId,
                stageName: nextStage,
                
                // ✅ KEEP IDENTICAL (From Parent):
                type: currentStage.type, // نوع الدعوى NEVER changes
                
                // ✅ WIPE/RESET (Clean Slate):
                caseNo: '', // User will fill new case number
                court: '', // User will fill new court
                judge: '',
                timeline: [], // 🔥 COMPLETELY EMPTY - The Critical Part
                tasks: [],
                incidentalCases: [],
                
                // ✅ UPDATE (New Stage Info):
                parties: newParties, // Swapped roles
                createdDate: getLocalTodayYmd(),
                finalDecision: null,
                decisionDate: null,
                status: 'active'
            };

            debug.log(`✨ تم إنشاء مرحلة جديدة نظيفة: "${nextStage}"`);
            debug.log('📋 Timeline الجديد فارغ تماماً:', newStageObject.timeline.length === 0);

            // STEP 5: Add to Stages Array & Switch View
            updatedStages.push(newStageObject);
            setActiveStageIndex(updatedStages.length - 1);

            // STEP 6: CRITICAL - Dynamic Stepper Update
            // Instead of searching by name, we rebuild stepper from actual stages
            // This allows for infinite custom stage names (e.g., "إعادة المحاكمة", "التنفيذ")
            debug.log(`🎯 تم تفعيل المرحلة الجديدة: \"${nextStage}\" بشكل ديناميكي`);
            debug.log(`📊 عدد المراحل الكلي: ${updatedStages.length}`);
        }

        // ========================================
        // SCENARIO 5: رد الدعوى -> انتهاء الدعوى تماماً (Final Close)
        // ========================================
        else if (action === 'final_close') {
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'منتهية نهائياً (30 يوم للطعن)',
                decisionDate: judgmentDate,
                // ✨ INJECT FINAL APPEAL TIMER
                legalTimers: {
                    finalAppealDeadline: addDays(now, 30)
                }
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `judgment_${Date.now()}`,
                type: 'decision',
                date: judgmentDate,
                title: '🛑 انتهاء الدعوى نهائياً (حكم برد الدعوى)',
                details: `${notes}\n\n❌ تم رد الدعوى.\n⚠️ الدعوى في مرحلة الإغلاق النهائي.\n\n⏰ مدة 30 يوماً للطعن تبدأ من تاريخ الحكم.\n📅 الموعد النهائي للطعن: ${addDays(now, 30)}\n\n🔒 سيتم إغلاق الملف نهائياً بعد انقضاء المدة القانونية.`,
                isNew: true
            }, ...currentStage.timeline];

            // Also update the PARENT status
            setStatus('منتهية');

            debug.log(`🛑 الدعوى منتهية نهائياً. موعد الطعن النهائي: ${addDays(now, 30)}`);
        }

        // ========================================
        // SCENARIO 6: CASSATION - FINAL RATIFICATION (التصديق والدرجة القطعية)
        // ========================================
        else if (action === 'final_ratification') {
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed', // Locked and done
                finalDecision: 'مكتسبة الدرجة القطعية',
                decisionDate: judgmentDate,
                isPleadingsClosed: true
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `cassation_final_${Date.now()}`,
                type: 'milestone', // Golden event
                date: judgmentDate,
                title: '🏛️ تم تصديق الحكم واكتساب الدعوى الدرجة القطعية',
                details: `${notes}\n\n🎉 صدق محكمة التمييز الحكم المطعون فيه.\n✅ اكتسب الحكم الدرجة القطعية ولا يقبل أي طعن آخر (إلا تصحيح القرار في حالات نادرة).\n🔒 تم غلق ملف الدعوى نهائياً.`,
                isNew: true,
                color: 'gold' // Make it shine
            }, ...currentStage.timeline];
            
            // Also update the PARENT status
            setStatus('مكتسبة الدرجة القطعية');
            
            SmartToast.success("مبروك! اكتسب الحكم الدرجة القطعية");
        }

        // ========================================
        // SCENARIO 7: CASSATION - REMAND (نقض وإعادة)
        // ========================================
        else if (action === 'remand_to_lower') {
            // We keep it active because work continues (in the lower court, but tracked here for now)
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'active',
                finalDecision: 'منقوضة ومعادة (بانتظار المرافعة بعد النقض)',
                decisionDate: judgmentDate
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `cassation_remand_${Date.now()}`,
                type: 'alert', // Red/Amber event
                date: judgmentDate,
                title: '⚠️ تم نقض الحكم التمييزي وإعادة الإضبارة',
                details: `${notes}\n\n↩️ قررت محكمة التمييز نقض الحكم وإعادة الإضبارة للمحكمة المختصة.\n📢 يجب متابعة تحديد موعد المرافعة الجديد لاتباع القرار التمييزي.`,
                isNew: true,
                color: 'red'
            }, ...currentStage.timeline];

            SmartToast.error("تم نقض الحكم! استعد لجولات جديدة");
        }

        // ========================================
        // SCENARIO 8: CASSATION - CORRECTION REQUEST (تصحيح القرار)
        // ========================================
        else if (action === 'correction_request') {
             // Just a timeline event, stage remains active/waiting
            updatedStages[activeStageIndex].timeline = [{
                id: `cassation_correction_${Date.now()}`,
                type: 'milestone',
                date: judgmentDate,
                title: '📝 تم تقديم طلب تصحيح قرار تمييزي',
                details: `${notes}\n\n⚠️ تم تقديم طلب لتصحيح الخطأ القانوني في القرار التمييزي.\n⏳ بانتظار نتيجة التدقيق.`,
                isNew: true,
                color: 'blue'
            }, ...currentStage.timeline];
            
            SmartToast.info("تم تسجيل طلب تصحيح القرار");
        }

        // ========================================
        // 🔥 CRITICAL: AUTOMATED JUDGMENT SYNCHRONIZATION (Article 245)
        // Automatically Update Attachment Status Based on Judgment
        // ========================================
        if (currentStage.attachments && currentStage.attachments.length > 0) {
            const activeAttachments = currentStage.attachments.filter((a: AttachmentData) => a.isActive);
            
            if (activeAttachments.length > 0) {
                debug.log('🔒 درع الحجز: بدء التحديث التلقائي بناءً على الحكم...');
                
                // Determine plaintiff win/loss based on judgment type
                const isPlaintiffWin = judgmentType === 'إجابة الدعوى' || 
                                      judgmentType === 'إجابة الدعوى بالكامل' ||
                                      judgmentType === 'إجابة الدعوى جزئياً';
                                      
                const isPlaintiffLoss = judgmentType === 'رد الدعوى' || 
                                       judgmentType === 'رد الدعوى كلياً';
                
                // Update all active attachments
                updatedStages[activeStageIndex].attachments = (currentStage.attachments || []).map((attachment: AttachmentData) => {
                    if (!attachment.isActive) return attachment; // Skip inactive ones
                    
                    let newStatus = attachment.status;
                    let syncNote = '';
                    
                    if (isPlaintiffWin) {
                        newStatus = 'مصدق تلقائياً ✅';
                        syncNote = 'تأكيد: الحكم لصالح المدعي يتضمن تصديق الحجز (المادة 245)';
                        debug.log('✅ الحجز تم تصديقه تلقائياً - حكم لصالح المدعي');
                    } else if (isPlaintiffLoss) {
                        newStatus = 'مرفوع تلقائياً ❌';
                        syncNote = 'تأكيد: الحكم برد الدعوى يتضمن رفع الحجز (المادة 245)';
                        debug.log('❌ الحجز تم رفعه تلقائياً - حكم برد الدعوى');
                    }
                    
                    // Add sync timeline event
                    if (syncNote) {
                        updatedStages[activeStageIndex].timeline = [{
                            id: `attach_sync_${Date.now()}_${attachment.id}`,
                            type: 'action',
                            date: judgmentDate,
                            title: `🔒 ${syncNote}`,
                            details: `المال المحجوز: ${attachment.attachedProperty}\nالحالة الجديدة: ${newStatus}`,
                            isAttachment: true,
                            attachmentStatus: newStatus,
                            isNew: true
                        }, ...updatedStages[activeStageIndex].timeline];
                    }
                    
                    return {
                        ...attachment,
                        status: newStatus,
                        isActive: isPlaintiffWin, // Keep active only if ratified
                        judgmentSyncDate: judgmentDate,
                        judgmentSyncNote: syncNote
                    };
                });
                
                debug.log('🔒 درع الحجز: اكتمل التحديث التلقائي ✓');
            }
        }

        // ========================================
        // SAVE & CLOSE
        // ========================================
        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        setShowJudgmentModal(false);

        debug.log('✅ تم حفظ قرار الحكم بنجاح');
        SmartToast.success('تم حفظ قرار الحكم بنجاح ⚖️');
        } catch (error) {
            logError('handleJudgmentConfirm', error, judgmentData);
            SmartToast.error('حدث خطأ أثناء حفظ قرار الحكم');
        }
    };

    // ========================================
    // 🔥 NEW: APPEAL TRANSITION HANDLER (بوابة الطعن)
    // ========================================
    const handleAppealTransition = (appealData: {
        appealType: string;
        appellant: string;
        filingDate: string;
        newCaseNumber: string;
        notes: string;
    }) => {
        debug.log('🔄 بدء معالجة الانتقال للطعن:', appealData);

        if (!tempJudgmentData) {
            debug.error('❌ خطأ: لا توجد بيانات حكم مؤقتة');
            return;
        }

        const { judgmentType, judgmentForm, judgmentDate, notes: judgmentNotes } = tempJudgmentData;
        const { appealType, appellant, filingDate, newCaseNumber, notes: appealNotes } = appealData;

        const updatedStages = [...stages];
        const jdRawAppeal = String(judgmentDate || '').trim().slice(0, 10);
        const now = /^\d{4}-\d{2}-\d{2}$/.test(jdRawAppeal)
            ? parseLocalNotificationDate(jdRawAppeal)
            : new Date(judgmentDate);

        // Helper: Calculate date + days
        const addDays = (date: Date, days: number) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return formatDateToLocalYmd(result);
        };

        // Determine Decision Text based on Type
        let decisionText = `انتقال لمرحلة ${appealType} (${judgmentType})`;
        let timelineTitle = `➡️ حكم بـ ${judgmentType} والانتقال`;
        
        if (judgmentType === 'إجابة الدعوى' || judgmentType === 'إجابة الدعوى بالكامل') {
            decisionText = 'إجابة الدعوى (حكم لصالح الموكل)';
            timelineTitle = '✅ حكم بإجابة الدعوى (حكم لصالح الموكل)';
        } else if (judgmentType === 'رد الدعوى' || judgmentType === 'رد الدعوى كلياً') {
            decisionText = 'رد الدعوى (حكم ضد الموكل)';
            timelineTitle = '❌ حكم برد الدعوى (حكم ضد الموكل)';
        } else if (judgmentType === 'رد الدعوى جزئياً') {
            decisionText = 'رد الدعوى جزئياً (حكم جزئي)';
            timelineTitle = '⚠️ حكم برد الدعوى جزئياً';
        }

        // STEP 1: Archive Current Stage
        updatedStages[activeStageIndex] = {
            ...currentStage,
            status: 'locked', 
            finalDecision: decisionText,
            decisionDate: judgmentDate,
            judgmentForm: judgmentForm,
            previousCaseNumber: currentStage.caseNo // Store old case number
        };

        // Add judgment event to archived stage
        updatedStages[activeStageIndex].timeline = [{
            id: `judgment_${Date.now()}`,
            type: 'decision',
            date: judgmentDate,
            title: timelineTitle,
            details: `${judgmentNotes}\n\n⚖️ صدر الحكم بـ "${judgmentType}".\n➡️ تم الطعن في الحكم والانتقال لمرحلة ${appealType}\n\n📋 تفاصيل الطعن:\n- مقدم الطعن (المستأنف): ${appellant}\n- رقم دعوى ${appealType}: ${newCaseNumber}\n- تاريخ تقديم اللائحة: ${filingDate}\n\n📁 تم أرشفة هذه المرحلة وحفظها كملف فرعي.`,
            isNew: true
        }, ...currentStage.timeline];

        debug.log(`📁 تم أرشفة مرحلة "${currentStage.stageName}" بالكامل`);

        // STEP 2: Role Flipping (انقلاب المراكز القانونية)
        // 🔥 DYNAMIC ROLE TERMINOLOGY (Cassation vs Appeal)
        const isCassation = appealType === 'تمييز';
        const appellantTitle = isCassation ? 'المميز' : 'المستأنف';
        const appelleeTitle = isCassation ? 'المميز عليه' : 'المستأنف عليه';

        const newParties = [...currentStage.parties].map((party: { role: string; [key: string]: unknown }) => {
            let newRole = party.role;
            
            // Determine new roles based on who filed the appeal
            if (appellant === 'المدعي') {
                // Plaintiff filed appeal
                if (party.role === 'المدعي' || party.role.includes('مدعي')) {
                    newRole = `${appellantTitle} (المدعي)`;
                } else if (party.role === 'المدعى عليه' || party.role.includes('مدعى عليه')) {
                    newRole = `${appelleeTitle} (المدعى عليه)`;
                }
            } else {
                // Defendant filed appeal
                if (party.role === 'المدعى عليه' || party.role.includes('مدعى عليه')) {
                    newRole = `${appellantTitle} (المدعى عليه)`;
                } else if (party.role === 'المدعي' || party.role.includes('مدعي')) {
                    newRole = `${appelleeTitle} (المدعي)`;
                }
            }

            return {
                ...party,
                role: newRole,
                name: '' // 🔥 CRITICAL: Wipe names as requested
            };
        });

        debug.log(`✨ تم انقلاب المراكز القانونية - المستأنف: ${appellant}`);

        // STEP 3: CREATE THE NEW CLEAN SLATE STAGE (Child File)
        const newStageId = `stage_${Date.now()}`;
        const newStageObject = {
            id: newStageId,
            stageName: appealType === 'استئناف' ? 'الاستئناف' : 'التمييز',
            
            // ✅ KEEP IDENTICAL (From Parent):
            type: currentStage.type, // نوع الدعوى NEVER changes
            
            // ✅ WIPE/RESET (Clean Slate):
            caseNo: newCaseNumber,
            court: '', // User will fill
            judge: '',
            timeline: [], // 🔥 COMPLETELY EMPTY
            tasks: [],
            incidentalCases: [],
            
            // ✅ UPDATE (New Stage Info):
            parties: newParties, // Flipped roles with wiped names
            createdDate: filingDate,
            finalDecision: null,
            decisionDate: null,
            status: 'active',
            
            // Store metadata for this appeal
            appealMetadata: {
                appealType,
                appellant,
                filingDate,
                previousCaseNumber: currentStage.caseNo,
                previousStage: currentStage.stageName,
                hasCrossAppeal: false // Will be set to true if cross-appeal is filed
            }
        };

        debug.log(`✨ تم إنشاء مرحلة جديدة نظيفة: "${appealType}"`);
        debug.log('📋 Timeline الجديد فارغ تماماً:', newStageObject.timeline.length === 0);
        debug.log('👥 الأطراف بعد انقلاب المراكز:', newParties.map((p) => p.role).join(', '));

        // Add Golden Timeline Event to NEW stage
        newStageObject.timeline = [{
            id: `appeal_filed_${Date.now()}`,
            type: 'milestone',
            date: filingDate,
            title: `🚀 تم الطعن بالقرار وانتقال الدعوى إلى مرحلة ${appealType}`,
            details: `تم تقديم لائحة ${appealType} برقم ${newCaseNumber}\n\nمقدم الطعن: ${appellant}\n${appealNotes ? `\nملاحظات: ${appealNotes}` : ''}`,
            isNew: true
        }];

        // STEP 4: Add to Stages Array & Switch View
        updatedStages.push(newStageObject);
        setActiveStageIndex(updatedStages.length - 1);
        setViewingStageIndex(updatedStages.length - 1);

        // STEP 5: Save & Close
        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        setShowAppealTransitionModal(false);
        setTempJudgmentData(null);

        SmartToast.success(`تم الانتقال بنجاح لمرحلة ${appealType}`);
        debug.log(`✅ تم الانتقال بنجاح لمرحلة ${appealType} برقم ${newCaseNumber}`);
    };

    // ========================================
    // 🔥 NEW: CROSS-APPEAL HANDLER (الاستئناف المتقابل)
    // ========================================
    const handleCrossAppeal = (crossAppealData: {
        filingDate: string;
        receiptNumber: string;
        notes: string;
    }) => {
        debug.log('🔄 بدء معالجة الاستئناف المتقابل:', crossAppealData);

        const updatedStages = [...stages];
        const { filingDate, receiptNumber, notes } = crossAppealData;

        // Mark that cross-appeal has been filed
        if (currentStage.appealMetadata) {
            updatedStages[activeStageIndex] = {
                ...currentStage,
                appealMetadata: {
                    ...currentStage.appealMetadata,
                    hasCrossAppeal: true,
                    crossAppealDate: filingDate,
                    crossAppealReceipt: receiptNumber
                }
            };
        }

        // Update parties roles to add "(مستأنف متقابل)" to the appellee
        const updatedParties = currentStage.parties.map((party: { role: string; [key: string]: unknown }) => {
            if (party.role.includes('المستأنف عليه') && !party.role.includes('متقابل')) {
                return {
                    ...party,
                    role: `${party.role} (مستأنف متقابل)`
                };
            }
            return party;
        });

        updatedStages[activeStageIndex] = {
            ...updatedStages[activeStageIndex],
            parties: updatedParties
        };

        // Add Teal/Green Timeline Event
        updatedStages[activeStageIndex].timeline = [{
            id: `cross_appeal_${Date.now()}`,
            type: 'milestone',
            date: filingDate,
            title: '🔄 تم تقديم لائحة استئناف متقابل',
            details: `تم تقديم لائحة استئناف متقابل من قبل المستأنف عليه\n${receiptNumber ? `\nرقم وصل الرسوم: ${receiptNumber}` : ''}\n${notes ? `\nملاحظات: ${notes}` : ''}`,
            isNew: true,
            color: 'teal' // Special color for cross-appeal
        }, ...currentStage.timeline];

        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        setShowCrossAppealModal(false);

        SmartToast.success('تم تسجيل الاستئناف المتقابل بنجاح');
        debug.log('✅ تم تسجيل الاستئناف المتقابل بنجاح');
    };
    
    // ========================================
    // CASSATION OUTCOME HANDLER (Ratified / Quashed)
    // ========================================
    const handleCassationDecision = (decision: 'ratified' | 'quashed') => {
        const updatedStages = [...stages];
        const now = getLocalTodayYmd();

        if (decision === 'ratified') {
            // Ratified: Close the case stage as successful/final
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
                decisionDate: now
            };
            
            updatedStages[activeStageIndex].timeline = [{
                id: `cass_ratified_${Date.now()}`,
                type: 'decision',
                date: now,
                title: '✅ قرار تصديق الحكم (مصدق)',
                details: 'قررت محكمة التمييز الاتحادية تصديق الحكم المميز ورد الطعون، واكتسب القرار الدرجة القطعية.',
                isNew: true
            }, ...currentStage.timeline];

            SmartToast.success('تم تصديق الحكم واكتسب الدرجة القطعية');
        } else {
            // Quashed: Mark current as completed (Quashed) AND Revert to Appeal
            updatedStages[activeStageIndex] = {
                ...currentStage,
                status: 'completed',
                finalDecision: 'منقوض (إعادة للمحاكمة)',
                decisionDate: now
            };

            updatedStages[activeStageIndex].timeline = [{
                id: `cass_quashed_${Date.now()}`,
                type: 'decision',
                date: now,
                title: '❌ قرار بنقض الحكم (منقوض)',
                details: 'قررت محكمة التمييز نقض الحكم المميز وإعادة الإضبارة إلى محكمتها للسير فيها مجدداً.',
                isNew: true
            }, ...currentStage.timeline];

            // Create NEW stage 'الاستئناف' (Appeal) with preserved parties
            // Note: We carry over parties because it's the SAME case going back
            const newStageObject = {
                id: `stage_${Date.now()}`,
                stageName: 'الاستئناف', // Revert to Appeal
                type: currentStage.type,
                caseNo: currentStage.caseNo, // Keep case number
                court: currentStage.court,   // Keep court name (it goes back to same court usually)
                judge: '',
                parties: currentStage.parties, // Keep parties
                timeline: [], 
                tasks: [],
                incidentalCases: [],
                createdDate: now,
                finalDecision: null,
                decisionDate: null,
                status: 'active',
                // Keep historical data
                firstInstanceCaseNumber: currentStage.firstInstanceCaseNumber,
                firstInstanceCourt: currentStage.firstInstanceCourt
            };

            updatedStages.push(newStageObject);
            setActiveStageIndex(updatedStages.length - 1);
            
            SmartToast.error('تم نقض الحكم وإعادة الإضبارة لمرحلة الاستئناف');
        }

        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
    };

    // ========================================
    // CRITICAL: PLEADINGS LOCK HANDLERS (حجز الدعوى للقرار)
    // ========================================
    const handleClosePleadings = () => {
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...currentStage,
            isPleadingsClosed: true
        };
        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        SmartToast.success("تم حجز الدعوى للقرار - الإضبارة قيد التدقيق 🔒");
    };

    const handleReopenPleadings = () => {
        const updatedStages = [...stages];
        const now = getLocalTodayYmd();

        // 1. Unfreeze & Flag as Reopened
        updatedStages[activeStageIndex] = {
            ...currentStage,
            isPleadingsClosed: false,
            wasReopened: true
        };

        // 2. Add System Log
        updatedStages[activeStageIndex].timeline = [{
            id: `reopen_${Date.now()}`,
            type: 'decision', // Using decision for court orders
            date: now,
            title: 'قرار محكمة',
            details: 'تم فتح باب المرافعة مجدداً لاستكمال الإجراءات القانونية.',
            isSystemLog: true,
            isNew: true
        }, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        SmartToast.info("تم فتح باب المرافعة مجدداً 🔓");
    };

    // ========================================
    // CRITICAL: APPEAL REGISTRATION HANDLER (Opponent Appeal)
    // ========================================
    const handleAppealRegistration = (appealData: { appealMethod: string; appealCaseNo: string; appealCourt: string; [key: string]: unknown }) => {
        const { appealMethod, appealCaseNo, appealCourt } = appealData;
        const now = getLocalTodayYmd();
        
        const updatedStages = [...stages];
        
        // 1. UPDATE STAGE & METADATA
        // If appeal method suggests a new stage (e.g. Istinaf/Tamyeez), update stage name.
        // Otherwise, set it as extraordinary type.
        let newStageName = currentStage.stageName;
        if (appealMethod === 'استئناف') newStageName = 'الاستئناف';
        if (appealMethod === 'تمييز') newStageName = 'التمييز';
        
        updatedStages[activeStageIndex] = {
            ...currentStage,
            // Mutate Stage Identity
            stageName: newStageName, 
            extraordinaryType: appealMethod !== 'استئناف' && appealMethod !== 'تمييز' ? appealMethod : '',
            
            // Set Appeal Details
            appealCaseNumber: appealCaseNo,
            appealCourtName: appealCourt,
            
            //  UNLOCK CASE
            isPleadingsClosed: false,
            status: 'active'
        };

        // 2. TIMELINE AUDIT
        updatedStages[activeStageIndex].timeline = [{
            id: `appeal_opp_${Date.now()}`,
            type: 'decision', // Using decision type for legal significance
            title: '⚖️ تسجيل طعن من الخصم',
            details: `قام الخصم بالطعن في القرار بطريق (${appealMethod}).\n\nرقم الدعوى الجديد: ${appealCaseNo || 'غير محدد'}\nالمحكمة المختصة: ${appealCourt || 'غير محدد'}\n\n🔓 تم فتح القفل لإضافة مواعيد المرافعة الجديدة.`,
            date: now,
            isSystemLog: true,
            isNew: true
        }, ...(currentStage.timeline || [])];

        setStages(updatedStages);
        saveToCloud(updatedStages, parentData);
        SmartToast.warning(`تم تسجيل طعن الخصم (${appealMethod}) ونقل الدعوى للمرحلة التالية`);
    };

    // ========================================
    // STAGE NAME EDITOR LOGIC
    // ========================================
    const handleSaveStageName = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!tempStageName.trim()) return;

        const updatedStages = [...stages];
        // We update the active stage, as requested
        if (activeStageIndex >= 0 && activeStageIndex < updatedStages.length) {
            updatedStages[activeStageIndex] = {
                ...updatedStages[activeStageIndex],
                stageName: tempStageName
            };
            setStages(updatedStages);
            saveToCloud(updatedStages, parentData);
        }
        setIsEditingStageName(false);
    };

    // ========================================
    // CRITICAL: TRANSITION HANDLER (Parent-Child Architecture)
    // ========================================
    const handleTransitionConfirm = (transitionData: { newStage: string; newCourt: string; newCaseNo: string; appellant: string; result: string; date: string; [key: string]: unknown }) => {
        const { newStage, newCourt, newCaseNo, appellant, result, date } = transitionData;

        debug.log('🔄 بدء عملية الانتقال للمرحلة الجديدة...');

        // ========================================
        // STEP 1: Mark current stage as COMPLETED (لا نمسح شيء!)
        // ========================================
        const updatedStages = [...stages];
        updatedStages[activeStageIndex] = {
            ...currentStage,
            status: 'completed',
            finalDecision: result,
            decisionDate: date
        };

        debug.log(`✅ تم ختم المرحلة "${currentStage.stageName}" بمنطوق: ${result}`);

        // ========================================
        // STEP 2: CREATE NEW CHILD STAGE (إضبارة فرعية جديدة - فارغة تماماً)
        // ========================================
        
        // CRITICAL: WIPE EVERYTHING!
        // The user explicitly requested a blank slate for the new stage.
        // No carrying over names, roles, or case details.
        
        const newParties = [
            { role: 'صفة الطرف الأول', name: '', type: 'individual' },
            { role: 'صفة الطرف الثاني', name: '', type: 'individual', notificationStatus: 'waiting' }
        ];

        // Create NEW stage object
        const newStageObject = {
            id: `stage_${Date.now()}`,
            stageName: newStage,
            type: currentStage.type || 'lawsuit', // Keep case type
            caseNo: '', // Reset to empty
            court: '',  // Reset to empty
            judge: '',
            parties: newParties,
            timeline: [], // ✅ EMPTY timeline for new stage
            tasks: [], // ✅ EMPTY tasks for new stage
            incidentalCases: [],
            createdDate: getLocalTodayYmd(),
            finalDecision: null,
            decisionDate: null,
            status: 'active'
        };

        // ========================================
        // STEP 3: ADD to stages array (لا نمسح!)
        // ========================================
        updatedStages.push(newStageObject);
        setStages(updatedStages);

        // ========================================
        // STEP 4: UPDATE active index to new stage
        // ========================================
        setActiveStageIndex(updatedStages.length - 1);

        debug.log(`✅ تم إنشاء إضبارة فرعية جديدة "${newStage}" برقم: ${newCaseNo}`);
        debug.log(`📦 إجمالي المراحل: ${updatedStages.length}`);

        // ========================================
        // STEP 5: SAVE TO CLOUD (حفظ الأموال في Parent!)
        // ========================================
        saveToCloud(updatedStages, parentData);

        setShowTransitionModal(false);
    };
    
    // Helper: Save to cloud with error handling
    const saveToCloud = (updatedStages: CaseStage[], updatedParent: Record<string, unknown> = parentData) => {
        try {
            const dataToSave = {
                ...updatedParent,
                stages: updatedStages,
                activeStageIndex: activeStageIndex,
                status: status,
                // For backward compatibility
                caseNo: updatedStages[activeStageIndex]?.caseNo,
                court: updatedStages[activeStageIndex]?.court,
                currentStage: updatedStages[activeStageIndex]?.stageName,
                parties: updatedStages[activeStageIndex]?.parties,
                history: updatedStages[activeStageIndex]?.timeline,
                tasks: updatedStages[activeStageIndex]?.tasks
            };

            onUpdate(dataToSave);

            // ✅ Backup to localStorage (safe wrapper)
            const success = safeSetItem(`case_backup_${updatedParent.id}`, dataToSave);
            if (!success) {
                debug.warn('⚠️ فشل النسخ الاحتياطي للـ localStorage');
            }
        } catch (error) {
            logError('saveToCloud', error);
            SmartToast.error('حدث خطأ أثناء الحفظ');
        }
    };

    // ADAPTER FOR USER PROVIDED CODE
    const isPleadingsClosed = displayStage?.isPleadingsClosed;
    const lastJudgmentType = displayStage?.lastJudgmentType || displayStage?.judgmentForm;

    const setCaseData = (updater: ((data: CaseStage) => CaseStage) | Partial<CaseStage>) => {
        // Handle functional updates
        const newData = typeof updater === 'function' ? updater(displayStage) : updater;
        
        // Auto-map 'stage' property to 'stageName' if present (for backward compatibility)
        if (newData.stage && !newData.stageName) {
            newData.stageName = newData.stage;
        }

        const updatedStages = [...stages];
        // We always update the active stage when applying changes via setCaseData
        updatedStages[activeStageIndex] = { ...updatedStages[activeStageIndex], ...newData };
        
        setStages(updatedStages);
        saveToCloud(updatedStages);
    };

    if (!file || !currentStage) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible">
                
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
                        
                        {/* PREMIUM APPLE-STYLE GLASSMORPHISM TOP APP BAR */}
                        <div className="sticky top-0 z-50 w-full bg-slate-950/90 border-b border-white/10 print:hidden overflow-visible">
                            <div className="flex items-center justify-between px-3 py-3.5 overflow-visible">
                                
                                {/* LEFT: Close Button Only */}
                                <div className="flex items-center gap-3">
                                    <button type="button" 
                                        onClick={onClose} 
                                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                        aria-label="إغلاق"
                                    >
                                        <X size={18} />
                                        <span className="text-sm font-semibold">رجوع</span>
                                    </button>
                                </div>

                                {/* CENTER: Case Identity (The Single Source of Truth) */}
                                <div className="flex items-center justify-center flex-1">
                                    <h2 className="font-bold text-lg text-white/90 tracking-wide whitespace-nowrap ml-2">
                                        اضبارة الدعوى
                                    </h2>
                                </div>

                                {/* RIGHT: Actions + Unified Edit Button */}
                                <div className="flex items-center gap-2">
                                    {/* Smart Assistant Dynamic Pill Toggle */}
                                    <button type="button"
                                        onClick={() => setIsExpertMode(!isExpertMode)}
                                        className={`flex items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-all duration-300 w-[85px] h-[28px] shrink-0 border mx-2 ${
                                            isExpertMode
                                            ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-[0_0_8px_rgba(79,70,229,0.5)]'
                                            : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {isExpertMode ? (
                                            <>
                                            <Sparkles size={12} className="animate-pulse" />
                                            <span>الخبير</span>
                                            </>
                                        ) : (
                                            <>
                                            <Eye size={12} className="opacity-70" />
                                            <span>المراقب</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Unified Edit Button - ALWAYS VISIBLE */}
                                    <button type="button"
                                        onClick={() => setShowEditInfoModal(true)}
                                        className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:text-[#E6C673] hover:bg-[#E6C673]/10"
                                        title="تعديل بيانات الدعوى"
                                    >
                                        <Edit2 size={20} />
                                    </button>

                                    {/* 🔥 NUCLEAR FIX: Export Menu Dropdown - COMPLETELY REBUILT */}
                                    <div className="relative" style={{ overflow: 'visible' }}>
                                        <button type="button"
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:bg-indigo-500/20 hover:text-indigo-400"
                                            title="تصدير ومشاركة"
                                        >
                                            <Share2 size={20} />
                                        </button>

                                        {showExportMenu && (
                                            <>
                                                {/* Backdrop */}
                                                <div 
                                                    className="fixed inset-0 z-[60]" 
                                                    onClick={() => setShowExportMenu(false)}
                                                />
                                                
                                                {/* 🔥 REBUILT DROPDOWN - NO ORANGE, NO CLIPPING */}
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] overflow-visible animate-in fade-in zoom-in-95 duration-200">
                                                    <button type="button"
                                                        onClick={() => {
                                                            window.print();
                                                            setShowExportMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors rounded-t-lg"
                                                    >
                                                        <Printer size={16} className="text-indigo-400" />
                                                        <span>طباعة / PDF</span>
                                                    </button>
                                                    <div className="h-px bg-slate-700/50" />
                                                    <button type="button"
                                                        onClick={() => {
                                                            handleShare();
                                                            setShowExportMenu(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors rounded-b-lg"
                                                    >
                                                        <Share2 size={16} className="text-blue-400" />
                                                        <span>مشاركة عبر...</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <button type="button"
                                        onClick={() => setIsTrashOpen(!isTrashOpen)}
                                        className={`p-2 rounded-full transition-all ${
                                            isTrashOpen 
                                                ? 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/20' 
                                                : 'text-slate-400/70 hover:text-rose-400 hover:bg-rose-500/10'
                                        }`}
                                        title="سلة المهملات"
                                        aria-label="سلة المهملات"
                                    >
                                        <Trash2 size={20} strokeWidth={1.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* STAGE NAVIGATION BAR - Sticky Below Header */}
                        <div className="sticky top-[72px] z-40 w-full bg-[#0F121E] border-b border-white/5 print:hidden">
                            <div className="px-3 py-2.5">
                                {/* STAGE HISTORY STEPPER - Horizontal Scrollable */}
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                    {isEditingStageName && !isViewingArchived ? (
                                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                            <input 
                                                type="text" 
                                                value={tempStageName} 
                                                onChange={(e) => setTempStageName(e.target.value)} 
                                                className="bg-indigo-950 text-indigo-200 border border-indigo-500 rounded px-2 py-0.5 text-sm outline-none w-32 focus:ring-1 focus:ring-indigo-400" 
                                                autoFocus 
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveStageName(e as React.KeyboardEvent<HTMLInputElement>);
                                                    if (e.key === 'Escape') setIsEditingStageName(false);
                                                }}
                                            />
                                            <button type="button" 
                                                onClick={handleSaveStageName} 
                                                className="p-1 hover:bg-green-500/20 rounded-full transition-all group"
                                                title="حفظ"
                                            >
                                                <Check className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button type="button" 
                                                onClick={() => setIsEditingStageName(false)} 
                                                className="p-1 hover:bg-rose-500/20 rounded-full transition-all group"
                                                title="إلغاء"
                                            >
                                                <X className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {/* Map through all stages */}
                                            {stages.map((stage, idx) => {
                                                const isCurrentlyViewing = idx === viewingStageIndex;
                                                const isActive = idx === activeStageIndex;
                                                const isPast = stage.status === 'completed' || stage.status === 'locked';
                                                const stageId = `stg_${idx + 1}`;
                                                
                                                return (
                                                    <div key={`${String(stage.id ?? 'stage')}-${idx}`} className="flex items-center gap-2 shrink-0">
                                                        {/* Stage Badge */}
                                                        <button type="button"
                                                            onClick={() => handleStageSelect(stageId)}
                                                            className={`group/stageBtn px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
                                                                isCurrentlyViewing
                                                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                                                    : isPast
                                                                        ? 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800/50 hover:border-slate-600'
                                                                        : isActive
                                                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                                                                            : 'bg-transparent text-slate-500 border-slate-800 opacity-50'
                                                            }`}
                                                            title={`عرض ${stage.stageName}`}
                                                        >
                                                            {isPast && <Lock size={12} />}
                                                            <span className="text-sm font-bold whitespace-nowrap">{stage.stageName}</span>
                                                            
                                                            {/* Edit Icon for Currently Viewing Active Stage */}
                                                            {isCurrentlyViewing && isActive && !isViewingArchived && (
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTempStageName(stage.stageName);
                                                                        setIsEditingStageName(true);
                                                                    }}
                                                                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover/stageBtn:opacity-100"
                                                                    title="تعديل اسم المرحلة"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </div>
                                                            )}
                                                        </button>
                                                        
                                                        {/* Separator Chevron (except after last stage) */}
                                                        {idx < stages.length - 1 && (
                                                            <ChevronLeft size={16} className="text-slate-600 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content - SWIPEABLE */}
                        <div 
                            className="flex-1 overflow-y-auto scrollbar-hide p-3 pb-2 sm:p-6 print:overflow-visible print:max-h-max"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >

                            {/* PRINT HEADER */}
                            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                                <h1 className="text-2xl font-bold">تقرير حالة دعوى قضائية</h1>
                                <p className="text-sm mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ')}</p>
                            </div>
                            
                            {/* --- WARNING RADAR: ABANDONMENT & INTERRUPTION --- */}
                            
                            {/* 1. VOIDED STATE (إبطال العريضة) - HIGHEST PRIORITY */}
                            {displayStage?.isVoided && (
                                <div className="w-full bg-slate-900 border-2 border-slate-600 text-slate-400 p-6 rounded-lg text-center font-bold text-lg mb-4" dir="rtl">
                                    ❌ تم إبطال عريضة الدعوى قانوناً 
                                    <div className="text-xs font-normal mt-2 text-slate-500">(بسبب تركها للمراجعة للمرة الثانية أو لمرور المدة القانونية)</div>
                                </div>
                            )}

                            {/* 2. ABANDONMENT WARNING (First Time) */}
                            {displayStage?.abandonmentDate && !displayStage?.isVoided && (
                                <div className="w-full bg-amber-900/20 border border-amber-500/50 text-amber-300 p-3 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-amber-300" />
                                        ⚠️ تنبيه إجرائي: الدعوى متروكة للمراجعة. تبطل عريضتها بعد 10 أيام.
                                    </span>
                                    <button type="button" 
                                        onClick={handleResumeAbandonment}
                                        className="bg-amber-600/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded font-extrabold text-xs hover:bg-amber-600/40 transition-colors"
                                    >
                                        🔄 تجديد الدعوى
                                    </button>
                                </div>
                            )}

                            {displayStage?.interruptionDate && !displayStage?.abandonmentDate && (
                                <div className="w-full bg-rose-900 text-rose-100 p-3 rounded-lg flex justify-between items-center mb-4 border border-rose-500" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <PauseCircle size={18} />
                                        🛑 انقطاع السير في الدعوى. تبطل عريضتها بعد 6 أشهر!
                                    </span>
                                    <button type="button" 
                                        onClick={() => setShowResumeInterruptionModal(true)}
                                        className="bg-rose-100 text-rose-900 px-3 py-1 rounded font-extrabold text-xs hover:bg-white transition-colors shadow-sm"
                                    >
                                        ▶️ استئناف السير
                                    </button>
                                </div>
                            )}

                            {/* 🔥 NEW: 3. LITIGATION INCIDENTS WARNINGS */}
                            {status === 'متروكة للمراجعة' && (
                                <div className="w-full bg-rose-900/20 border-2 border-rose-500/50 text-rose-300 p-4 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <AlertTriangle size={20} className="text-rose-400" />
                                        🚨 تحذير: الدعوى متروكة للمراجعة! يجب تجديدها خلال 10 أيام لمنع إبطالها.
                                    </span>
                                </div>
                            )}

                            {status === 'موقوفة اتفاقياً' && (
                                <div className="w-full bg-amber-900/20 border-2 border-amber-500/50 text-amber-300 p-4 rounded-lg flex justify-between items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <PauseCircle size={20} className="text-amber-400" />
                                        ⏸️ الدعوى موقوفة اتفاقياً. يجب استئناف السير قبل مرور 15 يوماً من تاريخ انتهاء الوقف.
                                    </span>
                                    {!isViewingArchived && (
                                        <button type="button" 
                                            onClick={handleResume}
                                            className="bg-amber-600/20 border border-amber-500/50 text-amber-400 px-3 py-1 rounded font-extrabold text-xs hover:bg-amber-600/40 transition-colors"
                                        >
                                            ▶️ استئناف السير
                                        </button>
                                    )}
                                </div>
                            )}

                            {status === 'قيد نظر طلب رد القاضي' && (
                                <div className="w-full bg-purple-900/20 border-2 border-purple-500/50 text-purple-300 p-4 rounded-lg flex justify-center items-center mb-4" dir="rtl">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        <Scale size={20} className="text-purple-400" />
                                        ⏸️ الدعوى مجمدة: قيد نظر طلب رد القاضي أو نقل الدعوى.
                                    </span>
                                </div>
                            )}

                            <Suspense fallback={null}>
                            <LazySmartHeader 
                                formData={displayStage} 
                                caseType={file?.type || displayStage?.type || 'غير محدد'}
                                representedParty={parentData.representedParty}
                                onToggleClient={!isViewingArchived ? handleToggleClient : undefined}
                                incidentalCases={displayStage?.incidentalCases || []}
                                stages={stepperStages}
                                currentStageId={currentStageId}
                                onStageClick={handleStageSelect}
                                stageHistory={stages.filter(s => s.status === 'completed' || s.status === 'locked')}
                                isPaused={isPaused}
                                pauseReason={pauseReason}
                                onResume={!isViewingArchived ? handleResume : undefined}
                                onPause={!isViewingArchived ? () => setShowPauseModal(true) : undefined}
                                status={status}
                                isInterrupted={isInterrupted}
                                interruptionData={interruptionData}
                                linkedCaseNo={displayStage?.consolidatedWith || linkedCaseNo}
                                onInterrupt={!isViewingArchived ? handleInterruptionToggle : undefined}
                                onAbandon={!isViewingArchived ? handleAbandonment : undefined}
                                onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                                isReadOnly={isViewingArchived}
                                hasCrossAppeal={displayStage?.hasCrossAppeal}
                                onCancelCrossAppeal={!isViewingArchived ? handleCancelCrossAppeal : undefined}
                                onAddCrossAppeal={!isViewingArchived ? handleAddCrossAppeal : undefined}
                                notificationStatus={displayStage?.parties?.[1]?.notificationStatus || displayStage?.defendantNotificationStatus}
                                onToggleNotification={!isViewingArchived ? handleToggleNotification : undefined}
                                // Expert Mode Props
                                isExpertMode={isExpertMode}
                                onToggleExpertMode={() => setIsExpertMode(!isExpertMode)}
                                // Cassation Props
                                onCassationDecision={!isViewingArchived ? handleCassationDecision : undefined}
                                // Pleadings Lock Props
                                isPleadingsClosed={displayStage?.isPleadingsClosed}
                                wasReopened={displayStage?.wasReopened}
                                onClosePleadings={!isViewingArchived ? handleClosePleadings : undefined}
                                onReopenPleadings={!isViewingArchived ? handleReopenPleadings : undefined}
                                onRegisterOpponentAppeal={!isViewingArchived ? () => setShowAppealModal(true) : undefined}
                                hasJudgment={displayStage?.finalDecision || displayStage?.isPleadingsClosed}
                                // Default Judgment Props
                                onDefaultObjection={!isViewingArchived ? handleDefaultObjection : undefined}
                                onWaiveObjection={!isViewingArchived ? handleWaiveObjection : undefined}
                                isUnderObjection={displayStage?.isUnderObjection}
                                onObjectionJudgment={!isViewingArchived ? () => setShowObjectionJudgmentModal(true) : undefined}
                                onOtherAppeals={!isViewingArchived ? handleOtherAppeals : undefined}
                                provisionalOrders={displayStage?.provisionalOrders || []}
                                onAddProvisionalOrder={!isViewingArchived ? () => setShowProvisionalOrderModal(true) : undefined}
                                thirdParties={displayStage?.thirdParties || []}
                                onExtraordinaryAppeal={!isViewingArchived ? (type: string) => setShowExtraordinaryAppealModal(type) : undefined}
                                // 🔥 NEW: Command Center Props
                                onJudgeRecusal={!isViewingArchived ? () => setShowJudgeRecusalModal(true) : undefined}
                                onTransferJurisdiction={!isViewingArchived ? () => setShowTransferJurisdictionModal(true) : undefined}
                                onCaseConsolidation={!isViewingArchived ? () => setShowCaseConsolidationModal(true) : undefined}
                                onAttorneyResignation={!isViewingArchived ? () => setShowAttorneyResignationModal(true) : undefined}
                                onExecutionTransfer={!isViewingArchived ? () => setShowExecutionTransferModal(true) : undefined}
                                onExportPDF={handleExportPDF}
                                onMaterialErrorCorrection={!isViewingArchived ? (type: string) => setShowMaterialErrorModal(type) : undefined}
                                caseData={parentData}
                                currentStage={displayStage}
                            />
                            </Suspense>
                            
                            {/* --- CRITICAL: DEADLINE TRACKER UI (Smart Deadlines) --- */}
                            {displayStage?.isPleadingsClosed && displayStage?.appealDeadline && (
                                (() => {
                                    const today = new Date();
                                    const deadlineDate = new Date(displayStage.appealDeadline);
                                    const diffTime = deadlineDate.getTime() - today.getTime();
                                    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    let cardStyles = "";
                                    let statusText = "";
                                    
                                    if (daysRemaining > 5) {
                                        cardStyles = "bg-emerald-900/20 border-emerald-500 text-emerald-400";
                                        statusText = `متبقي ${daysRemaining} يوم`;
                                    } else if (daysRemaining >= 0) {
                                        cardStyles = "bg-amber-900/20 border-amber-500 text-amber-400 animate-pulse";
                                        statusText = `⚠️ تحذير: متبقي ${daysRemaining} يوم فقط!`;
                                    } else {
                                        cardStyles = "bg-rose-900/20 border-rose-500 text-rose-500";
                                        statusText = "انتهت المدة القانونية ❌";
                                    }

                                    return (
                                        <div className={`w-full p-4 rounded-xl border mb-4 flex justify-between items-center transition-all shadow-lg ${cardStyles}`} dir="rtl">
                                            <div className="flex flex-col">
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    <Clock size={20} />
                                                    ⏳ المدة القانونية للطعن
                                                </h3>
                                                <p className="text-sm opacity-80 mt-1 font-mono">
                                                    ينتهي في: {displayStage.appealDeadline}
                                                </p>
                                            </div>
                                            <div className="text-left bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                                <span className="font-bold text-lg block">{statusText}</span>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}

                            {/* POST-JUDGMENT ACTION CONTROLS - ALWAYS RENDERED WHEN LOCKED */}
                            {displayStage?.isPleadingsClosed && (
                              <div className="w-full mt-4 mb-4">
                                {displayStage?.lastJudgmentType === 'غيابي' ? (
                                  /* THE DEFAULT JUDGMENT (غيابي) BOX - STRICT ASYMMETRIC LOGIC */
                                  <div className="bg-orange-900/20 border border-orange-500 p-4 rounded-lg shadow-lg">
                                    <h3 className="text-orange-400 font-bold mb-3 text-sm flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        إجراءات الحكم الغيابي (وفقاً للصفة):
                                    </h3>
                                    
                                    {/* LOGIC BRANCHING BASED ON REPRESENTATION */}
                                    {parentData.representedParty === 'المدعى عليه' ? (
                                        // DEFENDANT VIEW: Can Object OR Waive
                                        <div className="flex flex-col gap-3">
                                          <div className="text-xs text-orange-200/80 leading-relaxed mb-1 font-medium bg-black/20 p-2 rounded">
                                              بصفتك وكيلاً عن <span className="text-white font-bold underline decoration-emerald-500 decoration-2">المدعى عليه</span>، يحق لك تقديم اعتراض غيابي لإعادة المحاكمة، أو ترك هذا الحق واللجوء للطعن المباشر.
                                          </div>
                                          
                                          <button type="button" 
                                            onClick={handleDefaultObjection} 
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] border border-emerald-400/30">
                                            <ShieldCheck size={18} />
                                            تسجيل اعتراض غيابي (إعادة المحاكمة)
                                          </button>
                                          
                                          <div className="relative flex py-1 items-center justify-center">
                                              <div className="flex-grow border-t border-orange-500/20"></div>
                                              <span className="flex-shrink-0 mx-3 text-orange-500/40 text-[10px] font-bold">خيار استراتيجي</span>
                                              <div className="flex-grow border-t border-orange-500/20"></div>
                                          </div>

                                          <button type="button" 
                                            onClick={handleWaiveObjection} 
                                            className="w-full bg-[#1A1E2E] border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all group">
                                            <ArrowRightLeft size={18} className="group-hover:translate-x-1 transition-transform" />
                                            ترك الحكم غيابياً (تجاوز الاعتراض) ⏭️
                                          </button>
                                        </div>
                                    ) : parentData.representedParty === 'المدعي' ? (
                                        // PLAINTIFF VIEW: Can ONLY Appeal (Object is Illegal)
                                        <div className="flex flex-col gap-3">
                                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-300 flex items-start gap-2 leading-relaxed">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                                <span>
                                                    <span className="font-bold block mb-1 text-red-400">تنبيه قانوني هام:</span>
                                                    بصفتك وكيلاً عن <span className="text-white font-bold underline decoration-rose-500 decoration-2">المدعي</span>، لا يجوز لك الطعن بطريق "الاعتراض الغيابي" حيث أنه حق حصري للمحكوم عليه غيابياً (المدعى عليه). يمكنك فقط الطعن بالاستئناف/التمييز إذا كان الحكم مجحفاً بحقك.
                                                </span>
                                            </div>
                                            
                                            <button type="button" 
                                              onClick={handleOtherAppeals} 
                                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                                              <Scale size={18} />
                                              الانتقال لمرحلة الطعن (استئناف/تمييز) 🔓
                                            </button>
                                        </div>
                                    ) : (
                                        // FALLBACK / OBSERVER VIEW (Monitor Mode)
                                        <div className="flex flex-col gap-3">
                                          <div className="bg-slate-800/50 border border-slate-700 p-2 rounded text-xs text-slate-400 text-center mb-1 flex flex-col gap-1">
                                              <span className="font-bold text-slate-300">⚠️ لم يتم تحديد صفة الموكل</span>
                                              <span>(وضع المراقبة التجريبي)</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                              <button type="button" 
                                                onClick={handleDefaultObjection} 
                                                className="bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 p-2 rounded-lg text-xs font-bold transition-all h-full flex flex-col items-center justify-center gap-1">
                                                <ShieldCheck size={16} />
                                                اعتراض (تجريبي)
                                              </button>
                                              <button type="button" 
                                                onClick={handleOtherAppeals} 
                                                className="bg-indigo-900/30 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 p-2 rounded-lg text-xs font-bold transition-all h-full flex flex-col items-center justify-center gap-1">
                                                <Scale size={16} />
                                                طعن (تجريبي)
                                              </button>
                                          </div>
                                        </div>
                                    )}
                                  </div>
                                ) : (
                                  /* THE PRESENT JUDGMENT (حضوري) UNLOCK BUTTON */
                                  <button type="button" 
                                    onClick={handleReopenPleadings} 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg text-sm font-bold shadow-lg flex justify-center items-center gap-2">
                                    🔓 فك القفل (لتسجيل طعن الخصم أو استئناف السير)
                                  </button>
                                )}
                              </div>
                            )}

                            {/* 2. Incidental Cases - CRITICAL: Display viewedStage data */}
                            {displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <div className="mt-2">
                                    <Suspense fallback={null}>
                                    <LazyIncidentalCasesManager 
                                        cases={displayStage?.incidentalCases || []} 
                                        onResolve={!isViewingArchived ? handleResolveIncidentalCase : undefined} 
                                    />
                                    </Suspense>
                                </div>
                            )}

                            {/* 3. Financial Card - ALWAYS SHOW PARENT DATA */}
                            <Suspense fallback={null}>
                            <LazyFinancialCard 
                                total={parentData.feesTotal} 
                                paid={parentData.feesPaid} 
                                onAddPayment={!isViewingArchived ? () => setShowPaymentModal(true) : undefined}
                                isEditing={false}
                                onUpdateTotal={(val: number) => setParentData({...parentData, feesTotal: val})}
                            />
                            </Suspense>

                            {/* 3.5. GHOST AI INSIGHT DECK - High Intelligence Component */}
                            {!isViewingArchived && displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <Suspense fallback={null}>
                                <LazyGhostAIInsightDeck 
                                    onAction={(actionType: string) => {
                                        if (actionType === 'document') {
                                            setShowDocModal(true);
                                        } else if (actionType === 'appointment') {
                                            setShowApptModal(true);
                                        } else if (actionType === 'notify_client') {
                                            SmartToast.success('تم إرسال إشعار للموكل بالنقص');
                                        }
                                    }} 
                                    timeline={displayTimeline || []}
                                />
                                </Suspense>
                            )}

                            {/* 4. Quick Actions - HIDE when viewing archived OR Cassation OR Pleadings Closed */}
                            {!isViewingArchived && displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <div className="print:hidden">
                                    <Suspense fallback={null}>
                                    <LazyQuickActions 
                                        onAction={handleQuickAction} 
                                        onPause={() => setShowPauseModal(true)} 
                                        currentStageName={displayStage?.stageName}
                                        onOpenLegalActions={() => setIsActionsMenuOpen(true)}
                                    />
                                    </Suspense>
                                </div>
                            )}

                            {/* 5. To-Do List - CRITICAL: Display viewedStage tasks - Hide in Cassation OR Pleadings Closed */}
                            {!isViewingArchived && displayStage?.stageName !== 'التمييز' && !displayStage?.isPleadingsClosed && (
                                <Suspense fallback={null}>
                                <LazyToDoList 
                                    tasks={displayStage?.tasks || []} 
                                    onAddTask={() => setShowTaskModal(true)}
                                    onToggleTask={handleToggleTask}
                                    onEditTask={(task) => setEditingTask(task)}
                                />
                                </Suspense>
                            )}

                            {/* 5.5. Fast-Track Petitions List - NEW: Display Fast-Track Petitions */}
                            {!isViewingArchived && displayStage?.fastTrackPetitions && displayStage.fastTrackPetitions.length > 0 && (
                                <Suspense fallback={null}>
                                <LazyFastTrackPetitionsList 
                                    petitions={displayStage.fastTrackPetitions} 
                                    onEdit={(petition) => {
                                        setEditingFastTrack(petition);
                                        setShowFastTrackModal(true);
                                    }}
                                />
                                </Suspense>
                            )}

                            {/* 5.6. Attachment Shield Card - NEW: Display Attachments */}
                            {!isViewingArchived && displayStage?.attachments && displayStage.attachments.length > 0 && (
                                <Suspense fallback={null}>
                                <LazyAttachmentShieldCard 
                                    attachments={displayStage.attachments} 
                                    onEdit={(attachment) => {
                                        setEditingAttachment(attachment);
                                        setShowAttachmentModal(true);
                                    }}
                                />
                                </Suspense>
                            )}

                            {/* 6. Timeline - CRITICAL: Display viewedStage timeline */}
                            <div className="mb-6">
                                <h3 className="text-gray-300 text-lg font-bold flex items-center gap-2 pb-2 border-b border-white/5">
                                    <Clock size={18} className="text-[#E6C673]" />
                                    السجل الزمني
                                </h3>
                            </div>

                            <Suspense fallback={null}>
                            <LazyTimelineFeed 
                                events={displayTimeline} 
                                onDelete={!isViewingArchived ? handleDeleteEvent : undefined} 
                                onEdit={!isViewingArchived ? handleEditEvent : undefined} 
                            />
                            </Suspense>

                            {/* 7. Seal Stage Button (Sole Primary Action) - HIDE when viewing archived */}
                            {!isViewingArchived && (
                                <div className="mt-6 px-3 pb-6 print:hidden w-full space-y-2 relative z-20 sm:rounded-b-3xl">
                                    {/* 🔥 NEW: Cross-Appeal Button (Show ONLY in Appeal stage for Appellee) */}
                                    {currentStage?.stageName === 'الاستئناف' && 
                                     currentStage?.appealMetadata && 
                                     !currentStage.appealMetadata.hasCrossAppeal && (
                                        (() => {
                                            // Determine if current lawyer represents the appellee (المستأنف عليه)
                                            // Check if any party with المستأنف عليه role matches the represented party
                                            const isAppelleeLawyer = currentStage.parties.some((p: { role: string; originalRole?: string }) => {
                                                const isAppellee = p.role.includes('المستأنف عليه');
                                                // Check if this party's original role matches our represented party
                                                const originalRole = p.role.includes('المدعي') ? 'المدعي' : 'المدعى عليه';
                                                const representsThisParty = parentData.representedParty === originalRole;
                                                return isAppellee && representsThisParty;
                                            });

                                            return isAppelleeLawyer ? (
                                                <button type="button" 
                                                    onClick={() => setShowCrossAppealModal(true)} 
                                                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-lg w-full shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ArrowRightLeft size={20} />
                                                    🔄 تقديم استئناف متقابل
                                                </button>
                                            ) : null;
                                        })()
                                    )}

                                    <button type="button"
                                        onClick={() => setShowJudgmentModal(true)}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-500 hover:to-amber-600 text-[#0B1021] font-bold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                    >
                                        <Scale size={20} className="text-[#0B1021]" strokeWidth={2.5} />
                                        ختام المرافعة
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* --- MODALS PORTAL --- */}
                <AnimatePresence>
                    <Suspense fallback={null} key="actions-menu-suspense">
                    <LazyLegalActionsMenu 
                        isOpen={isActionsMenuOpen} 
                        onClose={() => setIsActionsMenuOpen(false)} 
                        onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                        onAddProvisionalOrder={!isViewingArchived ? () => setShowProvisionalOrderModal(true) : undefined}
                        onAbandon={!isViewingArchived ? handleAbandonment : undefined}
                        onInterrupt={!isViewingArchived ? handleInterruptionToggle : undefined}
                        onPause={!isViewingArchived ? () => setShowPauseModal(true) : undefined}
                        onResume={!isViewingArchived ? handleResume : undefined}
                        isPaused={isPaused}
                        isInterrupted={isInterrupted}
                        onAction={handleQuickAction}
                        onAddSessionRecord={() => setShowActionModal(true)} // 🔥 Pass the handler
                        currentStageName={displayStage?.stageName}
                    />
                    </Suspense>
                    <Suspense fallback={SMART_FILE_MODAL_LAZY_FALLBACK} key="modals-suspense">
                    {showEditInfoModal && (
                        <LazyEditCaseInfoModal 
                            key="edit-info" 
                            isOpen={showEditInfoModal} 
                            onClose={() => setShowEditInfoModal(false)} 
                            formData={{
                                ...displayStage,
                                docType: parentData.docType || displayStage.type,
                                representedParty: parentData.representedParty
                            }}
                            onSave={handleUpdateCaseInfo} 
                        />
                    )}
                    {showTaskModal && <LazyAddTaskModal key="add-task" isOpen={showTaskModal} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} onAdd={handleAddTask} editMode={!!editingTask} editData={editingTask} />}
                    {showDocModal && <LazyAddDocumentModal key="add-doc" isOpen={showDocModal} onClose={() => { setShowDocModal(false); setEditingEvent(null); }} onAdd={handleAddDoc} editMode={!!editingEvent} editData={editingEvent} />}
                    {showNoteModal && <LazyAddNoteModal key="add-note" isOpen={showNoteModal} onClose={() => { setShowNoteModal(false); setEditingEvent(null); }} onAdd={handleAddNote} editMode={!!editingEvent} editData={editingEvent} />}
                    {showPaymentModal && <LazyAddPaymentModal key="add-payment" isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onAdd={handleAddPayment} />}
                    {showIncidentalModal && <LazyAddIncidentalCaseModal key="add-incidental" isOpen={showIncidentalModal} onClose={() => { setShowIncidentalModal(false); setEditingIncidental(null); }} onAdd={handleAddIncidentalCase} currentStage={currentStage.stageName} editMode={!!editingIncidental} editData={editingIncidental} />}
                    {showFastTrackModal && (
                        <LazyFastTrackModal 
                            key="fast-track" 
                            isOpen={showFastTrackModal} 
                            onClose={() => { setShowFastTrackModal(false); setEditingFastTrack(null); }} 
                            onSave={handleSaveFastTrack} 
                            editMode={!!editingFastTrack} 
                            editData={editingFastTrack} 
                        />
                    )}
                    {showAttachmentModal && (
                        <LazyAttachmentShieldModal 
                            key="attachment-shield" 
                            isOpen={showAttachmentModal} 
                            onClose={() => { setShowAttachmentModal(false); setEditingAttachment(null); }} 
                            onSave={handleSaveAttachment} 
                            editMode={!!editingAttachment} 
                            editData={editingAttachment} 
                        />
                    )}
                    {showActionModal && (
                        <LazyAddActionModal 
                            key="add-action" 
                            isOpen={showActionModal} 
                            onClose={() => { setShowActionModal(false); setEditingEvent(null); }} 
                            onAdd={handleAddAction} 
                            editMode={!!editingEvent} 
                            editData={editingEvent} 
                        />
                    )}
                    {showApptModal && <LazyAddAppointmentModal key="add-appt" isOpen={showApptModal} onClose={() => { setShowApptModal(false); setEditingEvent(null); }} onAdd={handleAddAppointment} editMode={!!editingEvent} editData={editingEvent} />}
                    
                    {showPauseModal && (
                        <LazyPauseCaseModal 
                            key="pause-case" 
                            isOpen={showPauseModal} 
                            onClose={() => { setShowPauseModal(false); setEditingEvent(null); }} 
                            onConfirm={handlePauseConfirm} 
                            editMode={!!editingEvent} 
                            editData={editingEvent ? {
                                id: editingEvent.id,
                                reason: editingEvent.details?.split('\n\n🔗')[0] || pauseReason, // Try to parse or use state
                                linkedCaseNo: editingEvent.details?.split('رقم: ')[1] || linkedCaseNo // Try to parse or use state
                            } : undefined}
                        />
                    )}
                    
                    {showInterruptionModal && (
                        <LazyInterruptionModal 
                            key="interruption" 
                            isOpen={showInterruptionModal} 
                            onClose={() => { setShowInterruptionModal(false); setEditingEvent(null); }} 
                            onConfirm={handleInterruptionConfirm} 
                            currentParties={currentStage.parties} 
                            editMode={!!editingEvent}
                            editData={editingEvent ? {
                                id: editingEvent.id,
                                reason: editingEvent.details?.match(/السبب القانوني: (.*)\n/)?.[1] || interruptionData?.reason,
                                affectedParty: editingEvent.details?.match(/الخصم المعني: (.*)\n/)?.[1] || interruptionData?.affectedParty,
                                date: editingEvent.date,
                                notes: editingEvent.details?.match(/ملاحظات: (.*)\n/)?.[1] || ''
                            } : undefined}
                        />
                    )}
                    
                    {showResumeInterruptionModal && <LazyResumeInterruptionModal key="resume-interruption" isOpen={showResumeInterruptionModal} onClose={() => setShowResumeInterruptionModal(false)} onConfirm={handleResumeInterruptionConfirm} />}
                    
                    {showInterlocutoryModal && (
                        <LazyInterlocutoryAppealModal 
                            key="interlocutory" 
                            isOpen={showInterlocutoryModal} 
                            onClose={() => { setShowInterlocutoryModal(false); setEditingEvent(null); }} 
                            onConfirm={handleInterlocutoryAppealConfirm} 
                            editMode={!!editingEvent}
                            editData={editingEvent ? {
                                id: editingEvent.id,
                                decisionType: editingEvent.details?.match(/نوع القرار: (.*)\n/)?.[1],
                                decisionDate: editingEvent.details?.match(/تاريخ صدور القرار: (.*)\n/)?.[1] || editingEvent.date
                            } : undefined}
                        />
                    )}
                    
                    {showObjectionRegistrationModal && (
                        <LazyObjectionRegistrationModal
                            key="obj-reg"
                            isOpen={showObjectionRegistrationModal}
                            onClose={() => setShowObjectionRegistrationModal(false)}
                            onConfirm={handleRegisterObjection}
                        />
                    )}
                    {showObjectionJudgmentModal && (
                        <LazyObjectionJudgmentModal
                            key="obj-judg"
                            isOpen={showObjectionJudgmentModal}
                            onClose={() => setShowObjectionJudgmentModal(false)}
                            onConfirm={handleObjectionJudgment}
                        />
                    )}
                    {isTrashOpen && <LazyTrashModal key="trash" isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} deletedItems={deletedEvents} onRestore={handleRestoreEvent} onPermanentDelete={handleHardDeleteEvent} onEmptyTrash={handleEmptyTrash} />}
                    {showJudgmentModal && <LazySmartJudgmentModal key="judgment" isOpen={showJudgmentModal} onClose={() => setShowJudgmentModal(false)} onConfirm={handleJudgmentConfirm} currentParties={currentStage.parties} currentStage={currentStage.stageName} representedParty={parentData.representedParty} />}
                    {showAppealModal && <LazyAppealRegistrationModal key="appeal-reg" isOpen={showAppealModal} onClose={() => setShowAppealModal(false)} onConfirm={handleAppealRegistration} />}
                    {/* 🔥 NEW: Appeal Transition & Cross-Appeal Modals */}
                    {showAppealTransitionModal && (
                        <LazyAppealTransitionModal
                            key="appeal-transition"
                            isOpen={showAppealTransitionModal}
                            onClose={() => {
                                setShowAppealTransitionModal(false);
                                setTempJudgmentData(null);
                            }}
                            onConfirm={handleAppealTransition}
                            currentParties={currentStage.parties}
                            representedParty={parentData.representedParty}
                        />
                    )}
                    {showCrossAppealModal && (
                        <LazyCrossAppealModal
                            key="cross-appeal"
                            isOpen={showCrossAppealModal}
                            onClose={() => setShowCrossAppealModal(false)}
                            onConfirm={handleCrossAppeal}
                        />
                    )}
                    {showProvisionalOrderModal && (
                        <LazyAddProvisionalOrderModal 
                            key="provisional-order" 
                            isOpen={showProvisionalOrderModal} 
                            onClose={() => setShowProvisionalOrderModal(false)} 
                            onConfirm={handleProvisionalOrderConfirm} 
                            currentParties={currentStage.parties} 
                        />
                    )}
                    {showNotificationModal && (
                        <LazyJudicialNotificationModal
                            key="notification"
                            isOpen={showNotificationModal}
                            onClose={() => setShowNotificationModal(false)}
                            onConfirm={handleSaveNotification}
                            currentParties={currentStage.parties}
                        />
                    )}
                    {showExtraordinaryAppealModal && (
                        <LazyExtraordinaryAppealModal
                            key="extra-appeal"
                            isOpen={showExtraordinaryAppealModal}
                            onClose={() => setShowExtraordinaryAppealModal(false)}
                            onConfirm={handleExtraordinaryAppeal}
                            type={showExtraordinaryAppealModal} // Pass the string type directly
                            currentCourt={currentStage.court}
                        />
                    )}

                    {/* 🔥 NEW: Command Center Modals - Procedural Maneuvers */}
                    {showMaterialErrorModal && (
                        <LazyMaterialErrorCorrectionModal
                            key="material-error"
                            isOpen={!!showMaterialErrorModal}
                            onClose={() => setShowMaterialErrorModal(null)}
                            onConfirm={handleMaterialErrorCorrection}
                            correctionType={showMaterialErrorModal}
                        />
                    )}

                    {showJudgeRecusalModal && (
                        <LazyJudgeRecusalModal
                            key="judge-recusal"
                            isOpen={showJudgeRecusalModal}
                            onClose={() => setShowJudgeRecusalModal(false)}
                            onConfirm={handleJudgeRecusal}
                        />
                    )}

                    {showTransferJurisdictionModal && (
                        <LazyTransferJurisdictionModal
                            key="transfer-jurisdiction"
                            isOpen={showTransferJurisdictionModal}
                            onClose={() => setShowTransferJurisdictionModal(false)}
                            onConfirm={handleTransferJurisdiction}
                        />
                    )}

                    {showCaseConsolidationModal && (
                        <LazyCaseConsolidationModal
                            key="case-consolidation"
                            isOpen={showCaseConsolidationModal}
                            onClose={() => setShowCaseConsolidationModal(false)}
                            onConfirm={handleCaseConsolidation}
                        />
                    )}

                    {showAttorneyResignationModal && (
                        <LazyAttorneyResignationModal
                            key="attorney-resignation"
                            isOpen={showAttorneyResignationModal}
                            onClose={() => setShowAttorneyResignationModal(false)}
                            onConfirm={handleAttorneyResignation}
                        />
                    )}

                    {showExecutionTransferModal && (
                        <LazyExecutionTransferModal
                            key="execution-transfer"
                            isOpen={showExecutionTransferModal}
                            onClose={() => setShowExecutionTransferModal(false)}
                            onConfirm={handleExecutionTransfer}
                        />
                    )}
                    </Suspense>
                </AnimatePresence>

                {/* PROACTIVE SMART ALERT SHELL */}
                <AnimatePresence>
                    {isExpertMode && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-[#0F172A] border border-[#E6C673]/50 p-4 rounded-xl shadow-2xl flex gap-3 max-w-md w-full will-change-opacity"
                        >
                            <div className="bg-[#E6C673]/10 p-2 rounded-lg h-fit">
                                <Shield size={20} className="text-[#E6C673] animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-[#E6C673] font-bold text-sm mb-1 flex items-center gap-2">
                                    تنبيه الخبير
                                    <span className="text-[10px] bg-[#E6C673] text-black px-1.5 rounded font-bold">PRO</span>
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                    بناءً على تاريخ التبليغ المدخل، يرجى الانتباه إلى أن المدة القانونية للطعن الاستئنافي (15 يوماً) تنتهي غداً وفق المادة 187 مرافعات.
                                </p>
                            </div>
                            <button type="button" 
                                onClick={() => setIsExpertMode(false)}
                                className="absolute top-2 left-2 text-slate-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AnimatePresence>
    );
};
