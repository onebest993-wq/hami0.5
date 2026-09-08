import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsLifecycle } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle';
import { SETTINGS_INTERACTIVE_FALLBACK_MS } from '@/app/services/settings/settingsPerfBudget';
import type { SettingsSectionId } from '@/app/services/settings/types';

const markSettingsPerfPhase = vi.fn();
const reportSettingsPerf = vi.fn();
const observeSettingsSectionInteractive = vi.fn();

vi.mock('@/app/services/settings/settingsPerfMetrics', () => ({
    markSettingsPerfPhase: (...args: unknown[]) => markSettingsPerfPhase(...args),
    reportSettingsPerf: (...args: unknown[]) => reportSettingsPerf(...args),
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    isHamiSettingsModuleResolved: () => true,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive', () => ({
    observeSettingsSectionInteractive: (...args: unknown[]) => observeSettingsSectionInteractive(...args),
}));

describe('useSettingsLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        observeSettingsSectionInteractive.mockReturnValue(() => undefined);
        vi.useFakeTimers();
    });

    it('يسجّل first-paint عند الفتح', () => {
        renderHook(() => useSettingsLifecycle(true, 'appearance', 'user-1'));
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('first-paint');
    });

    it('لا يسجّل first-paint عند الإغلاق', () => {
        renderHook(() => useSettingsLifecycle(false, 'appearance', 'user-1'));
        expect(markSettingsPerfPhase).not.toHaveBeenCalled();
    });

    it('يراقب تفاعل القسم النشط ويبلّغ interactive', () => {
        const onHydrated = vi.fn();
        renderHook(() => useSettingsLifecycle(true, 'security', 'user-1', onHydrated));

        expect(observeSettingsSectionInteractive).toHaveBeenCalledWith(
            expect.objectContaining({ activeSection: 'security' }),
        );

        const call = observeSettingsSectionInteractive.mock.calls[0]?.[0] as {
            onInteractive: () => void;
        };
        call.onInteractive();
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('interactive');
        expect(reportSettingsPerf).toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalled();
    });

    it('fallback يبلّغ interactive بعد مهلة قصيرة', () => {
        renderHook(() => useSettingsLifecycle(true, 'data', 'user-1'));
        vi.advanceTimersByTime(SETTINGS_INTERACTIVE_FALLBACK_MS);
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('interactive');
    });

    it('عند تبديل القسم داخل نفس الجلسة المفتوحة — يُعيد تسجيل first-paint ويبني observer جديد للقسم الثاني', () => {
        const onHydrated = vi.fn();
        const stopCalls: Array<() => void> = [];
        const onInteractiveCalls: Array<() => void> = [];

        observeSettingsSectionInteractive.mockImplementation((opts: {
            activeSection: string;
            onInteractive: () => void;
        }) => {
            const stop = vi.fn();
            stopCalls.push(stop);
            onInteractiveCalls.push(opts.onInteractive);
            return stop;
        });

        const { rerender } = renderHook(
            ({ section }) => useSettingsLifecycle(true, section, 'user-1', onHydrated),
            { initialProps: { section: 'appearance' as SettingsSectionId } },
        );

        const firstPaintCalls = () =>
            markSettingsPerfPhase.mock.calls.filter(([phase]) => phase === 'first-paint').length;
        const interactiveCalls = () =>
            markSettingsPerfPhase.mock.calls.filter(([phase]) => phase === 'interactive').length;

        expect(firstPaintCalls()).toBe(1);
        expect(observeSettingsSectionInteractive).toHaveBeenCalledTimes(1);
        expect(observeSettingsSectionInteractive).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ activeSection: 'appearance' }),
        );

        onInteractiveCalls[0]();
        expect(interactiveCalls()).toBe(1);
        expect(reportSettingsPerf).toHaveBeenCalledTimes(1);
        expect(reportSettingsPerf).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ activeSection: 'appearance' }),
        );
        expect(onHydrated).toHaveBeenCalledTimes(1);

        rerender({ section: 'security' });

        expect(firstPaintCalls()).toBe(2);
        expect(observeSettingsSectionInteractive).toHaveBeenCalledTimes(2);
        expect(observeSettingsSectionInteractive).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ activeSection: 'security' }),
        );

        onInteractiveCalls[1]();
        expect(interactiveCalls()).toBe(2);
        expect(reportSettingsPerf).toHaveBeenCalledTimes(2);
        expect(reportSettingsPerf).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ activeSection: 'security' }),
        );
        expect(onHydrated).toHaveBeenCalledTimes(2);
    });

    it('استدعاء late من observer قسم سابق لا يطلق تقريرًا على القسم الجديد', () => {
        const onHydrated = vi.fn();
        const onInteractiveCalls: Array<() => void> = [];

        observeSettingsSectionInteractive.mockImplementation((opts: {
            onInteractive: () => void;
        }) => {
            const stop = vi.fn();
            onInteractiveCalls.push(opts.onInteractive);
            return stop;
        });

        const { rerender } = renderHook(
            ({ section }) => useSettingsLifecycle(true, section, 'user-1', onHydrated),
            { initialProps: { section: 'notifications' as unknown as SettingsSectionId } },
        );

        expect(onInteractiveCalls.length).toBe(1);

        rerender({ section: 'backup' as unknown as SettingsSectionId });
        expect(onInteractiveCalls.length).toBe(2);

        const prevReportCount = reportSettingsPerf.mock.calls.length;
        const prevInteractiveCount = markSettingsPerfPhase.mock.calls.filter(
            ([phase]) => phase === 'interactive',
        ).length;

        onInteractiveCalls[0]();

        expect(reportSettingsPerf.mock.calls.length).toBe(prevReportCount);
        expect(
            markSettingsPerfPhase.mock.calls.filter(([phase]) => phase === 'interactive').length,
        ).toBe(prevInteractiveCount);
    });

    it('عند الإغلاق المبكر قبل انتهاء fallback — لا يُطلق تقرير بعد الإغلاق', () => {
        const stopFn = vi.fn();
        observeSettingsSectionInteractive.mockReturnValue(stopFn);

        const { rerender } = renderHook(
            ({ open }) => useSettingsLifecycle(open, 'data', 'user-1'),
            { initialProps: { open: true as boolean } },
        );

        expect(observeSettingsSectionInteractive).toHaveBeenCalledTimes(1);

        rerender({ open: false });

        expect(stopFn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(SETTINGS_INTERACTIVE_FALLBACK_MS + 500);
        expect(markSettingsPerfPhase).not.toHaveBeenCalledWith('interactive');
        expect(reportSettingsPerf).not.toHaveBeenCalled();
    });

    it('يرفض stale callback لـ fallback عند close/open سريع لنفس القسم قبل 1200ms — آخر جلسة فقط تُعلن', () => {
        const onHydrated = vi.fn();
        const stopCalls: Array<() => void> = [];
        observeSettingsSectionInteractive.mockImplementation(() => {
            const stop = vi.fn();
            stopCalls.push(stop);
            return stop;
        });

        const { rerender } = renderHook(
            ({ open, uid }) => useSettingsLifecycle(open, 'data', uid, onHydrated),
            { initialProps: { open: true as boolean, uid: 'old-user' } },
        );

        const reportAfterOpen1 = reportSettingsPerf.mock.calls.length;
        expect(reportAfterOpen1).toBe(0);
        expect(observeSettingsSectionInteractive).toHaveBeenCalledTimes(1);

        rerender({ open: false, uid: 'old-user' });
        expect(stopCalls.length).toBe(1);

        rerender({ open: true, uid: 'new-user' });
        expect(observeSettingsSectionInteractive).toHaveBeenCalledTimes(2);

        const afterReopenReportCount = reportSettingsPerf.mock.calls.length;
        const afterReopenInteractive = markSettingsPerfPhase.mock.calls.filter(
            ([p]) => p === 'interactive',
        ).length;

        vi.advanceTimersByTime(SETTINGS_INTERACTIVE_FALLBACK_MS);

        expect(reportSettingsPerf.mock.calls.length).toBe(afterReopenReportCount + 1);
        const latest = reportSettingsPerf.mock.calls[reportSettingsPerf.mock.calls.length - 1][0];
        expect(latest.userId).toBe('new-user');
        expect(latest.activeSection).toBe('data');
        expect(
            markSettingsPerfPhase.mock.calls.filter(([p]) => p === 'interactive').length,
        ).toBe(afterReopenInteractive + 1);
        expect(onHydrated).toHaveBeenCalledTimes(1);
    });
});
