import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppLockOverlay } from '@/app/components/lawyer/AppLockOverlay';

describe('AppLockOverlay', () => {
    it('يعرض واجهة الفتح بدون الاعتماد على Tailwind', () => {
        render(
            <AppLockOverlay
                requiresBiometric={false}
                unlocking={false}
                onUnlockBiometric={vi.fn(async () => true)}
                onUnlockContinue={vi.fn()}
            />,
        );

        const overlay = screen.getByTestId('app-lock-overlay');
        expect(overlay).toHaveClass('hami-app-lock-overlay');
        expect(screen.getByRole('dialog', { name: 'شاشة القفل' })).toBeInTheDocument();
        expect(screen.getByText('الجلسة مقفلة')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'متابعة العمل' })).toBeInTheDocument();
    });

    it('يستدعي الفتح البيومتري تلقائياً مرة واحدة', async () => {
        vi.useFakeTimers();
        const onUnlockBiometric = vi.fn(async () => true);
        try {
            render(
                <AppLockOverlay
                    requiresBiometric
                    unlocking={false}
                    onUnlockBiometric={onUnlockBiometric}
                    onUnlockContinue={vi.fn()}
                />,
            );
            await act(async () => {
                await vi.advanceTimersByTimeAsync(400);
            });
            expect(onUnlockBiometric).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('يعيد طلب البصمة عند العودة من الخلفية', async () => {
        vi.useFakeTimers();
        const onUnlockBiometric = vi.fn(async () => false);
        try {
            render(
                <AppLockOverlay
                    requiresBiometric
                    unlocking={false}
                    onUnlockBiometric={onUnlockBiometric}
                    onUnlockContinue={vi.fn()}
                />,
            );
            await act(async () => {
                await vi.advanceTimersByTimeAsync(400);
            });
            expect(onUnlockBiometric).toHaveBeenCalledTimes(1);

            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'hidden', { configurable: true, value: false });
            document.dispatchEvent(new Event('visibilitychange'));
            await act(async () => {
                await vi.advanceTimersByTimeAsync(400);
            });
            expect(onUnlockBiometric).toHaveBeenCalledTimes(2);
        } finally {
            Object.defineProperty(document, 'hidden', { configurable: true, value: false });
            vi.useRealTimers();
        }
    });

    it('يعرض نسيت التحقق؟ عند القفل البيومتري ويخرج', () => {
        const onLogout = vi.fn();
        render(
            <AppLockOverlay
                requiresBiometric
                unlocking={false}
                onUnlockBiometric={vi.fn(async () => false)}
                onUnlockContinue={vi.fn()}
                onLogout={onLogout}
            />,
        );
        fireEvent.click(screen.getByTestId('app-lock-forgot-verify'));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });
});
