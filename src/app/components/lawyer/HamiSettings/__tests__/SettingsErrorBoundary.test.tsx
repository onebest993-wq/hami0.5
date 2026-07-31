import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SettingsErrorBoundary } from '@/app/components/lawyer/HamiSettings/SettingsErrorBoundary';

function CrashOnRender() {
    throw new Error('settings crash');
}

describe('SettingsErrorBoundary', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('يلتقط الانهيار ويستدعي onShellReset ويعرض fallback قابل للإغلاق', async () => {
        const onClose = vi.fn();
        const onShellReset = vi.fn();

        render(
            <SettingsErrorBoundary onClose={onClose} onShellReset={onShellReset}>
                <CrashOnRender />
            </SettingsErrorBoundary>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('settings-error-fallback')).toBeInTheDocument(),
        );

        expect(onShellReset).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId('settings-error-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
