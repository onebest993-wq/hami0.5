/**
 * Config-driven execution module strategies.
 * Keeps «تخلية مأجور / تسليم عقار» isolated from standard financial enforcement UI.
 */

import type { TimelineEvent } from '@/app/types/execution';
import { calculateGracePeriodEndDate } from '@/app/utils/executionStateMachine';

export type ExecutionModuleId = 'financial_standard' | 'eviction_hybrid';

export interface ExecutionModuleStrategy {
    id: ExecutionModuleId;
    /** استبدال شبكة الحجز المالي داخل «التنفيذ والمحجوزات» بإجراءات ميدانية */
    useEvictionFieldProcedures: boolean;
    /** إخفاء أدوات الحجز المالي (راتب، منع سفر، إلخ) للمطالبة الأساسية */
    hideStandardFinancialSeizureInTools: boolean;
}

/** معرّفات ثابتة في metadata السجل الزمني */
export const EVICTION_TIMELINE_ACTION_IDS = {
    FIELD_VISIT: 'eviction_field_visit',
    POLICE_FORCE: 'eviction_police_force',
    BREAK_INVENTORY: 'eviction_break_inventory',
    CUSTODIAN: 'eviction_judicial_custodian',
    HANDOVER_FINAL: 'eviction_handover_final',
    /** إنهاء مهلة تخلية سكنية بموافقة المنفذ — يعيد دورة المهلة */
    RESIDENTIAL_GRACE_EARLY_END: 'eviction_residential_grace_early_end_executor',
    /** مذكرة إخبار بالتنفيذ لورثة المدين الشاغلين (تخلية) */
    HEIRS_EXECUTION_NOTICE_MEMO: 'eviction_heirs_execution_notice_memo',
} as const;

export type EvictionTimelineActionId =
    (typeof EVICTION_TIMELINE_ACTION_IDS)[keyof typeof EVICTION_TIMELINE_ACTION_IDS];

export function isEvictionClaim(claimType: string | undefined | null): boolean {
    const c = (claimType || '').trim();
    if (c === 'eviction') return true;
    return (
        c.includes('تخلية مأجور') ||
        c.includes('تسليم عقار') ||
        c.includes('تخلية') ||
        c.includes('إخلاء') ||
        c.toLowerCase().includes('eviction')
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
