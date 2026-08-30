import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('@/app/utils/authSupabaseLazy', () => ({
    getAuthSupabase: async () => ({ auth: { getSession } }),
    updateAuthPassword: vi.fn(),
    signOutSupabase: vi.fn(),
}));

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: () => true,
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/bootstrap/useBootGateSurfaceReady', () => ({
    useBootGateSurfaceReady: () => undefined,
}));

import { LawyerPasswordResetForm } from '@/app/bootstrap/lawyerAuth/LawyerPasswordResetForm';

describe('LawyerPasswordResetForm recovery probe', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        getSession.mockReset();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        delete document.documentElement.dataset.hamiAppActive;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يتوقف عن الاستقصاء بعد وصول جلسة الاستعادة', async () => {
        getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
        render(<LawyerPasswordResetForm onCompleted={vi.fn()} onCancelToLogin={vi.fn()} />);

        await vi.waitFor(() => {
            expect(getSession).toHaveBeenCalledTimes(1);
        });

        await vi.advanceTimersByTimeAsync(60_000);
        expect(getSession).toHaveBeenCalledTimes(1);
    });

    it('يتباطأ بدل التكرار الثابت حين تتأخر الجلسة', async () => {
        getSession.mockResolvedValue({ data: { session: null } });
        render(<LawyerPasswordResetForm onCompleted={vi.fn()} onCancelToLogin={vi.fn()} />);

        await vi.waitFor(() => {
            expect(getSession).toHaveBeenCalledTimes(1);
        });

        await vi.advanceTimersByTimeAsync(30_000);
        const calls = getSession.mock.calls.length;
        /* التكرار الثابت كل 1.5 ثانية كان يعني 20 نداءً في نصف دقيقة */
        expect(calls).toBeGreaterThan(1);
        expect(calls).toBeLessThan(12);
    });

    it('يتوقف تماماً عند تفكيك النموذج', async () => {
        getSession.mockResolvedValue({ data: { session: null } });
        const view = render(
            <LawyerPasswordResetForm onCompleted={vi.fn()} onCancelToLogin={vi.fn()} />,
        );
        await vi.waitFor(() => {
            expect(getSession).toHaveBeenCalledTimes(1);
        });
        view.unmount();
        const calls = getSession.mock.calls.length;
        await vi.advanceTimersByTimeAsync(60_000);
        expect(getSession).toHaveBeenCalledTimes(calls);
    });

    it('لا يستقصي والتطبيق في الخلفية', async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.documentElement.dataset.hamiAppActive = '0';
        getSession.mockResolvedValue({ data: { session: null } });
        render(<LawyerPasswordResetForm onCompleted={vi.fn()} onCancelToLogin={vi.fn()} />);
        await vi.advanceTimersByTimeAsync(60_000);
        expect(getSession).not.toHaveBeenCalled();
    });

    it('يمنع الحفظ قبل تفعيل رابط الاستعادة', async () => {
        getSession.mockResolvedValue({ data: { session: null } });
        render(<LawyerPasswordResetForm onCompleted={vi.fn()} onCancelToLogin={vi.fn()} />);
        await vi.waitFor(() => {
            expect(screen.getByTestId('lawyer-password-reset-waiting')).toBeInTheDocument();
        });
        expect(screen.getByTestId('lawyer-password-reset-submit')).toBeDisabled();
    });
});
