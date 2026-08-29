import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalDataClear } from '@/app/components/lawyer/HamiSettings/hooks/useLocalDataClear';

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(() => Promise.resolve(false)),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        info: vi.fn(),
        warning: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/services/settings/applicationWipe', () => ({
    wipeAllApplicationData: vi.fn(() => Promise.resolve({ cloudAttempted: false })),
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: `${base}-TEST`,
        promptMessage: `اكتب «${base}-TEST» حرفياً للمتابعة:`,
    }),
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(false)),
}));

describe('useLocalDataClear', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يبقى idle عند إلغاء التأكيد الأول', async () => {
        const { result } = renderHook(() => useLocalDataClear(vi.fn()));

        await act(async () => {
            await result.current.requestFullWipe();
        });

        expect(result.current.wipePhase).toBe('idle');
    });

    it('لا يبدأ العدّ عند فشل التحقق الإضافي', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        vi.mocked(SmartDialog.confirm).mockResolvedValueOnce(true);
        const { verifySensitiveSettingsAction } = await import(
            '@/app/services/settings/verifySensitiveSettingsAction'
        );

        const { result } = renderHook(() => useLocalDataClear(vi.fn()));

        await act(async () => {
            await result.current.requestFullWipe();
        });

        expect(verifySensitiveSettingsAction).toHaveBeenCalled();
        expect(result.current.wipePhase).toBe('idle');
    });

    it('يفك انتظار العد التنازلي فور الإلغاء ولا يترك العملية معلقة', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        vi.mocked(SmartDialog.confirm).mockResolvedValueOnce(true);
        const { verifySensitiveSettingsAction } = await import(
            '@/app/services/settings/verifySensitiveSettingsAction'
        );
        vi.mocked(verifySensitiveSettingsAction).mockResolvedValueOnce(true);
        const { result } = renderHook(() => useLocalDataClear(vi.fn()));

        let request!: Promise<void>;
        await act(async () => {
            request = result.current.requestFullWipe();
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(result.current.wipePhase).toBe('countdown');

        act(() => result.current.cancelCountdown());
        await act(async () => request);

        expect(result.current.wipePhase).toBe('idle');
    });
});
