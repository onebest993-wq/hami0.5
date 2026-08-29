import type { Task } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { str, type SmartFileAttachment } from '../../smartFile/judgmentTypes';
import {
    buildAttachmentTimelineEvent,
    patchTimelineEvent,
    resolveAttachmentTimelineEventId,
} from '../../smartFile/timelineRequestSync';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageAttachmentsList,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../../smartFile/proceduralTypes';
import { replaceStageAt } from '../../smartFile/stageImmutable';

export function useProceduralAttachmentActions(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        saveToCloud,
        setEditingAttachment,
        setShowAttachmentModal,
    } = options;

    const handleSaveAttachment = (data: SmartFileAttachment) => {
        const currentStage = stages[activeStageIndex];
        if (!currentStage) return;

        const attachments = stageAttachmentsList(currentStage);
        const existingTimeline = stageTimeline(currentStage) || [];
        const isEdit = Boolean(data.id);
        const attachmentId = isEdit ? String(data.id) : `attach_${Date.now()}`;
        const priorAttachment = isEdit ? attachments.find((a) => a.id === attachmentId) : undefined;

        const timelineEventId = resolveAttachmentTimelineEventId(
            attachmentId,
            priorAttachment as Record<string, unknown> | undefined,
            existingTimeline,
        );
        const timelineEvent = buildAttachmentTimelineEvent(
            { ...data, id: attachmentId },
            timelineEventId,
        );

        if (isEdit) {
            const nextStage = {
                ...currentStage,
                attachments: attachments.map((a) =>
                    a.id === attachmentId ? { ...a, ...data, timelineEventId } : a,
                ),
                timeline: patchTimelineEvent(existingTimeline, timelineEventId, timelineEvent),
            };
            const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);
            setStages(updatedStages);
            saveToCloud(updatedStages);
            setEditingAttachment(null);
            SmartToast.success('تم تحديث طلب الحجز الاحتياطي بنجاح 🔒');
            setShowAttachmentModal(false);
            return;
        }

        let nextTasks = stageTasks(currentStage) || [];
        let tasksTouched = false;

        const submissionDate = new Date(str(data.submissionDate));
        const notificationRaw = str(data.notificationDate);
        const notificationDate = notificationRaw ? new Date(notificationRaw) : null;

        if (data.status === 'مُقدم - بانتظار القرار (24 ساعة)') {
            const decisionDeadline = new Date(submissionDate);
            decisionDeadline.setDate(decisionDeadline.getDate() + 1);

            const radarTask: Task = {
                id: `task_attach_${Date.now()}`,
                title: `⏱️ رادار الحجز: المحكمة ملزمة بإصدار القرار في اليوم التالي كحد أقصى (المادة 233)`,
                dueDate: ymdPlusDays(decisionDeadline, 0),
                isCompleted: false,
                priority: 'high',
                isNew: true,
            };

            nextTasks = [radarTask, ...nextTasks];
            tasksTouched = true;
        }

        if (
            data.status === 'صدر قرار بالحجز ✅' &&
            data.timing === 'قبل إقامة الدعوى (مستعجل)' &&
            notificationDate
        ) {
            const lawsuit8DayDeadline = new Date(notificationDate);
            lawsuit8DayDeadline.setDate(lawsuit8DayDeadline.getDate() + 8);

            const guillotineTask: Task = {
                id: `task_attach_guillotine_${Date.now()}`,
                title: `🚨 مقصلة الـ 8 أيام: يجب إقامة دعوى الموضوع خلال 8 أيام من التبليغ، وإلا يبطل الحجز (المادة 237)!`,
                dueDate: ymdPlusDays(lawsuit8DayDeadline, 0),
                isCompleted: false,
                priority: 'critical',
                isNew: true,
            };

            const expiration3MonthDate = new Date(submissionDate);
            expiration3MonthDate.setMonth(expiration3MonthDate.getMonth() + 3);

            const expirationTask: Task = {
                id: `task_attach_expire_${Date.now()}`,
                title: `⚠️ تذكير: يبطل الحجز كلياً بعد 3 أشهر إذا لم يتم التبليغ وإقامة الدعوى (المادة 237)`,
                dueDate: formatDateToLocalYmd(expiration3MonthDate),
                isCompleted: false,
                priority: 'medium',
                isNew: true,
            };

            nextTasks = [guillotineTask, expirationTask, ...nextTasks];
            tasksTouched = true;
        }

        if (
            (data.status === 'صدر قرار بالحجز ✅' || data.status === 'رُفض الطلب ❌') &&
            notificationDate
        ) {
            const grievanceDeadline = new Date(notificationDate);
            grievanceDeadline.setDate(grievanceDeadline.getDate() + 3);

            const grievanceTask: Task = {
                id: `task_attach_grieve_${Date.now()}`,
                title: `⚖️ التظلم: يحق تقديم تظلم من قرار الحجز خلال 3 أيام فقط (المادة 240)`,
                dueDate: ymdPlusDays(grievanceDeadline, 0),
                isCompleted: false,
                priority: 'high',
                isNew: true,
            };

            nextTasks = [grievanceTask, ...nextTasks];
            tasksTouched = true;
        }

        const nextStage = {
            ...currentStage,
            attachments: [
                {
                    id: attachmentId,
                    ...data,
                    timelineEventId,
                    createdDate: getLocalTodayYmd(),
                },
                ...attachments,
            ],
            timeline: [timelineEvent, ...existingTimeline],
            ...(tasksTouched ? { tasks: nextTasks } : {}),
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);

        setStages(updatedStages);
        saveToCloud(updatedStages);
        SmartToast.success('تم حفظ طلب الحجز الاحتياطي بنجاح 🔒');
        setShowAttachmentModal(false);
    };

    return { handleSaveAttachment };
}
