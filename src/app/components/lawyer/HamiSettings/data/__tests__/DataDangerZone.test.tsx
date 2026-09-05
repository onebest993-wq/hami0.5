import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DataDangerZone } from '@/app/components/lawyer/HamiSettings/data/DataDangerZone';
import { SettingsSectionActiveProvider } from '@/app/components/lawyer/HamiSettings/settingsSectionActiveContext';

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

    it('يعطّل المسح وإعادة الضبط أثناء تأكيد العملية', () => {
        render(
            <DataDangerZone
                wipe={{
                    wipePhase: 'confirming',
                    countdown: 0,
                    cancelCountdown: vi.fn(),
                    requestFullWipe: vi.fn(),
                }}
                onResetToDefaults={vi.fn()}
            />,
        );

        expect(screen.getByTestId('settings-wipe-start')).toBeDisabled();
        expect(screen.getByTestId('settings-reset-start')).toBeDisabled();
    });

    it('لا يعيد الضبط إن غادر المستخدم أثناء التأكيد', async () => {
        const onResetToDefaults = vi.fn();
        const { verifySensitiveSettingsAction } = await import(
            '@/app/services/settings/verifySensitiveSettingsAction'
        );
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        let release!: (ok: boolean) => void;
        vi.mocked(SmartDialog.confirm).mockImplementation(
            () =>
                new Promise<boolean>((resolve) => {
                    release = resolve;
                }),
        );

        const wipe = {
            wipePhase: 'idle' as const,
            countdown: 0,
            cancelCountdown: vi.fn(),
            requestFullWipe: vi.fn(),
        };

        function Harness({ active }: { active: boolean }) {
            return (
                <SettingsSectionActiveProvider active={active}>
                    <DataDangerZone wipe={wipe} onResetToDefaults={onResetToDefaults} />
                </SettingsSectionActiveProvider>
            );
        }

        const { rerender } = render(<Harness active />);
        fireEvent.click(screen.getByTestId('settings-reset-start'));
        rerender(<Harness active={false} />);

        await act(async () => {
            release(true);
        });

        expect(onResetToDefaults).not.toHaveBeenCalled();
        expect(verifySensitiveSettingsAction).not.toHaveBeenCalled();
    });
});
