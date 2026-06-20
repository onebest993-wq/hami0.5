import type {
    AppointmentType,
    CaseStage,
    ConsolidationSecondaryRef,
    DocumentCategory,
    IncidentalCase,
    IncidentalStatus,
    Party,
    Task,
    TimelineEvent,
} from '../../../LawyerShared';
import { formatConsolidatedChipLabel } from '../../smartFile/caseConsolidationLinking';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    validateDocumentData,
    validatePaymentData,
    validateTaskData,
} from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { str, type SmartFileAttachment } from '../../smartFile/judgmentTypes';
import { normalizeFastTrackRecord } from '../../smartFile/fastTrackNormalize';
import {
    buildAttachmentTimelineEvent,
    buildFastTrackTimelineEvent,
    patchTimelineEvent,
    resolveAttachmentTimelineEventId,
    resolveFastTrackTimelineEventId,
} from '../../smartFile/timelineRequestSync';
import type { FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageAttachmentsList,
    stageFastTrackPetitions,
    stageIncidentalCases,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import {
    buildIncidentalEntryDecisionEvent,
    buildIncidentalResolveEvent,
    buildIncidentalTimelineEvent,
    filterHeaderIncidentalCases,
    isLinkedSpawnIncidentalType,
} from '../../smartFile/incidentalCaseLinking';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';
import {
    isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel,
} from '../../smartFile/petitionVoidFlow';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';


export function useProceduralPauseActions(options: UseSmartFileProceduralActionsOptions) {
    const {
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
        calendarUserId,
        setAppealOutcomeTask,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

const handlePauseConfirm = (pauseData: { reason: string; linkedCaseNo?: string; id?: string; [key: string]: unknown }) => {
    const { reason, linkedCaseNo, id } = pauseData;
    const updatedStages = [...stages];

    if (id) {
        // Update existing event
        updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
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
             setLinkedCaseNo(linkedCaseNo ?? '');
        }
        setEditingEvent(null);
    } else {
        // New Pause
        setStatus('مستأخرة');
        setIsPaused(true);
        setPauseReason(reason);
        setLinkedCaseNo(linkedCaseNo ?? '');
        
        updatedStages[activeStageIndex].timeline = [{
            id: `pause_${Date.now()}`,
            type: 'decision',
            date: getLocalTodayYmd(),
            title: 'قرار استئخار الدعوى ⏸️',
            details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo ?? ''}`,
            isNew: true,
            isPause: true,
        }, ...stageTimeline(currentStage)];
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
    
    updatedStages[activeStageIndex].timeline = [newEvent, ...(stageTimeline(currentStage) || [])];
    
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

    updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
    
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
    }, ...(stageTimeline(currentStage) || [])];

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
        updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) => 
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
            isCompleted: false,
            appealDecisionType: decisionType,
            appealDecisionDate: decisionDate,
        };

        // Ensure we work with arrays even if undefined
        const currentTimeline = stageTimeline(currentStage) || [];
        const currentTasks = stageTasks(currentStage) || [];

        updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
        updatedStages[activeStageIndex].tasks = [newTask, ...currentTasks];
    }
    
    setStages(updatedStages);
    saveToCloud(updatedStages);
    const ctx = lawsuitCalendarContext();
    if (!id) {
        const tasks = updatedStages[activeStageIndex].tasks ?? [];
        const appealTask = tasks.find((t) => t.id?.startsWith('task_appeal_'));
        if (appealTask?.dueDate) {
            syncLawsuitTaskDue({
                userId: ctx.userId,
                fileId: ctx.fileId,
                task: appealTask,
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
            });
        }
    }
    setShowInterlocutoryModal(false);
};

const handleInterruptionConfirm = (data: { reason: string; affectedParty: string; date: string; notes: string; id: string; [key: string]: unknown }) => {
    const { reason, affectedParty, date, notes, id } = data;
    const updatedStages = [...stages];
    const currentTimeline = stageTimeline(currentStage) || [];

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

    updatedStages[activeStageIndex].timeline = [newEvent, ...(stageTimeline(currentStage) || [])];
    
    setStages(updatedStages);
    saveToCloud(updatedStages);
    setShowResumeInterruptionModal(false);
};

// ========================================
// ABANDONMENT & WARNING RADAR LOGIC
// ========================================

    return {
        handlePauseConfirm,
        handleResume,
        handleInterruptionToggle,
        handleExtraordinaryAppeal,
        handleProvisionalOrderConfirm,
        handleInterlocutoryAppealConfirm,
        handleInterruptionConfirm,
        handleResumeInterruptionConfirm,
    };
}
