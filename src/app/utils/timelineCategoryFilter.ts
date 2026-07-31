import type { TimelineEvent } from '@/app/types/execution';

/** تبويبات تصنيف السجل الزمني في لوحة التنفيذ */
export const EXECUTION_TIMELINE_FILTER_OPTIONS = [
    'الكل',
    'تبليغات وإخبار',
    'مواعيد',
    'حركة الأموال والرسوم',
    'محجوزات وتنفيذ جبري',
    'قرارات ومحاضر',
    'تحركات الطرف الآخر',
    'مستندات وملاحظات',
] as const;

export type ExecutionTimelineFilterLabel = (typeof EXECUTION_TIMELINE_FILTER_OPTIONS)[number];

/** تسميات مختصرة لشبكة التصفية على الشاشات الضيقة */
export const EXECUTION_TIMELINE_FILTER_SHORT_LABELS: Record<ExecutionTimelineFilterLabel, string> = {
    الكل: 'الكل',
    'تبليغات وإخبار': 'تبليغ',
    مواعيد: 'مواعيد',
    'حركة الأموال والرسوم': 'مالي',
    'محجوزات وتنفيذ جبري': 'حجز',
    'قرارات ومحاضر': 'قرارات',
    'تحركات الطرف الآخر': 'الطرف الآخر',
    'مستندات وملاحظات': 'ملاحظات',
};

export function executionTimelineFilterShortLabel(label: string): string {
    return (
        EXECUTION_TIMELINE_FILTER_SHORT_LABELS[label as ExecutionTimelineFilterLabel] ??
        label
    );
}

/** مزامنة مع إظهار/إخفاء أقسام لوحة التنفيذ */
export type ExecutionTimelineVisibilityContext = {
    hideDossierFinancialTools: boolean;
    hidePersonalCoerciveFollowupTab: boolean;
    hideFollowupCoerciveTab: boolean;
    hideFollowupSeizureRequestsTab: boolean;
    /** وكيل المدين — تبويب سجل تحركات الدائن في السجل الزمني */
    showOtherPartyTimelineTab?: boolean;
    /** إخفاء تبويب الجبري في السجل الزمني (مثلاً وكيل مدين طبيعي) */
    hideCoerciveTimelineTab?: boolean;
};

export function executionTimelineVisibilityFromFollowup(v: {
    hideDossierFinancialTools: boolean;
    hidePersonalCoerciveFollowupTab: boolean;
    hideFollowupCoerciveTab: boolean;
    hideFollowupSeizureRequestsTab: boolean;
    showOtherPartyTimelineTab?: boolean;
    hideCoerciveTimelineTab?: boolean;
}): ExecutionTimelineVisibilityContext {
    return {
        hideDossierFinancialTools: v.hideDossierFinancialTools,
        hidePersonalCoerciveFollowupTab: v.hidePersonalCoerciveFollowupTab,
        hideFollowupCoerciveTab: v.hideFollowupCoerciveTab,
        hideFollowupSeizureRequestsTab: v.hideFollowupSeizureRequestsTab,
        showOtherPartyTimelineTab: v.showOtherPartyTimelineTab,
        hideCoerciveTimelineTab: v.hideCoerciveTimelineTab,
    };
}

/** التبويبات الظاهرة — تُخفى تصنيفات الأقسام المخفية في الواجهة */
export function resolveExecutionTimelineFilterOptions(
    ctx: ExecutionTimelineVisibilityContext
): ExecutionTimelineFilterLabel[] {
    const hidden = new Set<string>();
    if (ctx.hideDossierFinancialTools) {
        hidden.add('حركة الأموال والرسوم');
    }
    const coerciveUiHidden =
        ctx.hidePersonalCoerciveFollowupTab &&
        ctx.hideFollowupCoerciveTab &&
        ctx.hideFollowupSeizureRequestsTab;
    if (coerciveUiHidden || ctx.hideCoerciveTimelineTab) {
        hidden.add('محجوزات وتنفيذ جبري');
    }
    if (!ctx.showOtherPartyTimelineTab) {
        hidden.add('تحركات الطرف الآخر');
    }
    return EXECUTION_TIMELINE_FILTER_OPTIONS.filter((label) => !hidden.has(label));
}

export function normalizeExecutionTimelineFilter(
    current: string,
    visibleOptions: readonly ExecutionTimelineFilterLabel[]
): ExecutionTimelineFilterLabel {
    if (visibleOptions.includes(current as ExecutionTimelineFilterLabel)) {
        return current as ExecutionTimelineFilterLabel;
    }
    return 'الكل';
}

/**
 * أنواع الأحداث لكل تبويب — كل نوع يُنتجه أي مسار في لوحة التنفيذ يجب أن
 * يملك تبويباً، وإلا اختفى الحدث من كل التصنيفات وبقي في «الكل» فقط:
 * - summons: تكليف بالحضور/تبليغات الموظف والمدين → تبليغات وإخبار
 * - action: حركات المركز المالي (فتح وعاء المطالبة…) → حركة الأموال والرسوم
 * - eviction: مهلة سكنية/استعانة بالشرطة (تخلية) → محجوزات وتنفيذ جبري
 * - communication/procedure: مخاطبات جهات ومحاضر إجرائية → قرارات ومحاضر
 */
export const EXECUTION_TIMELINE_FILTER_MAP: Record<
    Exclude<ExecutionTimelineFilterLabel, 'الكل'>,
    string[]
> = {
    'تبليغات وإخبار': ['notification', 'summons'],
    مواعيد: ['appointment'],
    'حركة الأموال والرسوم': ['payment', 'settlement', 'action'],
    'محجوزات وتنفيذ جبري': ['coercive', 'eviction'],
    'قرارات ومحاضر': ['decision', 'appeal', 'communication', 'procedure'],
    'تحركات الطرف الآخر': ['other_party'],
    'مستندات وملاحظات': ['other'],
};

const TYPE_TO_FILTER_LABEL: Record<string, ExecutionTimelineFilterLabel> = (() => {
    const map: Record<string, ExecutionTimelineFilterLabel> = {};
    for (const [label, types] of Object.entries(EXECUTION_TIMELINE_FILTER_MAP)) {
        for (const t of types) map[t] = label as ExecutionTimelineFilterLabel;
    }
    return map;
})();

/** عدّاد التبويبات بمسح واحد للأحداث — بدل إعادة الفلترة الكاملة لكل تصنيف */
export function countExecutionTimelineEventsByFilter(
    events: TimelineEvent[],
    visibleOptions: readonly ExecutionTimelineFilterLabel[]
): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const label of visibleOptions) counts[label] = 0;
    const countAll = 'الكل' in counts;
    for (const e of events) {
        if (countAll) counts['الكل'] += 1;
        const label = TYPE_TO_FILTER_LABEL[String(e.type ?? '').trim()];
        if (label !== undefined && label in counts) counts[label] += 1;
    }
    return counts;
}

export function matchesExecutionTimelineFilter(
    event: TimelineEvent,
    filterLabel: string
): boolean {
    if (filterLabel === 'الكل') return true;
    const types =
        EXECUTION_TIMELINE_FILTER_MAP[
            filterLabel as Exclude<ExecutionTimelineFilterLabel, 'الكل'>
        ];
    if (!types?.length) return false;
    const t = String(event.type ?? '').trim();
    return types.includes(t);
}

export function filterExecutionTimelineEvents(
    events: TimelineEvent[],
    filterLabel: string
): TimelineEvent[] {
    if (filterLabel === 'الكل') return events;
    return events.filter((e) => matchesExecutionTimelineFilter(e, filterLabel));
}

export function adjacentExecutionTimelineFilter(
    current: string,
    direction: -1 | 1,
    visibleOptions?: readonly ExecutionTimelineFilterLabel[]
): ExecutionTimelineFilterLabel {
    const opts = visibleOptions?.length
        ? [...visibleOptions]
        : [...EXECUTION_TIMELINE_FILTER_OPTIONS];
    const idx = Math.max(0, opts.indexOf(current as ExecutionTimelineFilterLabel));
    const base = idx >= 0 ? idx : 0;
    const next = (base + direction + opts.length) % opts.length;
    return opts[next]!;
}
