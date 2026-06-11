import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import {
    canBeForcefullySummoned,
    deriveEmploymentType,
    deriveMonetaryClaimNature,
} from '@/app/utils/summoningImmunityEngine';

export function useForcedSummoningAndFees(
    executionData: ExecutionFile | null | undefined,
    effectiveDebtors: Debtor[],
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { d: Debtor; isPrimary?: boolean } | null,
    isEvictionExecutionModule: boolean,
    evictionGraceAnchorDate: string | null,
    debtorNotificationDate: string | null,
    activeTimelineEventsDebtorScoped: { title?: string; description?: string }[],
    debtorAttendedVoluntarily: boolean,
    voluntaryAttendanceCount: number,
    claimType: string | undefined,
    isAlimonyClaim: boolean,
    monetaryStrictForSummoningEngine: boolean,
    forcedAttendanceIssued: boolean,
    manualGraceCalendarExtra: boolean,
    notificationCount: number,
    voluntaryEndOptimistic: boolean,
    initiator: string | undefined,
    daysSinceNoticeCalculated: number,
    paidDebt: number,
    totalOwed: number,
    parsedCourtFees: number,
    principalDebtAmount: number,
    paidCourtFees: number,
    paidDirectorateFees: number,
    paidClientFees: number,
) {
    const forcedSummoningAnalysis = useMemo(() => {
        const d0 = (
            debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                ? activeWorkspaceDebtorForFollowup.d
                : effectiveDebtors[0]
        ) as Debtor & { employmentType?: 'موظف' | 'كاسب'; hasGuarantor?: boolean };
        const notificationDateForSummoning =
            isEvictionExecutionModule && evictionGraceAnchorDate
                ? evictionGraceAnchorDate
                : executionData?.debtorNotificationDate ?? debtorNotificationDate ?? d0?.notificationDate ?? null;

        const timelineForAttendance = activeTimelineEventsDebtorScoped;
        const hasAttendanceHistorySummoning =
            debtorAttendedVoluntarily ||
            voluntaryAttendanceCount > 0 ||
            timelineForAttendance.some(
                (e) =>
                    (e.title && /حضور/.test(e.title)) ||
                    (e.description && /حضور المدين/.test(e.description || ''))
            );

        const employmentType = deriveEmploymentType(d0?.occupation, d0?.employmentType ?? null);
        const claimNature = deriveMonetaryClaimNature(claimType, executionData?.summoningClaimNature ?? null);
        const isAlimonyExec =
            typeof executionData?.isAlimony === 'boolean' ? executionData.isAlimony : isAlimonyClaim;
        const salaryCoversAlimony = executionData?.salaryCoversAlimony === true;
        const hasG =
            executionData?.hasGuarantor === true ||
            d0?.hasGuarantor === true ||
            (typeof executionData?.executionTarget === 'string' && executionData.executionTarget.includes('كفيل'));

        const raw = canBeForcefullySummoned({
            notificationDate: notificationDateForSummoning,
            employmentType,
            claimNature,
            isAlimony: isAlimonyExec,
            salaryCoversAlimony,
            hasGuarantor: hasG,
            hasAttendanceHistory: hasAttendanceHistorySummoning,
            forcedAttendanceIssued,
            graceExtraCalendarDays:
                isEvictionExecutionModule ? 0 : manualGraceCalendarExtra ? 1 : 0,
            monetaryExecutionStrict: monetaryStrictForSummoningEngine,
        });
        if (
            isEvictionExecutionModule &&
            notificationCount === 1 &&
            !(executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) &&
            raw.canForceSummon
        ) {
            return {
                ...raw,
                canForceSummon: false,
                lockReasonAr:
                    'أعلِن «انتهاء مدة التنفيذ الرضائي» من «التبليغ» بعد انتهاء المدة التقويمية من تاريخ التبليغ المُسجَّل.',
                calendarGateOpen: false,
            };
        }
        return raw;
    }, [
        effectiveDebtors,
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData?.debtorNotificationDate,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        notificationCount,
        debtorNotificationDate,
        claimType,
        executionData?.summoningClaimNature,
        executionData?.isAlimony,
        executionData?.salaryCoversAlimony,
        executionData?.hasGuarantor,
        executionData?.executionTarget,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        debtorAttendedVoluntarily,
        activeTimelineEventsDebtorScoped,
        forcedAttendanceIssued,
        manualGraceCalendarExtra,
        voluntaryAttendanceCount,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
    ]);

    const shouldCalculateExecutionFeeBase =
        initiator === 'الدائن' && daysSinceNoticeCalculated > 7 && paidDebt < totalOwed;
    const shouldCalculateExecutionFee =
        shouldCalculateExecutionFeeBase &&
        (!isEvictionExecutionModule || Boolean(executionData?.eviction_lawyer_fee_requested));
    const calculatedExecutionFee = shouldCalculateExecutionFee ? (principalDebtAmount + parsedCourtFees) * 0.03 : 0;
    const totalWithExecutionFee = totalOwed + calculatedExecutionFee;
    const remaining = totalWithExecutionFee - (paidDebt + paidCourtFees + paidDirectorateFees + paidClientFees);
    const isInBreach = (daysSinceNoticeCalculated > 7 && paidDebt === 0) || remaining > 0;

    return {
        forcedSummoningAnalysis,
        shouldCalculateExecutionFee,
        calculatedExecutionFee,
        totalWithExecutionFee,
        remaining,
        isInBreach,
    };
}
