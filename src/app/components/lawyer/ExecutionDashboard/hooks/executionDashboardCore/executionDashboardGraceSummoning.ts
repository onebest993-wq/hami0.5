import {
    formatDateToLocalYmd,
    getLocalTodayYmd,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import type { TimelineEvent } from '@/app/types/execution';

/** يُرجع تاريخ تبليغ مُجبَر بما يعادل 8+ أيام مضت (لإعلان انتهاء المهلة يدوياً) */
export function computeForcedDebtorNotificationYmd(
    debtorNotificationDate: string | null | undefined,
    reference = new Date(),
): string {
    const notificationDate = debtorNotificationDate
        ? parseLocalNotificationDate(debtorNotificationDate)
        : reference;
    const forcedDate = new Date(notificationDate.getTime());
    forcedDate.setDate(forcedDate.getDate() - 8);
    return formatDateToLocalYmd(forcedDate);
}

export function buildExecutionFeeGraceEndEvent(
    calculatedExecutionFee: number,
    eventIdSuffix: string | number = Date.now(),
): TimelineEvent {
    const today = getLocalTodayYmd();
    const nowIso = new Date().toISOString();
    return {
        id: `fee_end_grace_${eventIdSuffix}`,
        date: today,
        timestamp: nowIso,
        title: '💰 تطبيق رسم التحصيل 3%',
        description: `تم احتساب وإضافة رسم التحصيل البالغ ${calculatedExecutionFee.toLocaleString('ar-IQ')} دينار عراقي (3% من أصل الدين والرسوم القضائية) بسبب إعلان انتهاء المهلة القانونية`,
        type: 'payment',
    };
}

export function buildGracePeriodEndedTimelineEvent(
    eventIdSuffix: string | number = Date.now(),
): TimelineEvent {
    const today = getLocalTodayYmd();
    const nowIso = new Date().toISOString();
    return {
        id: `grace_end_${eventIdSuffix}`,
        date: today,
        timestamp: nowIso,
        title: '🚨 إعلان انتهاء المهلة القانونية',
        description:
            'تم إعلان انتهاء المهلة القانونية البالغة 7 أيام وتفعيل الإجراءات الجبرية. جميع أدوات التنفيذ الجبري (حجز الراتب، الحجز العقاري، طلب الحبس) أصبحت متاحة الآن.',
        type: 'coercive',
    };
}

export function buildEndGracePeriodMergePatch(
    executionFeeInjected: boolean,
    calculatedExecutionFee: number,
): {
    mergePatch: Record<string, unknown>;
    injectExecutionFee: boolean;
    feeEvent: TimelineEvent | null;
} {
    const mergePatch: Record<string, unknown> = {
        gracePeriodEnded: true,
        gracePeriodActive: false,
    };
    const injectExecutionFee = !executionFeeInjected && calculatedExecutionFee > 0;
    if (injectExecutionFee) {
        mergePatch.executionFeeInjected = true;
    }
    return {
        mergePatch,
        injectExecutionFee,
        feeEvent: injectExecutionFee ? buildExecutionFeeGraceEndEvent(calculatedExecutionFee) : null,
    };
}
