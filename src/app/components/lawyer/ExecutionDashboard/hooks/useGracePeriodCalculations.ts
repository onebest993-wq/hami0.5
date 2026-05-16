import { useMemo } from 'react';
import {
    calculateActualDaysElapsed,
    calculateDaysRemaining,
    isGracePeriodExpired,
} from '@/app/utils/executionStateMachine';

export function useGracePeriodCalculations(
    executionData: unknown,
    debtorNotificationDate: string | null,
    debtors: { notificationDate?: string | null }[],
    effectiveDebtors: { notificationDate?: string | null }[],
    isEvictionExecutionModule: boolean,
    notificationCount: number,
    manualGraceCalendarExtra: boolean,
    voluntaryEndOptimistic: boolean,
    noticeVoluntaryPeriodEndOptimistic: boolean,
) {
    const ed = executionData as Record<string, unknown> | null | undefined;

    /** مرساة احتساب 7 أيام (غير تخلية) أثناء دورة مذكرة الإخبار الأولى */
    const generalMemoGraceAnchor = useMemo(() => {
        if (isEvictionExecutionModule) return null;
        if (notificationCount !== 1) return null;
        if ((ed?.notice_voluntary_period_end_declared as boolean) || noticeVoluntaryPeriodEndOptimistic) {
            return null;
        }
        return (
            (ed?.execution_memo_anchor_date as string | undefined) ||
            (ed?.debtorNotificationDate as string | undefined) ||
            debtorNotificationDate ||
            (debtors[0] as { notificationDate?: string | null })?.notificationDate ||
            null
        );
    }, [
        isEvictionExecutionModule,
        notificationCount,
        ed?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        ed?.execution_memo_anchor_date,
        ed?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
    ]);

    /** حساب الأيام المنقضية بشكل صحيح (من اليوم التالي للتبليغ) */
    const daysSinceNoticeCalculated = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            (ed?.debtorNotificationDate as string | undefined) ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return 0;
        }

        return calculateActualDaysElapsed(savedNotificationDate, new Date());
    }, [
        generalMemoGraceAnchor,
        ed?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
    ]);

    /** حساب الأيام المتبقية في المهلة */
    const daysRemainingInGracePeriod = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            (ed?.debtorNotificationDate as string | undefined) ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return 7;
        }

        const extra = manualGraceCalendarExtra ? 1 : 0;
        return calculateDaysRemaining(savedNotificationDate, new Date(), extra);
    }, [
        generalMemoGraceAnchor,
        ed?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
    ]);

    /** التحقق من انتهاء المهلة */
    const isGracePeriodExpiredNow = useMemo(() => {
        const savedNotificationDate =
            generalMemoGraceAnchor ||
            (ed?.debtorNotificationDate as string | undefined) ||
            debtorNotificationDate ||
            debtors[0]?.notificationDate;

        if (!savedNotificationDate) {
            return false;
        }

        const extra = manualGraceCalendarExtra ? 1 : 0;
        return isGracePeriodExpired(savedNotificationDate, new Date(), extra);
    }, [
        generalMemoGraceAnchor,
        ed?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
    ]);

    /**
     * تخلية: مرساة المهلة — قبل إعلان انتهاء المدة الرضائية يدوياً: أول إخبار بالتنفيذ؛
     * بعد الإعلان: آخر تاريخ تبليغ مُسجَّل (لدورة تبليغ اعتيادي لاحقة).
     */
    const evictionGraceAnchorDate = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        const fromDebtor = effectiveDebtors[0]?.notificationDate;
        if (!(ed?.eviction_voluntary_period_end_declared as boolean)) {
            const anchor =
                (ed?.eviction_first_notice_date as string | undefined) ||
                (ed?.debtorNotificationDate as string | undefined) ||
                debtorNotificationDate ||
                fromDebtor ||
                null;
            return anchor ? String(anchor) : null;
        }
        const anchor =
            (ed?.debtorNotificationDate as string | undefined) ||
            debtorNotificationDate ||
            (ed?.eviction_first_notice_date as string | undefined) ||
            fromDebtor ||
            null;
        return anchor ? String(anchor) : null;
    }, [
        isEvictionExecutionModule,
        ed?.eviction_voluntary_period_end_declared,
        ed?.eviction_first_notice_date,
        ed?.debtorNotificationDate,
        debtorNotificationDate,
        effectiveDebtors,
    ]);

    /** انتهاء تقويمي (7 أيام من اليوم التالي لتاريخ الإخبار) — لإظهار زر الإعلان اليدوي فقط */
    const isEvictionGraceExpiredCalendar = useMemo(() => {
        if (!evictionGraceAnchorDate) return false;
        return isGracePeriodExpired(evictionGraceAnchorDate, new Date(), 0);
    }, [evictionGraceAnchorDate]);

    /** ما يدخل مسار التبليغ اللاحق والإكراه في التخلية — بعد ضغط المحامي على «انتهاء مدة التنفيذ الرضائي» */
    const isEvictionGraceEffectivelyExpired = Boolean(
        (ed?.eviction_voluntary_period_end_declared as boolean) || voluntaryEndOptimistic
    );

    const daysRemainingInEvictionGrace = useMemo(() => {
        if (!evictionGraceAnchorDate) return 7;
        if (isEvictionGraceEffectivelyExpired) return 0;
        return calculateDaysRemaining(evictionGraceAnchorDate, new Date(), 0);
    }, [evictionGraceAnchorDate, isEvictionGraceEffectivelyExpired]);

    const isEvictionGraceExpiredNow = isEvictionGraceEffectivelyExpired;

    return {
        generalMemoGraceAnchor,
        daysSinceNoticeCalculated,
        daysRemainingInGracePeriod,
        isGracePeriodExpiredNow,
        evictionGraceAnchorDate,
        isEvictionGraceExpiredCalendar,
        isEvictionGraceEffectivelyExpired,
        daysRemainingInEvictionGrace,
        isEvictionGraceExpiredNow,
    };
}
