import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DataDangerZone } from '@/app/components/lawyer/HamiSettings/data/DataDangerZone';

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { confirm: vi.fn(() => Promise.resolve(false)) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: base,
        promptMessage: base,
    }),
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/ExecutionIndexQuarantineRow', () => ({
    ExecutionIndexQuarantineRow: () => null,
}));

describe('DataDangerZone', () => {
    it('يعرض أزرار المسح وإعادة الضبط القابلة للتفعيل', () => {
        render(
            <DataDangerZone
                wipe={{
                    wipePhase: 'idle',
                    countdown: 0,
                    cancelCountdown: vi.fn(),
                    requestFullWipe: vi.fn(),
                }}
                onResetToDefaults={vi.fn()}
            />,
        );

        expect(screen.getByTestId('settings-wipe-start')).toHaveTextContent('مسح');
        expect(screen.getByTestId('settings-reset-start')).toHaveTextContent('إعادة ضبط');
    });

    it('يستدعي طلب المسح عند النقر ولا يعيد الضبط عند إلغاء الحوار', async () => {
        const requestFullWipe = vi.fn();
        const onResetToDefaults = vi.fn();
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');

        render(
            <DataDangerZone
                wipe={{
                    wipePhase: 'idle',
                    countdown: 0,
                    cancelCountdown: vi.fn(),
                    requestFullWipe,
                }}
                onResetToDefaults={onResetToDefaults}
            />,
        );

        fireEvent.click(screen.getByTestId('settings-wipe-start'));
        expect(requestFullWipe).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId('settings-reset-start'));
        await waitFor(() => expect(SmartDialog.confirm).toHaveBeenCalled());
        expect(onResetToDefaults).not.toHaveBeenCalled();
    });
});
