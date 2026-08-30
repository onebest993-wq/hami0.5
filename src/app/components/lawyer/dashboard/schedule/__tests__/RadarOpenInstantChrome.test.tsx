import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RadarOpenInstantChrome } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome';
import { buildRadarOpenInstantSnapshot } from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    resetCalendarEventsCacheForTests,
    setCachedCalendarEvents,
} from '@/app/services/calendar/calendarEventsCache';
import {
    peekCalendarShellSession,
    resetCalendarShellSessionForTests,
} from '@/app/services/calendar/calendarShellSession';

describe('RadarOpenInstantChrome', () => {
    beforeEach(() => {
        resetNativeBackHandlersForTests();
        resetCalendarEventsCacheForTests();
        resetCalendarShellSessionForTests();
    });

    it('يعرض صدفة رادار بشريط الشهر والأسبوع لا صناديق فارغة', () => {
        const onBack = vi.fn();
        const snap = buildRadarOpenInstantSnapshot();
        render(<RadarOpenInstantChrome onBack={onBack} />);

        const shell = screen.getByTestId('schedule-tab-loading');
        expect(shell).not.toHaveAttribute('aria-busy');
        expect(screen.getByRole('heading', { name: 'رادار المواعيد' })).toBeTruthy();
        expect(screen.getByTestId('radar-month-label').textContent).toBe(snap.monthLabel);
        expect(screen.getByTestId('radar-week-strip').children).toHaveLength(7);
        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute(
            'data-schedule-snapshot',
            'pending',
        );
        expect(screen.getByTestId('radar-empty-pending')).toBeTruthy();
        expect(screen.queryByTestId('radar-empty-state')).toBeNull();
        expect(screen.queryByText('لا توجد مواعيد لهذا اليوم')).toBeNull();
        expect(screen.getByText('الشهر')).toBeTruthy();
        expect(screen.getByTestId('radar-add-event')).toBeEnabled();

        fireEvent.click(screen.getByTestId('radar-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('لا يظهر جملة الفراغ إلا بعد لقطة كاش مؤكدة فارغة', () => {
        setCachedCalendarEvents('lawyer-1', []);
        render(<RadarOpenInstantChrome onBack={vi.fn()} userId="lawyer-1" />);
        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute(
            'data-schedule-snapshot',
            'ready',
        );
        expect(screen.queryByTestId('radar-empty-pending')).toBeNull();
        expect(screen.getByTestId('radar-empty-state').textContent).toContain(
            'لا توجد مواعيد لهذا اليوم',
        );
    });

    it('Escape وCap يرجعان قبل تركيب الرادار', () => {
        const onBack = vi.fn();
        render(<RadarOpenInstantChrome onBack={onBack} />);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).toHaveBeenCalledTimes(1);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(2);
    });

    it('Escape وCap يرجعان والصدفة هي مالك الرجوع حتى مع جسم حي', () => {
        const onBack = vi.fn();
        render(
            <RadarOpenInstantChrome
                onBack={onBack}
                liveReady
                liveBody={
                    <div data-testid="radar-live-body">
                        <div data-testid="radar-selected-day-section" />
                    </div>
                }
            />,
        );

        expect(screen.getByTestId('smart-legal-radar')).toHaveAttribute('data-schedule-instant', '1');
        expect(screen.queryByTestId('schedule-tab-loading')).toBeNull();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).toHaveBeenCalledTimes(1);

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(2);
    });

    it('يرسم نقاط الأسبوع من كاش الذاكرة ويعرض بطاقة الموعد', async () => {
        const today = getLocalTodayYmd();
        const onBack = vi.fn();
        render(<RadarOpenInstantChrome onBack={onBack} userId="lawyer-1" />);
        expect(screen.getByTestId('radar-empty-pending')).toBeTruthy();
        expect(screen.queryByText('لا توجد مواعيد لهذا اليوم')).toBeNull();

        act(() => {
            setCachedCalendarEvents('lawyer-1', [
                {
                    id: 'e1',
                    userId: 'lawyer-1',
                    title: 'جلسة استماع',
                    date: today,
                    type: 'hearing',
                    time: '10:00',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ]);
        });

        await waitFor(() => {
            expect(screen.getByTestId('radar-open-instant-event-e1')).toBeTruthy();
        });
        expect(screen.queryByTestId('radar-empty-state')).toBeNull();
        expect(screen.queryByTestId('radar-empty-pending')).toBeNull();
        expect(screen.getByTestId(`radar-week-day-${today}`)).toHaveAttribute('data-has-events', '1');
        expect(screen.getByTestId('radar-open-instant-event-e1').textContent).toContain(
            'جلسة استماع',
        );
        expect(screen.getByTestId('radar-open-instant-event-e1').textContent).toContain('10:00');
    });

    it('يقرأ كاش الذاكرة الموجود قبل التركيب في نفس الإطار', () => {
        const today = getLocalTodayYmd();
        setCachedCalendarEvents('lawyer-1', [
            {
                id: 'e1',
                userId: 'lawyer-1',
                title: 'جلسة',
                date: today,
                type: 'custom',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        render(<RadarOpenInstantChrome onBack={vi.fn()} userId="lawyer-1" />);
        expect(screen.queryByTestId('radar-empty-state')).toBeNull();
        expect(screen.getByTestId(`radar-week-day-${today}`)).toHaveAttribute('data-has-events', '1');
    });

    it('اختيار يوم من الشريط يحدّث جلسة الصدفة ويعرض قائمة ذلك اليوم', () => {
        const today = getLocalTodayYmd();
        const week = buildRadarOpenInstantSnapshot(new Date(), 'lawyer-1').week;
        const other = week.find((day) => day.ymd !== today);
        expect(other).toBeTruthy();
        setCachedCalendarEvents('lawyer-1', [
            {
                id: 'other-day',
                userId: 'lawyer-1',
                title: 'موعد غد',
                date: other!.ymd,
                type: 'custom',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        render(<RadarOpenInstantChrome onBack={vi.fn()} userId="lawyer-1" />);
        fireEvent.click(screen.getByTestId(`radar-week-day-${other!.ymd}`));
        expect(peekCalendarShellSession()?.selectedDate).toBe(other!.ymd);
        expect(screen.getByTestId('radar-open-instant-event-other-day')).toBeTruthy();
        expect(screen.queryByTestId('radar-empty-state')).toBeNull();
    });

    it('زر الشهر يفتح شبكة الأيام', () => {
        render(<RadarOpenInstantChrome onBack={vi.fn()} />);
        const toggle = screen.getByTestId('radar-toggle-full-month');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('radar-calendar-grid')).toBeTruthy();
        expect(peekCalendarShellSession()?.showFullMonth).toBe(true);
    });
});

describe('buildRadarOpenInstantSnapshot', () => {
    beforeEach(() => {
        resetCalendarEventsCacheForTests();
        resetCalendarShellSessionForTests();
    });

    it('يبني أسبوع أحد→سبت حول اليوم المحدد', () => {
        const snap = buildRadarOpenInstantSnapshot(new Date('2026-08-25T12:00:00'));
        expect(snap.selectedDate).toBe('2026-08-25');
        expect(snap.monthLabel).toBe('أغسطس 2026');
        expect(snap.week).toHaveLength(7);
        expect(snap.week[0]?.ymd).toBe('2026-08-23');
        expect(snap.week[0]?.name).toBe('أحد');
        const selected = snap.week.find((d) => d.selected);
        expect(selected?.ymd).toBe('2026-08-25');
        expect(selected?.name).toBe('ثلاثاء');
        expect(selected?.hasEvents).toBe(false);
        expect(snap.monthCells).toHaveLength(31);
        expect(snap.snapshotReady).toBe(false);
    });

    it('snapshotReady بعد زراعة الكاش حتى لو فارغاً', () => {
        setCachedCalendarEvents('lawyer-1', []);
        const empty = buildRadarOpenInstantSnapshot(new Date('2026-08-25T12:00:00'), 'lawyer-1');
        expect(empty.snapshotReady).toBe(true);
        expect(empty.dayEvents).toHaveLength(0);
    });

    it('يظهر عدّاد المهلة القانونية وتسمية المصدر على بطاقة الكاش', () => {
        const today = '2026-08-30';
        setCachedCalendarEvents('lawyer-1', [
            {
                id: 'deadline-1',
                userId: 'lawyer-1',
                title: 'مهلة طعن تمييز',
                date: today,
                type: 'deadline',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'bridged-1',
                userId: 'lawyer-1',
                title: 'جلسة مرافعة',
                date: today,
                type: 'hearing',
                sourceModule: 'lawsuit',
                sourceEntityId: 'file-1',
                sourceEventId: 'ev-1',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        const snap = buildRadarOpenInstantSnapshot(new Date(`${today}T12:00:00`), 'lawyer-1');
        const deadline = snap.dayEvents.find((event) => event.id === 'deadline-1');
        const bridged = snap.dayEvents.find((event) => event.id === 'bridged-1');
        expect(deadline?.countdownLabel).toMatch(/انتهت|ي عمل/);
        expect(bridged?.sourceLabel).toBe('دعوى');
        expect(bridged?.bridged).toBe(true);
    });
});
