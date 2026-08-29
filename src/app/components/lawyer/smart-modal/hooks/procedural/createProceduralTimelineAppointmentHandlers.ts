import type { Task, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { logError } from '@/app/utils/errorLog';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTasks, stageTimeline } from '../../smartFile/proceduralTypes';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';
import {
    resolveAppointmentSubType,
    textImpliesPleadingsClosed,
} from './proceduralTimelineHelpers';

export function createProceduralTimelineAppointmentHandlers(
    options: UseSmartFileProceduralActionsOptions,
) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setEditingEvent,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleAddAppointment = async (data: {
        date: string;
        title?: string;
        details?: string;
        description?: string;
        purpose?: string;
        id?: string;
        [key: string]: unknown;
    }) => {
        try {
            const isEditing = Boolean(data.id);
            const updatedStages = [...stages];
            let autoLock = false;

            if (data.purpose === 'انتخاب خبير / كشف') {
                const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد أمانة الخبير والمصاريف لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false,
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                SmartToast.info('تم إضافة مهمة إدارية لتسديد أجور الخبير تلقائياً');
            }

            if (data.purpose === 'استماع شهود') {
                const newTask: Task = {
                    id: `task_auto_${Date.now()}`,
                    title: `⚠️ تسديد نفقات الشهود لجلسة ${data.date}`,
                    dueDate: data.date,
                    isCompleted: false,
                };
                updatedStages[activeStageIndex].tasks = [newTask, ...(stageTasks(currentStage) || [])];
                SmartToast.info('تم إضافة مهمة إدارية لتسديد نفقات الشهود تلقائياً');
            }

            const appointmentTags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
            const apptTitle = String(data.title ?? data.purpose ?? data.description ?? '').trim();
            const apptDetails = String(data.details ?? data.description ?? '').trim();
            const appointmentSubType = resolveAppointmentSubType(
                String(data.purpose ?? apptTitle),
                appointmentTags,
            );

            if (textImpliesPleadingsClosed(apptTitle, apptDetails)) {
                updatedStages[activeStageIndex].isPleadingsClosed = true;
                autoLock = true;
            }

            if (data.id) {
                updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) =>
                    e.id === data.id
                        ? {
                              ...e,
                              ...data,
                              type: 'appointment' as const,
                              title: apptTitle,
                              details: apptDetails,
                              subType: appointmentSubType,
                              tags: appointmentTags.length ? appointmentTags : undefined,
                          }
                        : e,
                );
                setEditingEvent(null);
            } else {
                const newApptId = `appt_${Date.now()}`;
                updatedStages[activeStageIndex].timeline = [
                    {
                        id: newApptId,
                        type: 'appointment',
                        date: data.date,
                        title: apptTitle,
                        details: apptDetails,
                        subType: appointmentSubType,
                        tags: appointmentTags.length ? appointmentTags : undefined,
                        isNew: true,
                    },
                    ...(updatedStages[activeStageIndex].timeline || []),
                ];
                data.id = newApptId;
            }

            setStages(updatedStages);
            saveToCloud(updatedStages);

            const ctx = lawsuitCalendarContext();
            const timelineEventId = String(data.id ?? `appt_${Date.now()}`);
            syncLawsuitTimelineAppointment({
                userId: ctx.userId,
                fileId: ctx.fileId,
                event: {
                    id: timelineEventId,
                    date: data.date,
                    title: apptTitle || String(data.purpose ?? 'موعد'),
                    details: apptDetails,
                },
                caseNo: ctx.caseNo,
                court: ctx.court,
                parties: ctx.parties,
                clientName: ctx.clientName,
            });

            SmartToast.success(isEditing ? 'تم تحديث الموعد بنجاح ✅' : 'تمت إضافة الموعد بنجاح ✅');
            if (autoLock) {
                SmartToast.success('تم حجز الدعوى للقرار تلقائياً بناءً على نتيجة الجلسة 🔒');
            }
        } catch (error) {
            logError('handleAddAppointment', error, data);
            SmartToast.error('حدث خطأ أثناء حفظ الموعد');
            throw error;
        }
    };

    return { handleAddAppointment };
}
