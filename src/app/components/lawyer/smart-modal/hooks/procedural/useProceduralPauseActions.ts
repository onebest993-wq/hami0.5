import type {
    AppointmentType as _AppointmentType,
    CaseStage as _CaseStage,
    ConsolidationSecondaryRef as _ConsolidationSecondaryRef,
    DocumentCategory as _DocumentCategory,
    IncidentalCase as _IncidentalCase,
    IncidentalStatus as _IncidentalStatus,
    Party as _Party,
    Task,
    TimelineEvent,
} from '../../../LawyerShared';
import { formatConsolidatedChipLabel as _formatConsolidatedChipLabel } from '../../smartFile/caseConsolidationLinking';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    validateDocumentData as _validateDocumentData,
    validatePaymentData as _validatePaymentData,
    validateTaskData as _validateTaskData,
} from '@/app/utils/validationUtils';
import { logError as _logError } from '@/app/utils/errorHandler';
import { debug as _debug } from '@/app/utils/debug';
import { getLocalTodayYmd, parseLocalNotificationDate as _parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd as _addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { str as _str, type SmartFileAttachment as _SmartFileAttachment } from '../../smartFile/judgmentTypes';
import { normalizeFastTrackRecord as _normalizeFastTrackRecord } from '../../smartFile/fastTrackNormalize';
import {
    buildAttachmentTimelineEvent as _buildAttachmentTimelineEvent,
    buildFastTrackTimelineEvent as _buildFastTrackTimelineEvent,
    patchTimelineEvent as _patchTimelineEvent,
    resolveAttachmentTimelineEventId as _resolveAttachmentTimelineEventId,
    resolveFastTrackTimelineEventId as _resolveFastTrackTimelineEventId,
} from '../../smartFile/timelineRequestSync';
import type { FastTrackRecord as _FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd as _formatDateToLocalYmd,
    stageAttachmentsList as _stageAttachmentsList,
    stageFastTrackPetitions as _stageFastTrackPetitions,
    stageIncidentalCases as _stageIncidentalCases,
    stageTasks,
    stageTimeline,
    ymdPlusDays as _ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import {
    buildIncidentalEntryDecisionEvent as _buildIncidentalEntryDecisionEvent,
    buildIncidentalResolveEvent as _buildIncidentalResolveEvent,
    buildIncidentalTimelineEvent as _buildIncidentalTimelineEvent,
    filterHeaderIncidentalCases as _filterHeaderIncidentalCases,
    isLinkedSpawnIncidentalType as _isLinkedSpawnIncidentalType,
} from '../../smartFile/incidentalCaseLinking';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSync';
import {
    isPetitionVoidRevivalExpired as _isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS as _PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel as _resolvePetitionVoidMenuLabel,
} from '../../smartFile/petitionVoidFlow';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';
import { isCassationStageName } from '../../smartFile/judgmentTypes';
import {
    findCassationStageIndex,
    resolveRetrialTargetStageIndex,
} from '../../smartFile/extraordinaryAppealGateway';
import { applyCassationCorrectionOpen } from '../../smartFile/appealStageTransition';


export function useProceduralPauseActions(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
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
        setEditingTask: _setEditingTask,
        setEditingIncidental: _setEditingIncidental,
        setEditingFastTrack: _setEditingFastTrack,
        setEditingAttachment: _setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal: _setShowFastTrackModal,
        setShowAttachmentModal: _setShowAttachmentModal,
        setShowJudgeRecusalModal: _setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal: _setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal: _setShowCaseConsolidationModal,
        setShowMaterialErrorModal: _setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowPauseResumeModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId,
        setAppealOutcomeTask: _setAppealOutcomeTask,
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
                title: 'قرار استئخار الدعوى',
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
            title: 'قرار استئخار الدعوى',
            details: `سبب الاستئخار: ${reason}\n\nالدعوى المرتبطة: ${linkedCaseNo ?? '—'}\n\nتوقف السير مؤقتاً بانتظار حسم الدعوى المرتبطة. يجب استئناف السير من التذييل قبل انتهاء المهلة القانونية.`,
            isNew: true,
            isPause: true,
        }, ...stageTimeline(currentStage)];
    }
    
    setShowPauseModal(false);
    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handleResume = (data?: { nextHearingDate?: string }) => {
    setStatus('نشطة');
    setIsPaused(false);
    setPauseReason('');

    const updatedStages = [...stages];
    const nextHearingDate = String(data?.nextHearingDate ?? '').trim().slice(0, 10);
    const timelineEvents: TimelineEvent[] = [];

    updatedStages[activeStageIndex] = {
        ...currentStage,
        isPleadingsClosed: false,
        status: 'active',
    };

    if (nextHearingDate) {
        timelineEvents.push({
            id: `resume_pause_hearing_${Date.now()}`,
            type: 'appointment',
            date: nextHearingDate,
            title: 'موعد المرافعة بعد استئناف السير',
            details: 'موعد المرافعة القادم بعد رفع استئخار الدعوى.',
            isNew: true,
        });
        const ctx = lawsuitCalendarContext();
        if (ctx.fileId) {
            syncLawsuitTimelineAppointment({
                userId: ctx.userId,
                fileId: ctx.fileId,
                event: {
                    id: `appt_resume_pause_${nextHearingDate}`,
                    date: nextHearingDate,
                    title: 'مرافعة بعد استئناف الاستئخار',
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
                clientName: ctx.clientName,
            });
        }
    }

    timelineEvents.push({
        id: `resume_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: 'استئناف السير في الدعوى (من استئخار)',
        details: nextHearingDate
            ? `تم رفع الاستئخار واستئناف السير. موعد المرافعة القادم: ${nextHearingDate}`
            : 'تم رفع التجميد واستئناف السير في الدعوى بشكل طبيعي.',
        isNew: true,
    });

    updatedStages[activeStageIndex].timeline = [
        ...timelineEvents,
        ...(stageTimeline(currentStage) || []),
    ];

    setStages(updatedStages);
    saveToCloud(updatedStages);
    setShowPauseResumeModal?.(false);
    SmartToast.success('تم استئناف السير في الدعوى');
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
    let timelineTitle = '';
    let timelineDetails = `تاريخ التقديم: ${date}\nمقدمة إلى: ${court}\n\nالأسباب:\n${reasons}`;
    let targetIndex = activeStageIndex;
    let nextParent = parentData;

    // 1. STATE OVERRIDE MUTATIONS (The Legal Re-opening)
    if (type === 'إعادة المحاكمة') {
        newStatus = 'قيد نظر إعادة المحاكمة';
        timelineTitle = '🔄 تسجيل طلب إعادة المحاكمة';
        targetIndex = resolveRetrialTargetStageIndex(updatedStages);
        const targetStage = updatedStages[targetIndex];
        if (!targetStage) {
            SmartToast.error('تعذّر تحديد مرحلة إعادة المحاكمة');
            return;
        }
        const targetName = String(targetStage.stageName ?? targetStage.name ?? '');
        updatedStages[targetIndex] = {
            ...targetStage,
            status: 'active',
            isPleadingsClosed: false,
            awaitingOpponentAppeal: false,
            finalDecision: null,
            decisionDate: null,
            wasReopened: true,
            extraordinaryAppealType: type,
            timeline: [
                {
                    id: `extra_appeal_${Date.now()}`,
                    type: 'decision',
                    date,
                    title: timelineTitle,
                    details: timelineDetails,
                    isNew: true,
                    isSystemLog: true,
                    tags: ['#طعن_استثنائي', type],
                },
                ...stageTimeline(targetStage),
            ],
        };
        nextParent = {
            ...parentData,
            status: newStatus,
            retrialTargetStage: targetName,
        };
        setParentData(nextParent);
        setStatus(newStatus);
        setActiveStageIndex?.(targetIndex);
        setViewingStageIndex?.(targetIndex);
        setStages(updatedStages);
        saveToCloud(updatedStages, nextParent, targetIndex);
        setShowExtraordinaryAppealModal(false);
        SmartToast.success(`تم تسجيل ${type} بنجاح في مرحلة ${targetName} ⚖️`);
        return;
    }

    if (type === 'تصحيح القرار التمييزي') {
        newStatus = 'قيد نظر التصحيح التمييزي';
        const cassationIdx =
            viewingStageIndex >= 0 && isCassationStageName(updatedStages[viewingStageIndex]?.stageName)
                ? viewingStageIndex
                : findCassationStageIndex(updatedStages);
        if (cassationIdx < 0) {
            SmartToast.error('تعذّر تحديد مرحلة التمييز');
            return;
        }
        const { updatedStages: openedStages, newActiveIndex } = applyCassationCorrectionOpen(
            updatedStages,
            cassationIdx,
            { judgmentDate: date, notes: timelineDetails },
        );
        nextParent = { ...parentData, status: newStatus };
        setParentData(nextParent);
        setStatus(newStatus);
        setActiveStageIndex?.(newActiveIndex);
        setViewingStageIndex?.(newActiveIndex);
        setStages(openedStages);
        saveToCloud(openedStages, nextParent, newActiveIndex);
        setShowExtraordinaryAppealModal(false);
        SmartToast.success('تم فتح مرحلة تصحيح قرار تمييزي');
        return;
    }

    if (type === 'اعتراض الغير') {
        timelineTitle = '🙋‍♂️ تسجيل اعتراض الغير على الحكم';
    } else if (type === 'رد القاضي') {
        newStatus = 'قيد نظر طلب رد القاضي';
        timelineTitle = '⚖️ طلب رد القاضي أو نقل الدعوى';
        setIsPaused(true);
        setPauseReason('قيد نظر طلب رد القاضي');
    }

    if (newStatus !== status) {
        setStatus(newStatus);
    }

    const newEvent: TimelineEvent = {
        id: `extra_appeal_${Date.now()}`,
        type: 'decision',
        date: date,
        title: timelineTitle,
        details: timelineDetails,
        isNew: true,
        isSystemLog: true,
        tags: ['#طعن_استثنائي', type]
    };

    updatedStages[activeStageIndex].timeline = [newEvent, ...stageTimeline(currentStage)];
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
            title: 'قرار بانقطاع السير في الدعوى',
            details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}انقطع السير بحكم القانون لحين تبليغ من يقوم مقام الخصم أو زوال السبب.\nاستئناف السير من زر التذييل مع تسجيل موعد المرافعة القادم.`,
            isNew: true
        };

        updatedStages[activeStageIndex].timeline = [newEvent, ...currentTimeline];
    }
    
    setShowInterruptionModal(false);
    setStages(updatedStages);
    saveToCloud(updatedStages);
};

const handleResumeInterruptionConfirm = (data?: { nextHearingDate?: string }) => {
    setStatus('نشطة');
    setIsInterrupted(false);
    setInterruptionData(null);

    const updatedStages = [...stages];
    updatedStages[activeStageIndex] = {
        ...currentStage,
        isPleadingsClosed: false,
        status: 'active',
        interruptionDate: undefined,
    };

    const nextHearingDate = String(data?.nextHearingDate ?? '').trim().slice(0, 10);
    const timelineEvents: TimelineEvent[] = [];

    if (nextHearingDate) {
        timelineEvents.push({
            id: `resume_hearing_${Date.now()}`,
            type: 'appointment',
            date: nextHearingDate,
            title: 'موعد المرافعة بعد استئناف السير',
            details: 'موعد المرافعة القادم بعد زوال سبب انقطاع السير.',
            isNew: true,
        });
        const ctx = lawsuitCalendarContext();
        if (ctx.fileId) {
            syncLawsuitTimelineAppointment({
                userId: ctx.userId,
                fileId: ctx.fileId,
                event: {
                    id: `appt_resume_interrupt_${nextHearingDate}`,
                    date: nextHearingDate,
                    title: 'مرافعة بعد استئناف السير',
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
                clientName: ctx.clientName,
            });
        }
    }

    timelineEvents.push({
        id: `resume_int_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: 'استئناف السير (زوال سبب الانقطاع)',
        details: nextHearingDate
            ? `تم استئناف السير في الدعوى. موعد المرافعة القادم: ${nextHearingDate}`
            : 'تم تبليغ من يقوم مقام الخصم أو زوال السبب القانوني للانقطاع، واستئناف السير في الدعوى من النقطة التي وقفت عندها.',
        isNew: true,
    });

    updatedStages[activeStageIndex].timeline = [
        ...timelineEvents,
        ...(stageTimeline(currentStage) || []),
    ];

    setStages(updatedStages);
    saveToCloud(updatedStages);
    setShowResumeInterruptionModal(false);
    SmartToast.success('تم استئناف السير في الدعوى');
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
