import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const hasQ = vi.fn(() => true);
const claimQ = vi.fn(() => true);

vi.mock('@/app/utils/executionFilesStorage', () => ({
    hasQuarantinedExecutionFilesIndex: () => hasQ(),
    claimQuarantinedExecutionFilesIndex: () => claimQ(),
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { confirm: vi.fn(() => Promise.resolve(true)) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: base,
        promptMessage: base,
    }),
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(true)),
}));

import { ExecutionIndexQuarantineRow } from '@/app/components/lawyer/HamiSettings/data/ExecutionIndexQuarantineRow';
import { SettingsSectionActiveProvider } from '@/app/components/lawyer/HamiSettings/settingsSectionActiveContext';

describe('ExecutionIndexQuarantineRow', () => {
    beforeEach(async () => {
        hasQ.mockReturnValue(true);
        claimQ.mockClear();
        claimQ.mockReturnValue(true);
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        vi.mocked(SmartDialog.confirm).mockReset();
        vi.mocked(SmartDialog.confirm).mockResolvedValue(true);
    });

    it('hides when nothing is quarantined', () => {
        hasQ.mockReturnValue(false);
        const { container } = render(<ExecutionIndexQuarantineRow />);
        expect(container).toBeEmptyDOMElement();
    });

    it('claims after confirm and hides the row', async () => {
        render(<ExecutionIndexQuarantineRow />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('settings-claim-quarantined-execution-index'));
        });
        expect(claimQ).toHaveBeenCalled();
        expect(screen.queryByTestId('settings-claim-quarantined-execution-index')).toBeNull();
    });

    it('لا يبدأ استيراداً ثانياً بينما الحوار مفتوح', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        let release!: (ok: boolean) => void;
        vi.mocked(SmartDialog.confirm).mockReset();
        vi.mocked(SmartDialog.confirm).mockImplementation(
            () =>
                new Promise<boolean>((resolve) => {
                    release = resolve;
                }),
        );

        render(<ExecutionIndexQuarantineRow />);
        fireEvent.click(screen.getByTestId('settings-claim-quarantined-execution-index'));
        fireEvent.click(screen.getByTestId('settings-claim-quarantined-execution-index'));
        expect(SmartDialog.confirm).toHaveBeenCalledTimes(1);

        await act(async () => {
            release(false);
        });
        expect(claimQ).not.toHaveBeenCalled();
    });

    it('لا يستورد الفهرس إن غادر المستخدم أثناء التأكيد', async () => {
        const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
        let release!: (ok: boolean) => void;
        vi.mocked(SmartDialog.confirm).mockReset();
        vi.mocked(SmartDialog.confirm).mockImplementation(
            () =>
                new Promise<boolean>((resolve) => {
                    release = resolve;
                }),
        );

        function Harness({ active }: { active: boolean }) {
            return (
                <SettingsSectionActiveProvider active={active}>
                    <ExecutionIndexQuarantineRow />
                </SettingsSectionActiveProvider>
            );
        }

        const { rerender } = render(<Harness active />);
        fireEvent.click(screen.getByTestId('settings-claim-quarantined-execution-index'));
        rerender(<Harness active={false} />);

        await act(async () => {
            release(true);
        });

        expect(claimQ).not.toHaveBeenCalled();
    });
});
