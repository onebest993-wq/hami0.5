import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    getEffectiveClaimTypes,
    hasOngoingAlimonyInExecution,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    calculateGlobalFileState,
    type ExecutionStatus,
} from '@/app/utils/executionStateMachine';
import {
    getExecutionModuleStrategy,
    isEvictionClaim,
} from '@/app/utils/executionModuleStrategies';
import { getDebtorNoticeStateForKey } from '@/app/utils/noticeDebtorScope';
import { parseYmdToTs, dayDiff } from '@/app/services/executionAlerts.helpers';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import { buildSubsequentNoticeSparkBundle } from '@/app/spark/engine/buildSubsequentNoticePolicyInputFromFile';
import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import { readExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { hasActiveEvictionProcedureDecisions } from '@/app/utils/evictionBranchSignals';

const DAY_MS = 24 * 60 * 60 * 1000;
const VOLUNTARY_DAYS = 7;
const PUBLICATION_DAYS = 15;
const DORMANCY_WARN_DAYS = 300;

export type ExecutionVoluntaryGap = {
    debtorKey: string;
    debtorLabel: string;
    anchorDate: string;
    daysSincePeriodEnd: number;
    isEviction: boolean;
};

export type ExecutionAttentionSignals = {
    claimTypes: string[];
    claimTypeLabel: string;
    isEvictionModule: boolean;
    isAlimonyClaim: boolean;
    remainingDebt: number;
    notificationCount: number;
    lifecycleStatus: ReturnType<typeof normalizeDossierLifecycleStatus>;
    globalStatus: ExecutionStatus;
    primaryDebtorKey: string;
    primaryDebtorLabel: string;
    primaryDebtorStatus: ExecutionStatus;
    primaryDebtorDaysRemaining: number;
    primaryNoticeState: string | null;
    unnotifiedDebtorLabels: string[];
    showUnservedMemo: boolean;
    absenceFollowupDue: boolean;
    subsequentSummonsDue: boolean;
    guarantorNoticePending: boolean;
    gracePeriodEndingSoon: boolean;
    coerciveReadyUnresolved: boolean;
    voluntaryPeriodGap: ExecutionVoluntaryGap | null;
    evictionVoluntaryGap: ExecutionVoluntaryGap | null;
    dormancyDaysSinceAction: number | null;
    stalePaymentDaysSince: number | null;
    publicationNearEnd: { debtorKey: string; daysLeft: number } | null;
    urgentTimelineDeadline: { title: string; deadlineDate: string; daysLeft: number } | null;
    daysSinceLastTimelineAction: number | null;
    pendingCaseTasks: number;
    /** من buildSubsequentNoticePolicy — مسار موظف حكومي / نفقة مركّبة */
    debtorSummonsProfile: DebtorSummonsProfile | string | null;
    subsequentNoticeUnlocked: boolean;
    employeeFinancialSalaryOnlyCoercive: boolean;
    primaryDebtorTaklifActive: boolean;
    showEmployeeAssignmentCoerciveBlock: boolean;
    anyExecutorDecisionResolvedForMemoBadge: boolean;
    earnerForcedActionUnlocked: boolean;
    employeeAssignmentTabEnabled: boolean;
    showDebtorSummonsAttendanceBadge: boolean;
};

function resolvePrimaryDebtorKey(file: ExecutionFile): string {
    const d0 = file.debtors?.[0];
    return String(d0?.id ?? d0?.partyId ?? '0');
}

function resolveDebtorLabel(file: ExecutionFile, debtorKey: string): string {
    const debtor = file.debtors?.find((d) => String(d.id ?? d.partyId ?? '') === debtorKey);
    return String(debtor?.name ?? debtor?.fullName ?? '').trim() || 'المدين';
}

function resolveRemainingDebt(file: ExecutionFile): number {
    const fromField = Number(file.total_remaining_balance ?? file.remainingDebt);
    if (Number.isFinite(fromField) && fromField >= 0) return fromField;
    const debt = Number(file.debtAmount ?? file.totalAmount ?? 0);
    const paid = Number(file.paidDebt ?? file.paidAmount ?? 0);
    return Math.max(0, debt - paid);
}

function inferNotificationCount(file: ExecutionFile, primaryKey: string): number {
    const stored = Number(file.notificationCount);
    if (Number.isFinite(stored) && stored >= 0) return stored;
    const notice = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
    if (notice.memoAnchorDate || notice.notificationDate) return 1;
    if (file.eviction_first_notice_date) return 1;
    return 0;
}

function buildDebtorsForStateMachine(
    file: ExecutionFile,
    primaryKey: string,
    isEviction: boolean,
    notificationCount: number,
): Array<{ id: string; name: string; notificationDate: string | null }> {
    const memoAnchor =
        file.execution_memo_anchor_date || file.debtorNotificationDate || null;
    const lastNotice = file.debtorNotificationDate || null;
    const voluntaryEnded = Boolean(file.notice_voluntary_period_end_declared);

    return (file.debtors?.length ? file.debtors : [{ id: primaryKey, name: 'مدين' }]).map(
        (debtor, index) => {
            const key = String(debtor.id ?? debtor.partyId ?? `debtor_${index}`);
            const notice = getDebtorNoticeStateForKey(file, key, primaryKey);
            let notificationDate =
                notice.notificationDate || notice.memoAnchorDate || debtor.notificationDate || null;

            if (isEviction) {
                notificationDate =
                    file.eviction_first_notice_date ||
                    notificationDate ||
                    lastNotice;
            } else if (
                notificationCount === 1 &&
                !voluntaryEnded &&
                (notice.memoAnchorDate || memoAnchor)
            ) {
                notificationDate = notice.memoAnchorDate || memoAnchor || notificationDate;
            } else {
                notificationDate = notificationDate || lastNotice;
            }

            return {
                id: key,
                name: String(debtor.name ?? debtor.fullName ?? '').trim() || 'مدين',
                notificationDate,
            };
        },
    );
}

function findStandardVoluntaryGap(
    file: ExecutionFile,
    primaryKey: string,
    isEviction: boolean,
): ExecutionVoluntaryGap | null {
    if (isEviction) return null;
    const debtorKeys = new Set<string>([primaryKey]);
    for (const d of file.debtors ?? []) {
        const key = String(d.id ?? d.partyId ?? '').trim();
        if (key) debtorKeys.add(key);
    }
    for (const key of Object.keys(file.execution_memo_anchor_date_by_debtor ?? {})) {
        if (key) debtorKeys.add(key);
    }

    const now = Date.now();
    for (const debtorKey of debtorKeys) {
        const notice = getDebtorNoticeStateForKey(file, debtorKey, primaryKey);
        if (!notice.memoAnchorDate || notice.voluntaryPeriodEndDeclared) continue;
        const anchorTs = parseYmdToTs(notice.memoAnchorDate);
        if (anchorTs == null) continue;
        const periodEndTs = anchorTs + VOLUNTARY_DAYS * DAY_MS;
        if (periodEndTs > now) continue;
        return {
            debtorKey,
            debtorLabel: resolveDebtorLabel(file, debtorKey),
            anchorDate: notice.memoAnchorDate,
            daysSincePeriodEnd: Math.floor((now - periodEndTs) / DAY_MS),
            isEviction: false,
        };
    }
    return null;
}

function findEvictionVoluntaryGap(file: ExecutionFile, primaryKey: string): ExecutionVoluntaryGap | null {
    const firstNotice = String(file.eviction_first_notice_date ?? '').trim();
    if (!firstNotice || file.eviction_voluntary_period_end_declared) return null;
    const anchorTs = parseYmdToTs(firstNotice);
    if (anchorTs == null) return null;
    const periodEndTs = anchorTs + VOLUNTARY_DAYS * DAY_MS;
    const now = Date.now();
    if (periodEndTs > now) return null;
    return {
        debtorKey: primaryKey,
        debtorLabel: resolveDebtorLabel(file, primaryKey),
        anchorDate: firstNotice,
        daysSincePeriodEnd: Math.floor((now - periodEndTs) / DAY_MS),
        isEviction: true,
    };
}

function scanActiveTimeline(events: TimelineEvent[] | undefined): {
    urgentDeadline: ExecutionAttentionSignals['urgentTimelineDeadline'];
    daysSinceLastAction: number | null;
} {
    const nowTs = Date.now();
    let urgentDeadline: ExecutionAttentionSignals['urgentTimelineDeadline'] = null;
    let latestActionTs: number | null = null;

    for (const event of events ?? []) {
        if (event.trashedAt) continue;
        const dateYmd = String(event.date ?? '').trim();
        const eventTs = parseYmdToTs(dateYmd) ?? (event.timestamp ? Date.parse(event.timestamp) : null);
        if (eventTs != null && !Number.isNaN(eventTs)) {
            if (latestActionTs == null || eventTs > latestActionTs) latestActionTs = eventTs;
        }

        const deadline = String(event.deadlineDate ?? '').trim();
        if (!deadline) continue;
        const deadlineTs = parseYmdToTs(deadline);
        if (deadlineTs == null) continue;
        const daysLeft = dayDiff(deadlineTs, nowTs);
        if (daysLeft < 0 || daysLeft > 14) continue;
        const title = String(event.title ?? event.type ?? 'مهلة في السجل').trim();
        if (
            !urgentDeadline ||
            daysLeft < urgentDeadline.daysLeft ||
            (daysLeft === urgentDeadline.daysLeft && deadline < urgentDeadline.deadlineDate)
        ) {
            urgentDeadline = { title, deadlineDate: deadline, daysLeft };
        }
    }

    const daysSinceLastAction =
        latestActionTs == null
            ? null
            : Math.floor((nowTs - latestActionTs) / DAY_MS);

    return { urgentDeadline, daysSinceLastAction };
}

function scanPublicationNearEnd(
    file: ExecutionFile,
    nowTs: number,
): ExecutionAttentionSignals['publicationNearEnd'] {
    const pubByDebtor = file.publication_notice_by_debtor ?? {};
    let best: ExecutionAttentionSignals['publicationNearEnd'] = null;
    for (const debtorKey of Object.keys(pubByDebtor)) {
        const entry = pubByDebtor[debtorKey] as { periodEndedAt?: string; publicationDateYmd?: string };
        if (entry?.periodEndedAt) continue;
        const startYmd = String(entry?.publicationDateYmd ?? '').trim();
        if (!startYmd) continue;
        const startTs = parseYmdToTs(startYmd);
        if (startTs == null) continue;
        const endTs = startTs + PUBLICATION_DAYS * DAY_MS;
        const daysLeft = dayDiff(endTs, nowTs);
        if (daysLeft < 0 || daysLeft > 5) continue;
        if (!best || daysLeft < best.daysLeft) {
            best = { debtorKey, daysLeft };
        }
    }
    return best;
}

function hasRecentCoerciveTimelineSignal(file: ExecutionFile, withinDays: number): boolean {
    const nowTs = Date.now();
    const coerciveHints = ['حجز', 'جبري', 'حبس', 'منع سفر', 'إخلاء', 'تبليغ بالنشر', 'coercive', 'seizure'];
    for (const event of file.timelineEvents ?? []) {
        if (event.trashedAt) continue;
        const blob = `${event.title ?? ''} ${event.type ?? ''} ${event.description ?? ''}`.toLowerCase();
        if (!coerciveHints.some((h) => blob.includes(h.toLowerCase()))) continue;
        const eventTs =
            parseYmdToTs(String(event.date ?? '').trim()) ??
            (event.timestamp ? Date.parse(event.timestamp) : null);
        if (eventTs == null || Number.isNaN(eventTs)) continue;
        const days = Math.floor((nowTs - eventTs) / DAY_MS);
        if (days <= withinDays) return true;
    }
    return false;
}

function hasRecentEvictionProcedureActivity(
    file: ExecutionFile,
    decisionsStorageExecutionId?: string,
): boolean {
    if (!decisionsStorageExecutionId) return false;
    const rows = readExecutorDecisionsUnionForExecution(
        decisionsStorageExecutionId,
        file as Record<string, unknown>,
    );
    return hasActiveEvictionProcedureDecisions(rows);
}

/** يستخرج إشارات السياق التنفيذي من الإضبارة — مصدر مشترك لسبارك */
export function deriveExecutionAttentionSignals(
    file: ExecutionFile,
    runtimeOverlay?: ExecutionSparkRuntimeOverlay,
    decisionsStorageExecutionId?: string,
): ExecutionAttentionSignals {
    const primaryKey = resolvePrimaryDebtorKey(file);
    const claimTypes = getEffectiveClaimTypes(file as Record<string, unknown>);
    const claimTypeLabel = claimTypes.join(' · ') || String(file.claimType ?? '').trim() || 'تنفيذ';
    const primaryClaim = claimTypes[0] ?? String(file.claimType ?? '');
    const moduleStrategy = getExecutionModuleStrategy(primaryClaim);
    const isEvictionModule = moduleStrategy.useEvictionFieldProcedures || isEvictionClaim(primaryClaim);
    const isAlimonyClaim = hasOngoingAlimonyInExecution(file as Record<string, unknown>, primaryClaim);
    const remainingDebt = resolveRemainingDebt(file);
    const notificationCount =
        runtimeOverlay?.notificationCount ??
        inferNotificationCount(file, primaryKey);
    const lifecycleStatus = normalizeDossierLifecycleStatus(file.dossier_lifecycle_status);
    const isPaused = Boolean(file.isPaused) || lifecycleStatus === 'paused' || lifecycleStatus === 'suspended';

    const debtorsForState = buildDebtorsForStateMachine(
        file,
        primaryKey,
        isEvictionModule,
        notificationCount,
    );
    const skipLegalGrace =
        isEvictionModule
            ? notificationCount >= 2
            : notificationCount >= 2 ||
              Boolean(file.notice_voluntary_period_end_declared);

    const master = calculateGlobalFileState(
        String(file.id ?? 'unknown'),
        debtorsForState,
        remainingDebt,
        isPaused,
        String(file.pauseReason ?? file.dossier_status_reason ?? '').trim() || undefined,
        isAlimonyClaim,
        Boolean(file.executionFeeAdded),
        new Date(),
        false,
        skipLegalGrace,
    );

    let globalStatus = master.globalStatus;
    if (isEvictionModule && remainingDebt > 0 && notificationCount < 2) {
        const hasNotif = Boolean(
            file.eviction_first_notice_date ||
                file.debtorNotificationDate ||
                debtorsForState[0]?.notificationDate,
        );
        if (hasNotif) {
            if (file.eviction_voluntary_period_end_declared) {
                globalStatus = 'READY_FOR_COERCIVE';
            } else if (globalStatus === 'READY_FOR_COERCIVE') {
                globalStatus = 'GRACE_PERIOD';
            }
        }
    } else if (!isEvictionModule && remainingDebt > 0 && notificationCount === 1) {
        const hasNotif = Boolean(file.debtorNotificationDate || debtorsForState[0]?.notificationDate);
        if (hasNotif) {
            if (file.notice_voluntary_period_end_declared) {
                globalStatus = 'READY_FOR_COERCIVE';
            } else if (globalStatus === 'READY_FOR_COERCIVE') {
                globalStatus = 'GRACE_PERIOD';
            }
        }
    }

    const primaryDebtorState =
        master.debtors.find((d) => d.debtorId === primaryKey) ?? master.debtors[0];
    const primaryNotice = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);

    const unnotifiedDebtorLabels = master.debtors
        .filter((d) => d.status === 'UNNOTIFIED')
        .map((d) => d.debtorName || 'مدين');

    const hasPrimaryNotification = Boolean(
        primaryNotice.notificationDate ||
            primaryNotice.memoAnchorDate ||
            file.debtorNotificationDate ||
            file.eviction_first_notice_date,
    );

    const showUnservedMemo =
        notificationCount === 0 &&
        !hasPrimaryNotification &&
        !file.notice_voluntary_period_end_declared &&
        !file.eviction_voluntary_period_end_declared;

    const noticeBundle = buildSubsequentNoticeSparkBundle(
        file,
        runtimeOverlay,
        decisionsStorageExecutionId,
    );

    const voluntaryEnded = isEvictionModule
        ? Boolean(
              file.eviction_voluntary_period_end_declared ||
                  runtimeOverlay?.voluntaryEndOptimistic,
          )
        : Boolean(
              file.notice_voluntary_period_end_declared ||
                  runtimeOverlay?.noticeVoluntaryPeriodEndOptimistic,
          );

    const forcedAttendanceIssued = Boolean(
        runtimeOverlay?.forcedAttendanceIssued ?? file.forcedAttendanceIssued,
    );
    const debtorAttendedVoluntarily = Boolean(
        runtimeOverlay?.debtorAttendedVoluntarily ?? file.debtorAttendedVoluntarily,
    );
    const summoningRound =
        runtimeOverlay?.summoningRound ??
        (Number(file.summoningRound ?? 0) || 0);
    const lawyerStartedPostNotice = Boolean(runtimeOverlay?.lawyerStartedPostNoticeExecution);

    const isEmployeeMonetaryPath = noticeBundle.debtorSummonsProfile === 'employee_monetary';
    const absenceEligible =
        (voluntaryEnded || (isEmployeeMonetaryPath && noticeBundle.subsequentNoticeUnlocked)) &&
        notificationCount === 1 &&
        !primaryNotice.absenceBadgeDismissed &&
        !Boolean(file.debtor_absence_badge_dismissed) &&
        !noticeBundle.anyExecutorDecisionResolvedForMemoBadge &&
        !noticeBundle.primaryDebtorTaklifActive &&
        !lawyerStartedPostNotice &&
        globalStatus === 'READY_FOR_COERCIVE';

    const absenceFollowupDue = absenceEligible;

    const subsequentSummonsDue =
        absenceEligible &&
        !isEmployeeMonetaryPath &&
        !noticeBundle.employeeFinancialSalaryOnlyCoercive &&
        summoningRound < 2 &&
        !forcedAttendanceIssued &&
        !debtorAttendedVoluntarily;

    const showDebtorSummonsAttendanceBadge =
        Boolean(noticeBundle.subsequentNoticeUnlocked) &&
        !noticeBundle.primaryDebtorTaklifActive &&
        !debtorAttendedVoluntarily &&
        !lawyerStartedPostNotice &&
        Boolean(
            file.debtor_summons_marker?.id ||
                (file as { debtor_summons_marker_by_debtor?: Record<string, { id?: string }> })
                    .debtor_summons_marker_by_debtor?.[primaryKey]?.id ||
                notificationCount >= 2,
        );

    const guar = file.guarantor_notification;
    const guarantorNoticePending = Boolean(
        guar &&
            String(guar.noticeDateYmd ?? '').trim() &&
            !guar.endedAt &&
            !guar.attendedAt,
    );

    const gracePeriodEndingSoon =
        globalStatus === 'GRACE_PERIOD' &&
        (primaryDebtorState?.daysRemaining ?? 0) > 0 &&
        (primaryDebtorState?.daysRemaining ?? 99) <= 2;

    const coerciveReadyUnresolved =
        globalStatus === 'READY_FOR_COERCIVE' &&
        remainingDebt > 0 &&
        lifecycleStatus === 'active' &&
        !hasRecentCoerciveTimelineSignal(file, 21) &&
        (!isEvictionModule || !hasRecentEvictionProcedureActivity(file, decisionsStorageExecutionId));

    const voluntaryPeriodGap = findStandardVoluntaryGap(file, primaryKey, isEvictionModule);
    const evictionVoluntaryGap = isEvictionModule
        ? findEvictionVoluntaryGap(file, primaryKey)
        : null;

    const nowTs = Date.now();
    const lastActionYmd =
        String(file.dossier_last_action_date ?? '').trim() ||
        String((file as { lastActionDate?: string }).lastActionDate ?? '').trim();
    let dormancyDaysSinceAction: number | null = null;
    const lastActionTs = parseYmdToTs(lastActionYmd);
    if (lastActionTs != null && lifecycleStatus === 'active') {
        const daysSince = Math.floor((nowTs - lastActionTs) / DAY_MS);
        if (daysSince >= DORMANCY_WARN_DAYS) dormancyDaysSinceAction = daysSince;
    }

    let stalePaymentDaysSince: number | null = null;
    const lastPay = String(file.lastPaymentDate ?? '').trim();
    const lastPayTs = parseYmdToTs(lastPay);
    if (remainingDebt > 0 && lifecycleStatus === 'active' && lastPayTs != null) {
        const daysSince = Math.floor((nowTs - lastPayTs) / DAY_MS);
        if (daysSince >= 60) stalePaymentDaysSince = daysSince;
    }

    const { urgentDeadline, daysSinceLastAction } = scanActiveTimeline(file.timelineEvents);
    const publicationNearEnd = scanPublicationNearEnd(file, nowTs);

    const pendingCaseTasks = (file.caseTasksPending ?? []).filter((t) => !t.trashedAt).length;

    return {
        claimTypes,
        claimTypeLabel,
        isEvictionModule,
        isAlimonyClaim,
        remainingDebt,
        notificationCount,
        lifecycleStatus,
        globalStatus,
        primaryDebtorKey: primaryKey,
        primaryDebtorLabel: resolveDebtorLabel(file, primaryKey),
        primaryDebtorStatus: primaryDebtorState?.status ?? globalStatus,
        primaryDebtorDaysRemaining: primaryDebtorState?.daysRemaining ?? 0,
        primaryNoticeState: primaryNotice.activeNoticeState,
        unnotifiedDebtorLabels,
        showUnservedMemo,
        absenceFollowupDue,
        subsequentSummonsDue,
        guarantorNoticePending,
        gracePeriodEndingSoon,
        coerciveReadyUnresolved,
        voluntaryPeriodGap,
        evictionVoluntaryGap,
        dormancyDaysSinceAction,
        stalePaymentDaysSince,
        publicationNearEnd,
        urgentTimelineDeadline: urgentDeadline,
        daysSinceLastTimelineAction: daysSinceLastAction,
        pendingCaseTasks,
        debtorSummonsProfile: noticeBundle.debtorSummonsProfile,
        subsequentNoticeUnlocked: noticeBundle.subsequentNoticeUnlocked,
        employeeFinancialSalaryOnlyCoercive: noticeBundle.employeeFinancialSalaryOnlyCoercive,
        primaryDebtorTaklifActive: noticeBundle.primaryDebtorTaklifActive,
        showEmployeeAssignmentCoerciveBlock: noticeBundle.showEmployeeAssignmentCoerciveBlock,
        anyExecutorDecisionResolvedForMemoBadge:
            noticeBundle.anyExecutorDecisionResolvedForMemoBadge,
        earnerForcedActionUnlocked: noticeBundle.earnerForcedActionUnlocked,
        employeeAssignmentTabEnabled: noticeBundle.employeeAssignmentTabEnabled,
        showDebtorSummonsAttendanceBadge,
    };
}
