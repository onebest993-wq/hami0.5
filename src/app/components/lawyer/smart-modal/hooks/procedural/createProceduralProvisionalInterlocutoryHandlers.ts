import type { Task, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTasks, stageTimeline } from '../../smartFile/proceduralTypes';
import { syncLawsuitTaskDue } from '@/app/services/calendar/dossierSyncLazy';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

export function createProceduralProvisionalInterlocutoryHandlers(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setEditingEvent,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleProvisionalOrderConfirm = (data: { type: string; targetParty: string; [key: string]: unknown }) => {
        const { type, targetParty } = data;

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

        updatedStages[activeStageIndex].timeline = [{
            id: `order_${Date.now()}`,
            type: 'decision',
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
            updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) =>
                e.id === id ? {
                    ...e,
                    details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                    date: decisionDate
                } : e
            );
            setEditingEvent(null);
        } else {
            const newEvent: TimelineEvent = {
                id: `appeal_${Date.now()}`,
                type: 'decision',
                title: 'طعن تمييزي في قرار إعدادي (مادة 216) ⚖️',
                details: `نوع القرار: ${decisionType}\nتاريخ صدور القرار: ${decisionDate}\n\n⚠️ تم تسجيل مهلة 7 أيام للطعن.\nالموعد النهائي: ${calculatedDeadline}`,
                date: getLocalTodayYmd(),
                isNew: true
            };

            const newTask: Task = {
                id: `task_appeal_${Date.now()}`,
                title: `تقديم لائحة الطعن التمييزي (${decisionType})`,
                dueDate: calculatedDeadline,
                isCompleted: false,
                appealDecisionType: decisionType,
                appealDecisionDate: decisionDate,
            };

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

    return {
        handleProvisionalOrderConfirm,
        handleInterlocutoryAppealConfirm,
    };
}
