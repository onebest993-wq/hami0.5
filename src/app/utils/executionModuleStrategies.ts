/**
 * Config-driven execution module strategies.
 * Keeps «تخلية مأجور / تسليم عقار» isolated from standard financial enforcement UI.
 */

import type { TimelineEvent } from '@/app/types/execution';
import { calculateGracePeriodEndDate } from '@/app/utils/executionStateMachine';
import { isEvictionClaim } from '@/app/utils/isEvictionClaim';
export { isEvictionClaim } from '@/app/utils/isEvictionClaim';
export {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionEvictionActionIds';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionEvictionActionIds';

export type ExecutionModuleId = 'financial_standard' | 'eviction_hybrid';

export interface ExecutionModuleStrategy {
    id: ExecutionModuleId;
    /** استبدال شبكة الحجز المالي داخل «التنفيذ والمحجوزات» بإجراءات ميدانية */
    useEvictionFieldProcedures: boolean;
    /** إخفاء أدوات الحجز المالي (راتب، منع سفر، إلخ) للمطالبة الأساسية */
    hideStandardFinancialSeizureInTools: boolean;
}

/** تسليم شيء معين — مسار تسليم عيني قابل للتحول المالي */
export function isSpecificDeliveryClaim(claimType: string | undefined | null): boolean {
    const c = String(claimType || '').trim();
    return c === 'تسليم شيء معين' || (c.includes('تسليم') && c.includes('شيء'));
}

export type SpecificDeliveryItemNature = 'movable' | 'immovable';

export function resolveSpecificDeliveryItemNature(
    raw: string | undefined | null
): SpecificDeliveryItemNature | null {
    const v = String(raw || '').trim();
    if (v === 'movable' || v === 'منقول') return 'movable';
    if (v === 'immovable' || v === 'غير منقول') return 'immovable';
    return null;
}

export function specificDeliveryNatureLabelAr(
    nature: SpecificDeliveryItemNature | null | undefined
): string {
    if (nature === 'movable') return 'منقول';
    if (nature === 'immovable') return 'غير منقول';
    return '';
}

/** إزالة / رفع تجاوز — إجراءات ميدانية دون مسار التخلية أو الحجز المالي */
export function isEncroachmentRemovalClaim(claimType: string | undefined | null): boolean {
    const c = (claimType || '').trim();
    if (c === 'إزالة تجاوز') return true;
    return (
        (c.includes('إزالة') && c.includes('تجاوز')) ||
        c.includes('رفع تجاوز')
    );
}

export function getExecutionModuleStrategy(claimType: string | undefined | null): ExecutionModuleStrategy {
    if (isEvictionClaim(claimType)) {
        return {
            id: 'eviction_hybrid',
            useEvictionFieldProcedures: true,
            hideStandardFinancialSeizureInTools: true,
        };
    }
    return {
        id: 'financial_standard',
        useEvictionFieldProcedures: false,
        hideStandardFinancialSeizureInTools: false,
    };
}

export function hasEvictionTimelineAction(
    events: TimelineEvent[] | undefined,
    actionId: EvictionTimelineActionId
): boolean {
    if (!events?.length) return false;
    return events.some((e) => (e.metadata as { evictionActionId?: string } | undefined)?.evictionActionId === actionId);
}

export function hasEvictionHandoverRecorded(events: TimelineEvent[] | undefined): boolean {
    if (!events?.length) return false;
    return events.some(
        (e) =>
            (e.metadata as { evictionActionId?: string } | undefined)?.evictionActionId ===
                EVICTION_TIMELINE_ACTION_IDS.HANDOVER_FINAL ||
            (e.title && e.title.includes('محضر التخلية وتسليم العقار'))
    );
}

export type EvictionPremisesUse = 'commercial' | 'residential';

/** استنتاج نوع العقار للملفات القديمة */
export function inferEvictionPremisesUse(input: {
    explicit?: EvictionPremisesUse | null;
    propertyTypeText?: string | null;
}): EvictionPremisesUse {
    if (input.explicit === 'commercial' || input.explicit === 'residential') return input.explicit;
    const t = (input.propertyTypeText || '').toLowerCase();
    if (/تجاري|محل|معرض|مكتب\s*تجاري|دكان|بازار/.test(t)) return 'commercial';
    return 'residential';
}

/** آخر يوم مسموح لمهلة التخلية السكنية = نهاية مهلة الإخبار + 90 يوماً تقويمياً */
export function getResidentialVacateDeadlineMaxIso(
    notificationDateYmd: string,
    extraCalendarDays: number
): string {
    const end = calculateGracePeriodEndDate(notificationDateYmd, extraCalendarDays);
    if (Number.isNaN(end.getTime())) return '';
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0, 0);
    d.setDate(d.getDate() + 90);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function isVacateDeadlinePassed(deadlineYmd: string | null | undefined, now = new Date()): boolean {
    if (!deadlineYmd || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineYmd)) return false;
    const parts = deadlineYmd.split('-').map(Number);
    if (parts.length !== 3) return false;
    const [y, mo, d] = parts as [number, number, number];
    const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
    return now.getTime() > end.getTime();
}

/** قيمة مخزّنة — مطالبة نزع الحضانة (عرض: نزع حضانة) */
export const CUSTODY_REMOVAL_CLAIM_VALUE = 'تسليم ولد' as const;

export function isCustodyRemovalClaim(claimType: string | undefined | null): boolean {
    const c = String(claimType || '').trim();
    return c === CUSTODY_REMOVAL_CLAIM_VALUE || c.includes(CUSTODY_REMOVAL_CLAIM_VALUE);
}

/** عرض عربي لنوع المطالبة (إصلاح قيم مثل eviction) + تخلية حسب استعمال العقار */
export function formatClaimTypeArabic(
    claimType: string | undefined | null,
    premisesUse: EvictionPremisesUse
): string {
    const c = (claimType || '').trim();
    if (!c) return '—';
    const lower = c.toLowerCase();
    if (lower === 'eviction' || isEvictionClaim(c)) {
        return premisesUse === 'commercial' ? 'تخلية — محل تجاري' : 'تخلية — عقار سكني';
    }
    if (c === 'نفقة') return 'نفقة مستمرة';
    if (isCustodyRemovalClaim(c)) return 'نزع حضانة';
    return c;
}

/** هل سُجّل أي إجراء ميداني للتخلية (يفتح مسار التنفيذ ويُخفّي تنبيه المدين) */
export function hasAnyEvictionFieldStepRecorded(events: TimelineEvent[] | undefined): boolean {
    if (!events?.length) return false;
    return events.some(
        (e) =>
            e.type === 'eviction' &&
            Boolean((e.metadata as { evictionActionId?: string } | undefined)?.evictionActionId)
    );
}

export function getEvictionHybridClosureReadiness(input: {
    claimType: string | undefined | null;
    remainingBalance: number;
    timelineEvents: TimelineEvent[] | undefined;
}): { canClose: boolean; blockers: string[] } {
    if (!isEvictionClaim(input.claimType)) {
        return { canClose: true, blockers: [] };
    }
    /** أتعاب محكومة ورسوم لا تعني عدم اكتمال التخلية — لا نربط الإغلاق بالمتبقي في إدارة الأموال */
    void input.remainingBalance;
    void input.timelineEvents;
    return { canClose: true, blockers: [] };
}
