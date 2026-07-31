import type {
    Task,
    TimelineEvent,
} from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    validateTaskData,
} from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';


import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    stageTasks,
    stageTimeline,
} from '../../smartFile/proceduralTypes';


import { syncLawsuitTaskDue } from '@/app/services/calendarDossierSync';


import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';


export function useProceduralTaskActions(options: UseSmartFileProceduralActionsOptions) {
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
            updatedStages[activeStageIndex].tasks = stageTasks(currentStage).map((t: Task) => 
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
            updatedStages[activeStageIndex].tasks = [newTask, ...stageTasks(currentStage)];
            SmartToast.success('تمت إضافة المهمة بنجاح ✅');
            taskData.id = newTask.id;
        }
        
        setStages(updatedStages);
        saveToCloud(updatedStages);

        const ctx = lawsuitCalendarContext();
        if (taskData.id && taskData.dueDate) {
            syncLawsuitTaskDue({
                userId: ctx.userId,
                fileId: ctx.fileId,
                task: {
                    id: String(taskData.id),
                    title: taskData.title,
                    dueDate: taskData.dueDate,
                    isCompleted: taskData.isCompleted,
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
            });
        }
    } catch (error) {
        logError('handleAddTask', error, taskData);
        SmartToast.error('حدث خطأ أثناء حفظ المهمة');
    }
};

const handleToggleTask = (taskId: string) => {
    const task = stageTasks(currentStage).find((t) => t.id === taskId);
    if (task && !task.isCompleted && String(task.id).startsWith('task_appeal_')) {
        return;
    }
    if (task && !task.isCompleted && task.taskKind === 'correspondence') {
        return;
    }

    const updatedStages = [...stages];
    const prevStage = updatedStages[activeStageIndex];
    let toggled: Task | undefined;
    const nextTasks = stageTasks(prevStage).map((t: Task) => {
        if (t.id === taskId) {
            toggled = { ...t, isCompleted: !t.isCompleted };
            return toggled;
        }
        return t;
    });
    updatedStages[activeStageIndex] = { ...prevStage, tasks: nextTasks };
    setStages(updatedStages);
    saveToCloud(updatedStages);
    if (toggled?.dueDate) {
        const ctx = lawsuitCalendarContext();
        syncLawsuitTaskDue({
            userId: ctx.userId,
            fileId: ctx.fileId,
            task: toggled,
            caseNo: ctx.caseNo,
            court: ctx.court,
            parties: ctx.parties,
        });
    }
};

const handleAppealBriefFile = (taskId: string, decisionNo: string, decisionDate: string) => {
    const prevStage = stages[activeStageIndex];
    const task = stageTasks(prevStage).find((t) => t.id === taskId);
    if (!task) return;

    const trimmedNo = decisionNo.trim();
    const trimmedDate = decisionDate.trim();
    if (!trimmedNo || !trimmedDate) {
        SmartToast.error('أدخل رقم القرار وتاريخه قبل تسجيل تقديم اللائحة');
        return;
    }

    const updatedStages = [...stages];
    const nextTasks = stageTasks(prevStage).map((t) =>
        t.id === taskId
            ? {
                  ...t,
                  appealDecisionNo: trimmedNo,
                  appealDecisionDate: trimmedDate,
                  appealBriefFiled: true,
              }
            : t,
    );
    const fileEvent: TimelineEvent = {
        id: `appeal_brief_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: '📋 تقديم لائحة الطعن التمييزي',
        details: `رقم القرار: ${trimmedNo}\nتاريخ القرار: ${trimmedDate}`,
        isNew: true,
        tags: ['#طعن_تمييزي', '#تقديم_اللائحة'],
    };

    updatedStages[activeStageIndex] = {
        ...prevStage,
        tasks: nextTasks,
        timeline: [fileEvent, ...stageTimeline(prevStage)],
    };

    setStages(updatedStages);
    saveToCloud(updatedStages);
    SmartToast.success('تم تسجيل تقديم اللائحة — سجّل نتيجة الطعن');
};

const handleAppealBriefOutcome = (taskId: string, outcome: 'quashed' | 'upheld' | 'partial') => {
    const prevStage = stages[activeStageIndex];
    const task = stageTasks(prevStage).find((t) => t.id === taskId);
    if (!task) return;
    if (!task.appealBriefFiled) {
        SmartToast.error('سجّل تقديم اللائحة أولاً');
        return;
    }

    const outcomeLabel =
        outcome === 'quashed' ? 'نقض القرار الإعدادي' : 'تأييد القرار الإعدادي';

    const updatedStages = [...stages];
    const nextTasks = stageTasks(prevStage).map((t) =>
        t.id === taskId
            ? { ...t, isCompleted: true, appealOutcome: outcome === 'partial' ? 'upheld' : outcome }
            : t,
    );
    const decisionNo = String(task.appealDecisionNo ?? '').trim();
    const decisionDate = String(task.appealDecisionDate ?? '').trim();
    const outcomeEvent: TimelineEvent = {
        id: `appeal_outcome_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: `📋 نتيجة الطعن التمييزي — ${outcomeLabel}`,
        details: [
            decisionNo ? `رقم القرار: ${decisionNo}` : '',
            decisionDate ? `تاريخ القرار: ${decisionDate}` : '',
            'تم تقديم لائحة الطعن.',
            `نتيجة الطعن: ${outcomeLabel}`,
        ]
            .filter(Boolean)
            .join('\n'),
        isNew: true,
        tags: ['#طعن_تمييزي', '#نتيجة_الطعن'],
    };

    updatedStages[activeStageIndex] = {
        ...prevStage,
        tasks: nextTasks,
        timeline: [outcomeEvent, ...stageTimeline(prevStage)],
    };

    setStages(updatedStages);
    saveToCloud(updatedStages);
    setAppealOutcomeTask(null);
    SmartToast.success(`تم تسجيل نتيجة الطعن: ${outcomeLabel}`);
};


    return {
        handleAddTask,
        handleToggleTask,
        handleAppealBriefFile,
        handleAppealBriefOutcome,
    };
}
