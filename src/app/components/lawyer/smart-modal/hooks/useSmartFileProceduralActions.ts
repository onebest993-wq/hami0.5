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
} from '../../LawyerShared';
import { formatConsolidatedChipLabel } from '../smartFile/caseConsolidationLinking';
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
import { str, type SmartFileAttachment } from '../smartFile/judgmentTypes';
import { normalizeFastTrackRecord } from '../smartFile/fastTrackNormalize';
import {
    buildAttachmentTimelineEvent,
    buildFastTrackTimelineEvent,
    patchTimelineEvent,
    resolveAttachmentTimelineEventId,
    resolveFastTrackTimelineEventId,
} from '../smartFile/timelineRequestSync';
import type { FastTrackRecord, UseSmartFileProceduralActionsOptions } from '../smartFile/proceduralTypes';
import {
    formatDateToLocalYmd,
    stageAttachmentsList,
    stageFastTrackPetitions,
    stageIncidentalCases,
    stageTasks,
    stageTimeline,
    ymdPlusDays,
} from '../smartFile/proceduralTypes';
import {
    buildIncidentalEntryDecisionEvent,
    buildIncidentalResolveEvent,
    buildIncidentalTimelineEvent,
    filterHeaderIncidentalCases,
    isLinkedSpawnIncidentalType,
} from '../smartFile/incidentalCaseLinking';
import { syncLawsuitTaskDue, syncLawsuitTimelineAppointment } from '@/app/services/calendarDossierSync';
import {
    isPetitionVoidRevivalExpired,
    PETITION_VOID_APPEAL_DAYS,
    resolvePetitionVoidMenuLabel,
} from '../smartFile/petitionVoidFlow';
import { useProceduralTaskActions } from './procedural/useProceduralTaskActions';
import { useProceduralIncidentalActions } from './procedural/useProceduralIncidentalActions';
import { useProceduralTimelineActions } from './procedural/useProceduralTimelineActions';
import { useProceduralPauseActions } from './procedural/useProceduralPauseActions';
import { useProceduralLifecycleActions } from './procedural/useProceduralLifecycleActions';

export function useSmartFileProceduralActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...useProceduralTaskActions(options),
        ...useProceduralIncidentalActions(options),
        ...useProceduralTimelineActions(options),
        ...useProceduralPauseActions(options),
        ...useProceduralLifecycleActions(options),
    };
}
