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

    it('لا يسرق التركيز من لوحة الورقة المتداخلة خارج الصدفة', async () => {
        const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
        Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
            configurable: true,
            get() {
                return (this as HTMLElement).parentElement;
            },
        });

        function SheetHarness() {
            const shellRef = React.useRef<HTMLDivElement>(null);
            const { onKeyDownCapture } = useSettingsShellFocusTrap(shellRef, () => undefined, true);
            return (
                <div data-testid="hami-settings-overlay-host">
                    <div
                        ref={shellRef}
                        data-hami-settings-shell=""
                        onKeyDownCapture={onKeyDownCapture}
                    >
                        <button type="button" data-testid="settings-shell-close">
                            إغلاق
                        </button>
                    </div>
                    <div data-testid="appearance-block-customize-sheet">
                        <div data-testid="hami-settings-sheet-panel" role="dialog">
                            <button type="button">رجوع</button>
                            <button type="button">حفظ</button>
                        </div>
                    </div>
                </div>
            );
        }

        try {
            render(<SheetHarness />);
            await act(async () => {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            });

            const save = screen.getByRole('button', { name: 'حفظ' });
            act(() => {
                save.focus();
            });
            expect(document.activeElement).toBe(save);

            fireEvent.keyDown(save, { key: 'Tab' });
            expect(document.activeElement).toBe(screen.getByRole('button', { name: 'رجوع' }));
        } finally {
            if (offsetParent) {
                Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
            } else {
                delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent;
            }
        }
    });
});
