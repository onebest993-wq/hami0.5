import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearLawsuitArchivePerfMarks,
    getLawsuitArchivePerfSnapshot,
    getLawsuitArchivePhaseDeltaMs,
    getLawsuitZoneSwitchDeltaMs,
    markLawsuitArchivePerf,
    reportLawsuitArchivePerf,
} from '@/app/services/alerts/lawsuitArchivePerfMetrics';

vi.mock('@/app/utils/debug', () => ({
    debug: {
        log: vi.fn(),
    },
}));

import { debug } from '@/app/utils/debug';

describe('lawsuitArchivePerfMetrics', () => {
    beforeEach(() => {
        clearLawsuitArchivePerfMarks();
        if (typeof performance !== 'undefined') {
            performance.clearMarks();
            performance.clearMeasures();
        }
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('يحسب الفرق بين المراحل (open -> keys-ready / hydrate / interactive)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:keys-warm-start') {
                return [{ startTime: 1080 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:keys-ready') {
                return [{ startTime: 1320 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:hydrate-done') {
                return [{ startTime: 1750 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:interactive') {
                return [{ startTime: 1920 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markLawsuitArchivePerf('open-request');
        markLawsuitArchivePerf('keys-warm-start');
        markLawsuitArchivePerf('keys-ready');
        markLawsuitArchivePerf('hydrate-done');
        markLawsuitArchivePerf('interactive');

        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'keys-ready')).toBe(320);
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'hydrate-done')).toBe(750);
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBe(920);
        expect(getLawsuitArchivePhaseDeltaMs('keys-warm-start', 'keys-ready')).toBe(240);

        const snap = getLawsuitArchivePerfSnapshot();
        expect(snap.openToKeysReadyMs).toBe(320);
        expect(snap.openToHydrateMs).toBe(750);
        expect(snap.openToInteractiveMs).toBe(920);
        expect(snap.keysWarmDurationMs).toBe(240);
    });

    it('يرجع null عندما لا تكون هناك علامات أداء (perf marks)', () => {
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBeNull();
        const snap = getLawsuitArchivePerfSnapshot();
        expect(snap.openToKeysReadyMs).toBeNull();
        expect(snap.openToHydrateMs).toBeNull();
        expect(snap.openToInteractiveMs).toBeNull();
        expect(snap.keysWarmDurationMs).toBeNull();
    });

    it('يستخدم آخر علامة أداء (latest mark) عند تعدد مرات الفتح في الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:open-request') {
                return [{ startTime: 1000 }, { startTime: 5000 }, { startTime: 9200 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:interactive') {
                return [{ startTime: 1920 }, { startTime: 5710 }, { startTime: 9850 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBe(650);
    });

    it('reportLawsuitArchivePerf يفعّل الـ latch مرة واحدة ويتم إعادة تهيئته عبر clearLawsuitArchivePerfMarks', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:interactive') {
                return [{ startTime: 1600 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportLawsuitArchivePerf();
        reportLawsuitArchivePerf();
        reportLawsuitArchivePerf();

        expect(debug.log).toHaveBeenCalledTimes(1);
        expect(debug.log).toHaveBeenCalledWith('[LawsuitArchivePerf]', {
            openToKeysReadyMs: null,
            openToHydrateMs: null,
            openToInteractiveMs: 600,
            keysWarmDurationMs: null,
        });

        clearLawsuitArchivePerfMarks();

        reportLawsuitArchivePerf();

        expect(debug.log).toHaveBeenCalledTimes(2);
    });

    it('TR-3.4 A1: يرجع null عندما لا توجد علامات أداء أصلاً (no marks at all)', () => {
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBeNull();
        expect(getLawsuitZoneSwitchDeltaMs()).toBeNull();
        expect(getLawsuitArchivePerfSnapshot().openToInteractiveMs).toBeNull();
    });

    it('TR-3.4 A2: يرجع null عندما توجد علامة بداية فقط بدون علامة نهاية (start mark only)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:open-request') return [{ startTime: 1000 }] as PerformanceEntryList;
            if (name === 'hami:lawsuit-archive:zone-request') return [{ startTime: 2000 }] as PerformanceEntryList;
            return [] as PerformanceEntryList;
        });
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBeNull();
        expect(getLawsuitZoneSwitchDeltaMs()).toBeNull();
    });

    it('TR-3.4 B1: يرجع null عند علامات زمنية عكسية (reversed end < start) قبل Math.round', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:open-request') return [{ startTime: 2000 }] as PerformanceEntryList;
            if (name === 'hami:lawsuit-archive:interactive') return [{ startTime: 1000 }] as PerformanceEntryList;
            if (name === 'hami:lawsuit-archive:zone-request') return [{ startTime: 3000 }] as PerformanceEntryList;
            if (name === 'hami:lawsuit-archive:zone-switched') return [{ startTime: 1500 }] as PerformanceEntryList;
            return [] as PerformanceEntryList;
        });
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'interactive')).toBeNull();
        expect(getLawsuitZoneSwitchDeltaMs()).toBeNull();
    });

    it('TR-3.4 B2: يرجع null بشكل آمن عندما تكون performance API في وضع متدهور (empty arrays)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation(() => [] as unknown as PerformanceEntryList);
        expect(getLawsuitArchivePhaseDeltaMs('open-request', 'keys-ready')).toBeNull();
        expect(getLawsuitZoneSwitchDeltaMs()).toBeNull();
        const snap = getLawsuitArchivePerfSnapshot();
        expect(snap.openToKeysReadyMs).toBeNull();
        expect(snap.openToHydrateMs).toBeNull();
        expect(snap.openToInteractiveMs).toBeNull();
        expect(snap.keysWarmDurationMs).toBeNull();
    });

    it('TR-3.4 B3: zone-switch يرجع null عند نقص علامة واحدة من العلامتين الرسميتين', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:zone-switched') return [{ startTime: 5000 }] as PerformanceEntryList;
            return [] as PerformanceEntryList;
        });
        expect(getLawsuitZoneSwitchDeltaMs()).toBeNull();
    });

    it('CR-7 zone-switch يحسب آخر علامة (latest mark) من zone-request → zone-switched بشكل صحيح', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:lawsuit-archive:zone-request') {
                return [{ startTime: 100 }, { startTime: 8000 }, { startTime: 15000 }] as PerformanceEntryList;
            }
            if (name === 'hami:lawsuit-archive:zone-switched') {
                return [{ startTime: 150 }, { startTime: 8120 }, { startTime: 15440 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getLawsuitZoneSwitchDeltaMs()).toBe(440);
    });
});
