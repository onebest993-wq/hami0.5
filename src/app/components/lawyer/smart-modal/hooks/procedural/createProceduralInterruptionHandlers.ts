import type { TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTimeline } from '../../smartFile/proceduralTypes';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

export function createProceduralInterruptionHandlers(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        setIsInterrupted,
        setInterruptionData,
        setEditingEvent,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        isInterrupted,
        interruptionData,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleInterruptionToggle = () => {
        if (isInterrupted) {
            setShowResumeInterruptionModal(true);
        } else {
            setShowInterruptionModal(true);
        }
    };

    const handleInterruptionConfirm = (data: { reason: string; affectedParty: string; date: string; notes: string; id: string; [key: string]: unknown }) => {
        const { reason, affectedParty, date, notes, id } = data;
        const updatedStages = [...stages];
        const currentTimeline = stageTimeline(currentStage) || [];

        if (id) {
            updatedStages[activeStageIndex].timeline = currentTimeline.map((e: TimelineEvent) =>
                e.id === id ? {
                    ...e,
                    date: date,
                    details: `السبب القانوني: ${reason}\n\nالخصم المعني: ${affectedParty}\n\n${notes ? `ملاحظات: ${notes}\n\n` : ''}⚖️ *الدعوى موقوفة بحكم القانون لحين تبليغ الورثة أو من يقوم مقام الخصم.*`
                } : e
            );

            if (isInterrupted && interruptionData && interruptionData.id === id) {
                setInterruptionData(data);
            }
            setEditingEvent(null);
        } else {
            setStatus('منقطعة');
            setIsInterrupted(true);
            setInterruptionData(data);

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

    return {
        handleInterruptionToggle,
        handleInterruptionConfirm,
        handleResumeInterruptionConfirm,
    };
}
