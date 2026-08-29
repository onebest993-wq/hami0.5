import type { TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import { stageTimeline } from '../../smartFile/proceduralTypes';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

export function createProceduralPauseHandlers(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setEditingEvent,
        setShowPauseModal,
        setShowPauseResumeModal,
        isPaused,
        pauseReason,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handlePauseConfirm = (pauseData: { reason: string; linkedCaseNo?: string; id?: string; [key: string]: unknown }) => {
        const { reason, linkedCaseNo, id } = pauseData;
        const updatedStages = [...stages];

        if (id) {
            updatedStages[activeStageIndex].timeline = stageTimeline(currentStage).map((e: TimelineEvent) =>
                e.id === id ? {
                    ...e,
                    title: 'قرار استئخار الدعوى',
                    details: `${reason}\n\n🔗 بانتظار حسم الدعوى المرتبطة رقم: ${linkedCaseNo}`,
                } : e
            );

            if (isPaused && pauseReason === currentStage.stayReason) {
                setPauseReason(reason);
                setLinkedCaseNo(linkedCaseNo ?? '');
            }
            setEditingEvent(null);
        } else {
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

    return {
        handlePauseConfirm,
        handleResume,
    };
}
