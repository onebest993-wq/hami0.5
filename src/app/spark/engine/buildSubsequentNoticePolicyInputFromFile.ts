import type { ExecutionFile } from '@/app/types/execution';
import type { BuildSubsequentNoticePolicyInput } from '@/app/application/execution/followup/buildSubsequentNoticePolicy';
import { buildDebtorSummonsProfileBundle } from '@/app/application/execution/followup/buildDebtorSummonsProfileBundle';
import { buildFollowupDerivedState } from '@/app/application/execution/followup/buildFollowupDerivedState';
import { buildSubsequentNoticePolicy } from '@/app/application/execution/followup/buildSubsequentNoticePolicy';
import {
    getEffectiveClaimTypes,
    hasOngoingAlimonyInExecution,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    executionMonetaryStrictPath,
    isHybridFeesNonMonetaryPrincipal,
} from '@/app/utils/debtorSummonsProfile';
import {
    getExecutionModuleStrategy,
    isEvictionClaim,
} from '@/app/utils/executionModuleStrategies';
import { getDebtorNoticeStateForKey } from '@/app/utils/noticeDebtorScope';
import { isGracePeriodExpired } from '@/app/utils/executionStateMachine';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { hasApprovedUnifiedCollection } from '@/app/utils/executorDecisionReadQueries';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';

export type SubsequentNoticeSparkBundle = ReturnType<typeof buildSubsequentNoticePolicy> &
    ReturnType<typeof buildFollowupDerivedState> & {
        debtorSummonsProfile: string;
        followupDebtorSummonsProfile: string;
        isDebtorGovernmentEmployee: boolean;
    };

function resolvePrimaryDebtorKey(file: ExecutionFile): string {
    const d0 = file.debtors?.[0];
    return String(d0?.id ?? d0?.partyId ?? '0');
}

function resolvePrincipalDebtAmount(file: ExecutionFile): number {
    const debt = Number(file.debtAmount ?? file.totalAmount ?? 0);
    return Number.isFinite(debt) ? debt : 0;
}

function resolveLawyerFees(file: ExecutionFile): number {
    const fees = Number(file.lawyerFees ?? 0);
    return Number.isFinite(fees) ? fees : 0;
}

function resolveNotificationAnchor(file: ExecutionFile, primaryKey: string, isEviction: boolean): string | null {
    if (isEviction) {
        return (
            String(file.eviction_first_notice_date ?? '').trim() ||
            String(file.debtorNotificationDate ?? '').trim() ||
            null
        );
    }
    const notice = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
    return (
        String(notice.memoAnchorDate ?? '').trim() ||
        String(notice.notificationDate ?? '').trim() ||
        String(file.execution_memo_anchor_date ?? '').trim() ||
        String(file.debtorNotificationDate ?? '').trim() ||
        null
    );
}

function resolveNotificationCount(
    file: ExecutionFile,
    primaryKey: string,
    overlay?: ExecutionSparkRuntimeOverlay,
): number {
    if (typeof overlay?.notificationCount === 'number') return overlay.notificationCount;
    const stored = Number(file.notificationCount);
    if (Number.isFinite(stored) && stored >= 0) return stored;
    const notice = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
    if (notice.memoAnchorDate || notice.notificationDate) return 1;
    if (file.eviction_first_notice_date) return 1;
    return 0;
}

/**
 * يبني مدخلات سياسة التبليغ اللاحق من الإضبارة المخزّنة + overlay —
 * نفس مصدر الحقيقة الذي يعتمد عليه orchestrator دون فروع الـ hook اللحظية.
 */
export function buildSubsequentNoticeSparkBundle(
    file: ExecutionFile,
    runtimeOverlay?: ExecutionSparkRuntimeOverlay,
    decisionsStorageExecutionId?: string,
): SubsequentNoticeSparkBundle {
    const primaryKey = resolvePrimaryDebtorKey(file);
    const claimTypes = getEffectiveClaimTypes(file as Record<string, unknown>);
    const primaryClaim = claimTypes[0] ?? String(file.claimType ?? '');
    const moduleStrategy = getExecutionModuleStrategy(primaryClaim);
    const isEvictionExecutionModule =
        moduleStrategy.useEvictionFieldProcedures || isEvictionClaim(primaryClaim);
    const isAlimonyClaim = hasOngoingAlimonyInExecution(file as Record<string, unknown>, primaryClaim);
    const principalDebtAmount = resolvePrincipalDebtAmount(file);
    const parsedLawyerFees = resolveLawyerFees(file);
    const isNonFinancialClaim = principalDebtAmount <= 0 && parsedLawyerFees <= 0;

    const profileBundle = buildDebtorSummonsProfileBundle({
        debtors: file.debtors ?? [],
        principalDebtAmount,
        parsedLawyerFees,
        claimType: primaryClaim,
        isNonFinancialClaim,
        debtorBrowserTabsMode: false,
        activeWorkspaceDebtorForFollowup: null,
    });

    const notificationCount = resolveNotificationCount(file, primaryKey, runtimeOverlay);
    const anchor = resolveNotificationAnchor(file, primaryKey, isEvictionExecutionModule);
    const extraCalendarDays = 0;
    const isGracePeriodExpiredNow = anchor
        ? isGracePeriodExpired(anchor, new Date(), extraCalendarDays)
        : false;
    const isEvictionGraceExpiredNow = isEvictionExecutionModule ? isGracePeriodExpiredNow : false;
    const isEvictionGraceEffectivelyExpired = isEvictionGraceExpiredNow;

    const isHybridFeesNonMonetary = isHybridFeesNonMonetaryPrincipal({
        isNonFinancialClaim,
        parsedDebtAmount: principalDebtAmount,
        parsedLawyerFees,
    });
    const monetaryExecutionStrictPathFlag = executionMonetaryStrictPath({
        parsedDebtAmount: principalDebtAmount,
        parsedLawyerFees,
        isHybridFeesNonMonetary,
    });

    const activeCoerciveActions =
        runtimeOverlay?.activeCoerciveActions ??
        (Array.isArray(file.activeCoerciveActions)
            ? file.activeCoerciveActions.map((item) => String(item)).filter(Boolean)
            : []);

    const storageId = String(decisionsStorageExecutionId ?? file.id ?? '').trim();
    const unifiedCollectionApproved = hasApprovedUnifiedCollection(storageId || undefined);

    const policyInput: BuildSubsequentNoticePolicyInput = {
        debtorSummonsProfile: profileBundle.debtorSummonsProfile,
        followupDebtorSummonsProfile: profileBundle.followupDebtorSummonsProfile,
        isEvictionExecutionModule,
        isDebtorGovernmentEmployee: profileBundle.isDebtorGovernmentEmployee,
        isDebtorRetired: profileBundle.isDebtorRetired,
        followupIsDebtorGovernmentEmployee: profileBundle.followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired: profileBundle.followupIsDebtorRetired,
        unifiedCollectionApproved,
        notificationCount,
        forcedAttendanceIssued: Boolean(
            runtimeOverlay?.forcedAttendanceIssued ?? file.forcedAttendanceIssued,
        ),
        summoningRound:
            runtimeOverlay?.summoningRound ?? (Number(file.summoningRound ?? 0) || 0),
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily: Boolean(
            runtimeOverlay?.debtorAttendedVoluntarily ?? file.debtorAttendedVoluntarily,
        ),
        voluntaryAttendanceCount: Number(file.voluntaryAttendanceCount ?? 0) || 0,
        forcedPathAttendanceSecured: Boolean(file.forcedPathAttendanceSecured),
        debtorForcedToAttend: Boolean(file.debtorForcedToAttend),
        investigationMemoIssued: Boolean(
            runtimeOverlay?.investigationMemoIssued ?? file.investigationMemoIssued,
        ),
        debtorArrested: Boolean(runtimeOverlay?.debtorArrested ?? file.debtorArrested),
        executionExecutorCoerciveUnlock: Boolean(file.executor_coercive_unlock),
        executionNoticeVoluntaryPeriodEndDeclared: Boolean(file.notice_voluntary_period_end_declared),
        executionEvictionVoluntaryPeriodEndDeclared: Boolean(
            file.eviction_voluntary_period_end_declared,
        ),
        executionEvictionLastSummonsForCollection: file.eviction_last_summons_for_collection === true,
        executionEvictionLastCollectionSummonsBranch: String(
            file.eviction_last_collection_summons_branch ?? '',
        ),
        noticeVoluntaryPeriodEndOptimistic: Boolean(
            runtimeOverlay?.noticeVoluntaryPeriodEndOptimistic,
        ),
        voluntaryEndOptimistic: Boolean(runtimeOverlay?.voluntaryEndOptimistic),
        isEvictionGraceEffectivelyExpired,
        debtorNotifiedForEvictionGrace: Boolean(
            file.debtorNotificationDate ||
                file.eviction_first_notice_date ||
                file.debtors?.[0]?.notificationDate,
        ),
        activeCoerciveActions,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        activeDebtorIsDeceased: Boolean(file.debtors?.[0]?.isDeceased),
        debtorBrowserTabsMode: false,
        activeWorkspaceDebtorForFollowup: null,
        executionGarnishmentAmount: file.garnishmentAmount,
        perDebtorGarnishments: (file as Record<string, unknown>).per_debtor_garnishments as
            | Record<string, unknown>
            | undefined,
    };

    const policy = buildSubsequentNoticePolicy(policyInput);
    const executorDecisionRows = storageId ? readExecutorDecisionsArray(storageId) : [];
    const followup = buildFollowupDerivedState({
        executionData: file,
        primaryDebtorKeyResolved: primaryKey,
        unifiedSummonsTargetDebtorKey: primaryKey,
        executorDecisionRows,
    });

    return {
        ...policy,
        ...followup,
        debtorSummonsProfile: profileBundle.debtorSummonsProfile,
        followupDebtorSummonsProfile: profileBundle.followupDebtorSummonsProfile,
        isDebtorGovernmentEmployee: profileBundle.isDebtorGovernmentEmployee,
    };
}
