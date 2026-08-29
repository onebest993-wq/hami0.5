import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import { resolveFastTrackCalendarAppointment } from '../../smartFile/fastTrackCalendar';
import { normalizeFastTrackRecord } from '../../smartFile/fastTrackNormalize';
import {
    buildFastTrackTimelineEvent,
    patchTimelineEvent,
    resolveFastTrackTimelineEventId,
} from '../../smartFile/timelineRequestSync';
import type { FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
import {
    stageFastTrackPetitions,
    stageTimeline,
} from '../../smartFile/proceduralTypes';
import { replaceStageAt } from '../../smartFile/stageImmutable';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

export function useProceduralFastTrackActions(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        parentData,
        saveToCloud,
        setEditingFastTrack,
        setShowFastTrackModal,
        calendarUserId,
    } = options;

    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);

    const handleSaveFastTrack = (data: FastTrackRecord) => {
        const normalized = normalizeFastTrackRecord(data);
        const currentStage = stages[activeStageIndex];
        if (!currentStage) return;

        const petitions = stageFastTrackPetitions(currentStage);
        const existingTimeline = stageTimeline(currentStage) || [];
        const isEdit = Boolean(normalized.id);
        const petitionId = isEdit ? String(normalized.id) : `fast_${Date.now()}`;
        const priorPetition = isEdit ? petitions.find((p) => p.id === petitionId) : undefined;

        const timelineEventId = resolveFastTrackTimelineEventId(
            petitionId,
            priorPetition as Record<string, unknown> | undefined,
            existingTimeline,
        );
        const savedRecord: FastTrackRecord = { ...normalized, id: petitionId, timelineEventId };
        const timelineEvent = buildFastTrackTimelineEvent(savedRecord, timelineEventId);

        const nextPetitions = isEdit
            ? petitions.map((p) =>
                  p.id === petitionId ? { ...p, ...normalized, timelineEventId } : p,
              )
            : [
                  {
                      id: petitionId,
                      ...normalized,
                      timelineEventId,
                      createdDate: getLocalTodayYmd(),
                  },
                  ...petitions,
              ];

        const nextTimeline = isEdit
            ? patchTimelineEvent(existingTimeline, timelineEventId, timelineEvent)
            : [timelineEvent, ...existingTimeline];

        const nextStage = {
            ...currentStage,
            fastTrackPetitions: nextPetitions,
            timeline: nextTimeline,
        };
        const updatedStages = replaceStageAt(stages, activeStageIndex, nextStage);

        setStages(updatedStages);
        saveToCloud(updatedStages);

        const calAppt = resolveFastTrackCalendarAppointment(savedRecord);
        if (calAppt) {
            const ctx = lawsuitCalendarContext();
            if (ctx.fileId) {
                syncLawsuitTimelineAppointment({
                    userId: ctx.userId,
                    fileId: ctx.fileId,
                    event: {
                        id: timelineEventId,
                        date: calAppt.date,
                        title: calAppt.title,
                        details: calAppt.details,
                    },
                    caseNo: ctx.caseNo,
                    court: ctx.court,
                    parties: ctx.parties,
                    clientName: ctx.clientName,
                });
            }
        }

        if (isEdit) setEditingFastTrack(null);
        SmartToast.success(
            isEdit ? 'تم تحديث الطلب بنجاح' : 'تم حفظ الطلب بنجاح',
        );
        setShowFastTrackModal(false);
    };

    return { handleSaveFastTrack };
}
