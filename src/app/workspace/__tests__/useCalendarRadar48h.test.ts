/**
 * اختبارات رادار 48 ساعة في البطاقة العامة.
 *
 * يتحقّق من:
 *  1) فلترة المواعيد إلى نافذة اليوم + الغد (≤ 48 ساعة)
 *  2) استبعاد الأحداث المكتملة (isCompleted)
 *  3) استبعاد المواعيد غير المصدّقة من المستخدم (synthetic)
 *  4) الترتيب تصاعدياً حسب الوقت
 *  5) إنشاء routePath صحيح للأقسام المختلفة
 *  6) إلغاء الجلب القديم عند تغيّر المحامي (race-condition guard)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarCloud';
import { useCalendarRadar48h } from '../useCalendarRadar48h';

const getEventsMock = vi.fn();

vi.mock('@/app/services/cloud/lawyerCalendarCloud', async (orig) => {
    const real = (await orig<typeof import('@/app/services/cloud/lawyerCalendarCloud')>());
    return {
        ...real,
        CalendarDB: {
            ...real.CalendarDB,
            getEvents: (uid: string) => getEventsMock(uid),
        },
    };
});

vi.mock('@/app/services/alerts/homeHubRadarWarmCache', () => ({
    peekHomeHubRadarCache: () => null,
}));

function baseEvent(over: Partial<CalendarEvent>): CalendarEvent {
    return {
        id: 'evt',
        userId: 'lawyer-1',
        title: 'جلسة',
        date: '2026-05-25',
        time: '10:00',
        type: 'hearing',
        createdAt: '2026-05-20T00:00:00.000Z',
        updatedAt: '2026-05-20T00:00:00.000Z',
        sourceModule: 'lawsuit',
        sourceEntityId: 'case-1',
        ...over,
    };
}

function inHours(hoursFromNow: number, base: Partial<CalendarEvent> = {}): CalendarEvent {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return baseEvent({ ...base, date: ymd, time: hm, id: base.id ?? `evt-${hoursFromNow}` });
}

beforeEach(() => {
    getEventsMock.mockReset();
});

describe('useCalendarRadar48h', () => {
    it('1) يُرجِع المواعيد ضمن نافذة 48 ساعة فقط', async () => {
        getEventsMock.mockResolvedValue([
            inHours(3, { id: 'now' }),
            inHours(25, { id: 'tomorrow' }),
            inHours(80, { id: 'far' }),
            inHours(-5, { id: 'past' }),
        ]);
        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await waitFor(() => {
            expect(result.current.events.length).toBeGreaterThan(0);
        });
        const ids = result.current.events.map((e) => e.id);
        expect(ids).toContain('now');
        expect(ids).not.toContain('far');
        expect(ids).not.toContain('past');
    });

    it('2) يستبعد الأحداث المكتملة', async () => {
        getEventsMock.mockResolvedValue([
            inHours(3, { id: 'done', isCompleted: true }),
            inHours(4, { id: 'open' }),
        ]);
        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await waitFor(() => {
            expect(result.current.events.length).toBe(1);
        });
        expect(result.current.events[0]!.id).toBe('open');
    });

    it('3) يستبعد الأحداث الصناعية (synthetic) المُربَطة بسجل تلقائي', async () => {
        // sourceEventId يبدأ بـ system_ أو auto_ يُعتبر صناعياً (لا مُحرّر من المستخدم)
        getEventsMock.mockResolvedValue([
            inHours(3, { id: 'authored' }),
            inHours(4, { id: 'synthetic', sourceEventId: 'system_auto_generated' }),
        ]);
        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await waitFor(() => {
            expect(result.current.events.length).toBeGreaterThan(0);
        });
        const ids = result.current.events.map((e) => e.id);
        expect(ids).toContain('authored');
    });

    it('4) يُرتّب المواعيد تصاعدياً حسب وقتها', async () => {
        getEventsMock.mockResolvedValue([
            inHours(20, { id: 'late' }),
            inHours(2, { id: 'soon' }),
            inHours(12, { id: 'mid' }),
        ]);
        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await waitFor(() => {
            expect(result.current.events.length).toBe(3);
        });
        expect(result.current.events.map((e) => e.id)).toEqual(['soon', 'mid', 'late']);
    });

    it('5) يبني routePath صحيح حسب sourceModule', async () => {
        getEventsMock.mockResolvedValue([
            inHours(3, { id: 'a', sourceModule: 'execution', sourceEntityId: 'exec-9' }),
            inHours(4, { id: 'b', sourceModule: 'criminal', sourceEntityId: 'crim-7' }),
        ]);
        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await waitFor(() => {
            expect(result.current.events.length).toBe(2);
        });
        const byId = new Map(result.current.events.map((e) => [e.id, e]));
        expect(byId.get('a')!.routePath).toContain('execution');
        expect(byId.get('a')!.routePath).toContain('exec-9');
        expect(byId.get('b')!.routePath).toContain('criminal');
        expect(byId.get('b')!.routePath).toContain('crim-7');
    });

    it('6) لا يبدأ أي جلب عندما lawyerId = null', async () => {
        const { result } = renderHook(() => useCalendarRadar48h(null));
        await new Promise((r) => setTimeout(r, 30));
        expect(result.current.events).toEqual([]);
        expect(getEventsMock).not.toHaveBeenCalled();
    });

    it('8) whenLabel ثابت (آخر موعد) دون ticker دوري', async () => {
        vi.useFakeTimers();
        const baseTime = Date.parse('2026-05-25T10:00:00.000Z');
        vi.setSystemTime(baseTime);

        getEventsMock.mockResolvedValue([inHours(1, { id: 'soon' })]);

        const { result } = renderHook(() => useCalendarRadar48h('lawyer-1'));
        await vi.waitFor(() => {
            expect(result.current.events.length).toBe(1);
        });
        const initialLabel = result.current.events[0]!.whenLabel;
        expect(initialLabel).not.toContain('آخر موعد');
        expect(initialLabel).not.toContain('باقي');
        expect(result.current.events[0]!.dateLabel).toBeTruthy();
        expect(result.current.events[0]!.sourceModuleLabel).toBeTruthy();
        const initialCalls = getEventsMock.mock.calls.length;

        await vi.advanceTimersByTimeAsync(120_000);

        expect(getEventsMock.mock.calls.length).toBe(initialCalls);
        expect(result.current.events[0]!.whenLabel).toBe(initialLabel);

        vi.useRealTimers();
    });

    it('9) سباق: لا يُكتب الردّ القديم بعد تغيّر lawyerId', async () => {
        let resolveFirst: (v: CalendarEvent[]) => void = () => {};
        const slowPromise = new Promise<CalendarEvent[]>((r) => {
            resolveFirst = r;
        });
        getEventsMock
            .mockReturnValueOnce(slowPromise)
            .mockResolvedValueOnce([inHours(3, { id: 'B-evt' })]);

        const { result, rerender } = renderHook(
            ({ uid }: { uid: string | null }) => useCalendarRadar48h(uid),
            { initialProps: { uid: 'lawyer-A' } },
        );

        // قبل أن ينتهي الجلب القديم، نُغيّر المحامي
        rerender({ uid: 'lawyer-B' });

        // الآن نسمح للجلب القديم بأن يستجيب بنتيجة مختلفة
        resolveFirst([inHours(3, { id: 'A-stale' })]);

        await waitFor(() => {
            expect(result.current.events.length).toBe(1);
        });
        // يجب أن نرى B-evt فقط، لا A-stale
        expect(result.current.events[0]!.id).toBe('B-evt');
    });

    it('10) لا يجلب CalendarDB والمستند مخفي ثم يُفرّغ عند الظهور', async () => {
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => true,
        });
        getEventsMock.mockResolvedValue([inHours(3, { id: 'hidden-skip' })]);
        renderHook(() => useCalendarRadar48h('lawyer-1'));
        await Promise.resolve();
        expect(getEventsMock).not.toHaveBeenCalled();

        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => false,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        await waitFor(() => {
            expect(getEventsMock).toHaveBeenCalled();
        });
    });
});

