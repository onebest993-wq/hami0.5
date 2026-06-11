import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    adjacentExecutionTimelineFilter,
    filterExecutionTimelineEvents,
    matchesExecutionTimelineFilter,
    normalizeExecutionTimelineFilter,
    resolveExecutionTimelineFilterOptions,
} from '@/app/utils/timelineCategoryFilter';

const ev = (type: string, title = 'حدث'): TimelineEvent => ({
    id: `t_${type}`,
    date: '2026-06-05',
    title,
    type,
});

describe('timelineCategoryFilter', () => {
    it('maps appeal and settlement into their logical tabs', () => {
        expect(matchesExecutionTimelineFilter(ev('appeal'), 'قرارات ومحاضر')).toBe(true);
        expect(matchesExecutionTimelineFilter(ev('settlement'), 'حركة الأموال والرسوم')).toBe(true);
        expect(matchesExecutionTimelineFilter(ev('coercive'), 'محجوزات وتنفيذ جبري')).toBe(true);
        expect(matchesExecutionTimelineFilter(ev('decision'), 'قرارات ومحاضر')).toBe(true);
    });

    it('filters events by active tab', () => {
        const events = [ev('notification'), ev('appeal'), ev('payment'), ev('other')];
        const filtered = filterExecutionTimelineEvents(events, 'قرارات ومحاضر');
        expect(filtered.map((e) => e.type)).toEqual(['appeal']);
    });

    it('cycles adjacent filters in order', () => {
        expect(adjacentExecutionTimelineFilter('الكل', 1)).toBe('تبليغات وإخبار');
        expect(adjacentExecutionTimelineFilter('مستندات وملاحظات', 1)).toBe('الكل');
        expect(adjacentExecutionTimelineFilter('الكل', -1)).toBe('مستندات وملاحظات');
    });

    it('hides timeline categories when matching dossier sections are hidden', () => {
        const opts = resolveExecutionTimelineFilterOptions({
            hideDossierFinancialTools: true,
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
        });
        expect(opts).not.toContain('حركة الأموال والرسوم');
        expect(opts).not.toContain('محجوزات وتنفيذ جبري');
        expect(opts).toContain('تبليغات وإخبار');
        expect(normalizeExecutionTimelineFilter('حركة الأموال والرسوم', opts)).toBe('الكل');
    });

    it('hides coercive timeline tab for debtor agent natural person', () => {
        const opts = resolveExecutionTimelineFilterOptions({
            hideDossierFinancialTools: false,
            hidePersonalCoerciveFollowupTab: false,
            hideFollowupCoerciveTab: false,
            hideFollowupSeizureRequestsTab: false,
            hideCoerciveTimelineTab: true,
            showOtherPartyTimelineTab: true,
        });
        expect(opts).not.toContain('محجوزات وتنفيذ جبري');
        expect(opts).toContain('تحركات الطرف الآخر');
    });

    it('cycles only among visible timeline filters', () => {
        const opts = resolveExecutionTimelineFilterOptions({
            hideDossierFinancialTools: true,
            hidePersonalCoerciveFollowupTab: false,
            hideFollowupCoerciveTab: false,
            hideFollowupSeizureRequestsTab: false,
        });
        expect(adjacentExecutionTimelineFilter('مواعيد', 1, opts)).toBe('محجوزات وتنفيذ جبري');
        expect(adjacentExecutionTimelineFilter('مواعيد', -1, opts)).toBe('تبليغات وإخبار');
    });
});
