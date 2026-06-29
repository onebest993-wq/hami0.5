// @ts-nocheck
/** Phase C Slice 21 — دوال ثابتة لحقائب chunk scope (imports موثّقة) */
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { getExecutionPartyDisplayName } from '@/app/utils/partyDisplayName';
import {
    addCalendarDaysYmd,
    buildEmployeeAssignmentPatchForDebtorKey,
    computeTaklifDeadlineYmd,
    getEmployeeAssignmentForDebtorKey,
} from '@/app/utils/employeeSummonsAssignment';
import {
    buildDebtorSummonsMarkerPatchForKey,
    getDebtorSummonsMarkerForKey,
} from '@/app/utils/noticeDebtorScope';
import { buildPublicationNoticePatchForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import { getPublicationNoticeForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import { getDebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/executorSeizureDecisionQueue';

export const executionDashboardCoreStaticScopeFns = {
    buildDebtorSummonsMarkerPatchForKey,
    buildEmployeeAssignmentPatchForDebtorKey,
    buildPublicationNoticePatchForDebtorKey,
    computeTaklifDeadlineYmd,
    getDebtorSummonsMarkerForKey,
    getDebtorSummonsProfile,
    getEmployeeAssignmentForDebtorKey,
    getExecutionPartyDisplayName,
    getLocalTodayYmd,
    getPersonalCoerciveSubtypeOutcome,
    getPublicationNoticeForDebtorKey,
    addCalendarDaysYmd,
};

/** queueMicrotask — واجهة متصفح / React */
export const executionDashboardCoreQueueMicrotask = queueMicrotask;
