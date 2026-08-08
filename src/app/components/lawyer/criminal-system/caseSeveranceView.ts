import type { JourneyNode, SeveranceReason } from '@/app/types/criminal';
import type { TimelineEvent } from './criminalCaseModel';
import type { CriminalCase, Statement } from './criminalStore';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { buildInitialStageJourney } from './stageJourney';
import { parseEventDateKey } from './stageJourney';

export type { SeveranceReason } from '@/app/types/criminal';

/** خيارات قائمة «سبب التفريق» في نموذج شطر الإضبارة. */
export const SEVERANCE_REASON_SELECT_OPTIONS: ReadonlyArray<{
    value: Exclude<SeveranceReason, 'distinct_acts' | 'distinct_times_places'>;
    label: string;
}> = [
    { value: 'juvenile_mixed_with_adult', label: 'وجود متهم حدث مع بالغ في الدعوى' },
    { value: 'defendant_absconding', label: 'هروب بعض المتهمين' },
    { value: 'unrelated_crimes_or_acts', label: 'عدم الارتباط بين الجرائم أو الأفعال' },
    { value: 'court_type_jurisdiction', label: 'اختلاف اختصاص المحكمة النوعي' },
    { value: 'death_or_amnesty', label: 'وفاة أو شمول أحد المتهمين بالعفو' },
    { value: 'justice_interests', label: 'مقتضيات حسن سير العدالة' },
    { value: 'other', label: 'أخرى (إدخال يدوي...)' },
];

const VALID_SEVERANCE_REASONS = new Set<SeveranceReason>([
    ...SEVERANCE_REASON_SELECT_OPTIONS.map((o) => o.value),
    'distinct_acts',
    'distinct_times_places',
]);

export function isSeveranceReasonValue(value: string): value is SeveranceReason {
    return VALID_SEVERANCE_REASONS.has(value as SeveranceReason);
}

export function severanceReasonLabel(reason: SeveranceReason, detail?: string): string {
    if (reason === 'other') {
        const trimmed = String(detail ?? '').trim();
        return trimmed || 'أخرى';
    }
    const match = SEVERANCE_REASON_SELECT_OPTIONS.find((o) => o.value === reason);
    if (match) return match.label;
    if (reason === 'distinct_acts') return 'اختلاف الأفعال';
    if (reason === 'distinct_times_places') return 'اختلاف زمان ومكان الجريمة';
    return '—';
}

export function isAbscondingSeverance(reason: SeveranceReason | undefined): boolean {
    return reason === 'defendant_absconding';
}

function eventOnOrBeforeCutoff(itemDate: string, cutoff: string): boolean {
    const cut = parseEventDateKey(cutoff);
    const t = parseEventDateKey(itemDate);
    if (!cut) return true;
    return t <= cut;
}

export function filterInheritedTimelineEvents(
    parentEvents: TimelineEvent[],
    severedAt: string,
): TimelineEvent[] {
    const list = Array.isArray(parentEvents) ? parentEvents : [];
    const cutoff = String(severedAt ?? '').trim();
    return list.filter((ev) => eventOnOrBeforeCutoff(String(ev.date ?? ''), cutoff));
}

export function filterInheritedStatements(parentStatements: Statement[], severedAt: string): Statement[] {
    const list = Array.isArray(parentStatements) ? parentStatements : [];
    const cutoff = String(severedAt ?? '').trim();
    return list.filter((st) => eventOnOrBeforeCutoff(String(st.date ?? ''), cutoff));
}

/** مسار إجرائي للإضبارة الابنة المفرّقة بحق هارب. */
export function buildAbscondingSeveranceJourney(severedAt: string): JourneyNode[] {
    const at = String(severedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    return [
        {
            id: '1',
            stage: 'investigation',
            label: 'مرحلة التحقيق (ما قبل التفريق)',
            status: 'past',
            startedAt: at,
            endedAt: at,
            transitionText: 'تفريق دعوى — استمرار بحق هارب',
            transitionKind: 'parallel_fork',
        },
        {
            id: '2',
            stage: 'evading_arrest',
            label: 'تخفي / هروب — نشر وتعقب',
            status: 'past',
            startedAt: at,
            endedAt: at,
            transitionText: 'إجراءات النشر والبحث',
            transitionKind: 'backward_reversal',
        },
        {
            id: '3',
            stage: 'absentia_trial',
            label: 'محاكمة غيابية',
            status: 'current',
            startedAt: at,
            transitionText: 'مسار غيابي — توثيق النشر والقبض',
            transitionKind: 'forward_referral',
        },
    ];
}

export function buildSubstantiveSeveranceJourney(): JourneyNode[] {
    return buildInitialStageJourney();
}

export function buildSeveredChildStageJourney(reason: SeveranceReason, severedAt: string): JourneyNode[] {
    if (reason === 'defendant_absconding') return buildAbscondingSeveranceJourney(severedAt);
    return buildSubstantiveSeveranceJourney();
}

export function severanceBannerText(
    child: CriminalCase,
    parent: CriminalCase | undefined,
): string {
    const parentNum = resolveOfficialCaseNumber(parent) || '—';
    const reason = child.severanceReason;
    if (isAbscondingSeverance(reason)) {
        return `⚠️ إضبارة فرعية مفرّقة غيابية بحق متهم هارب عن الإضبارة الأم رقم: ${parentNum}`;
    }
    if (!reason) {
        return `🔗 إضبارة مفرّقة من إضبارة سابقة رقم: ${parentNum}`;
    }
    const reasonText = severanceReasonLabel(reason, child.severanceReasonDetail);
    return `⚖️ إضبارة فرعية مفرّقة عادية لمتهم حاضر بسبب ${reasonText} عن الإضبارة الأم رقم: ${parentNum}`;
}

/**
 * عرض الإضبارة الابنة بعد التفريق باستقلال كامل عن الإضبارة الأم.
 * لا نُورّث أي حقول من الأم (أطراف/موقع/مادة/مسار) لمنع أي تسريب بين الإضباريْن.
 */
export function materializeSeveredChildView(
    _parent: CriminalCase,
    child: CriminalCase,
): CriminalCase & { _inheritedTimelineIds?: Set<string> } {
    return {
        ...child,
        timelineEvents: Array.isArray(child.timelineEvents) ? child.timelineEvents : [],
        statements: Array.isArray(child.statements) ? child.statements : [],
        _inheritedTimelineIds: new Set<string>(),
    };
}

export function resolveCriminalCaseForDisplay(
    raw: CriminalCase | null | undefined,
    casesById: Record<string, CriminalCase | undefined>,
): CriminalCase | null {
    if (!raw) return null;
    if (!raw.isSeveredChild || !String(raw.parentCaseId ?? '').trim()) return raw;
    const parent = casesById[String(raw.parentCaseId)];
    if (!parent) return raw;
    return materializeSeveredChildView(parent, raw);
}

export function isInheritedTimelineEvent(
    eventId: string,
    displayCase: CriminalCase & { _inheritedTimelineIds?: Set<string> },
): boolean {
    return Boolean(displayCase._inheritedTimelineIds?.has(eventId));
}
