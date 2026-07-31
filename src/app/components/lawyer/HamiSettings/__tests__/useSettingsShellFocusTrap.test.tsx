import React, { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmartDialogContainer } from '@/app/components/ui/SmartDialogContainer';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useSettingsShellFocusTrap } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap';

vi.mock('@/app/components/lawyer/HamiSettings/settingsFilePickerGrace', () => ({
    isSettingsFilePickerGraceActive: () => false,
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsEscapeStack', () => ({
    resolveSettingsEscapeAction: ({ smartDialogOpen }: { smartDialogOpen: boolean }) =>
        smartDialogOpen ? 'dismiss-dialog' : 'close-settings',
}));

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

function Harness() {
    const shellRef = useRef<HTMLDivElement>(null);
    const { onKeyDownCapture } = useSettingsShellFocusTrap(shellRef, () => undefined, true);

    return (
        <>
            <div ref={shellRef} onKeyDownCapture={onKeyDownCapture}>
                <button type="button">إغلاق</button>
            </div>
            <SmartDialogContainer />
        </>
    );
}

describe('useSettingsShellFocusTrap', () => {
    it('يسمح بالتركيز والكتابة داخل SmartDialog prompt portal', async () => {
        render(<Harness />);

        let promptPromise: Promise<string | null>;
        await act(async () => {
            promptPromise = SmartDialog.prompt('اكتب عبارة التأكيد', '', {
                title: 'تحقق قبل المسح',
                confirmText: 'متابعة',
            });
        });

        const input = await screen.findByRole('textbox');
        await waitFor(() => expect(document.activeElement).toBe(input));

        await act(async () => {
            fireEvent.change(input, { target: { value: 'مسح نهائي' } });
        });
        expect(input).toHaveValue('مسح نهائي');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
        });
        await expect(promptPromise).resolves.toBe('مسح نهائي');
    });
});
