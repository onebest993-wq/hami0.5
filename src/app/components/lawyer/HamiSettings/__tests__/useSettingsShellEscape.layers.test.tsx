import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SmartDialogContainer } from '@/app/components/ui/SmartDialogContainer';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { useSettingsShellEscape } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap';
import { resetSettingsEscapeGuardsForTests } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';

const nativeBack: Array<() => boolean> = [];

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBack.push(handler);
        return () => {
            const index = nativeBack.indexOf(handler);
            if (index >= 0) nativeBack.splice(index, 1);
        };
    },
}));

function EscapeHarness({ onClose }: { onClose: () => void }) {
    useSettingsShellEscape(onClose, true);
    return <SmartDialogContainer />;
}

describe('طبقات Escape مقابل إغلاق X', () => {
    beforeEach(() => {
        resetSettingsEscapeGuardsForTests();
        nativeBack.length = 0;
    });

    it('Escape يغلق الحوار الذكي ولا يغلق الإعدادات', async () => {
        const onClose = vi.fn();
        render(<EscapeHarness onClose={onClose} />);

        let result!: Promise<boolean>;
        await act(async () => {
            result = SmartDialog.confirm('مسح كل البيانات؟', { title: 'تأكيد' });
        });
        expect(await screen.findByRole('dialog', { name: 'تأكيد' })).toBeInTheDocument();

        await act(async () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        await expect(result).resolves.toBe(false);
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(onClose).not.toHaveBeenCalled();
    });

    it('Escape يغلق الإعدادات عند خلو المكدس', async () => {
        const onClose = vi.fn();
        render(<EscapeHarness onClose={onClose} />);

        await act(async () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('رجوع النظام يتبع مكدس Escape لا إغلاق X', async () => {
        const onClose = vi.fn();
        render(<EscapeHarness onClose={onClose} />);
        expect(nativeBack.length).toBeGreaterThan(0);

        let result!: Promise<boolean>;
        await act(async () => {
            result = SmartDialog.confirm('تأكيد؟');
        });
        await screen.findByRole('dialog');

        await act(async () => {
            nativeBack[0]!();
        });

        await expect(result).resolves.toBe(false);
        expect(onClose).not.toHaveBeenCalled();
    });
});
