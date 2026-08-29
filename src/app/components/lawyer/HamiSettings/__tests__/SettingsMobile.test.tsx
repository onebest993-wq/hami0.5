import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { SettingsShell } from '../SettingsShell';

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => false,
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: () => undefined,
}));

vi.mock('../hooks/useSettingsShellFocusTrap', () => ({
    useSettingsShellFocusTrap: () => ({ onKeyDownCapture: undefined }),
}));

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: (enabled = true) => (enabled ? 96 : 0),
}));

describe('Settings mobile readiness', () => {
    it('SettingsShell يستخدم safe-area و min-h-[44px] على التبويبات وزر الإغلاق', () => {
        render(
            <LawyerSettingsProvider>
                <SettingsShell
                    onClose={() => undefined}
                    activeSection="appearance"
                    onSectionChange={() => undefined}
                >
                    <div data-testid="settings-child">child</div>
                </SettingsShell>
            </LawyerSettingsProvider>,
        );

        const closeBtn = screen.getByTestId('settings-shell-close');
        expect(closeBtn.className).toContain('min-h-[44px]');
        expect(closeBtn.className).toContain('min-w-[44px]');

        const appearanceTab = screen.getByTestId('settings-nav-appearance');
        expect(appearanceTab.className).toContain('min-h-[44px]');
        expect(appearanceTab.className).toContain('min-w-[44px]');

        const header = document.querySelector('.hami-settings-header');
        expect(header?.className).toContain('safe-area-inset-top');

        const panel = document.getElementById('settings-section-panel');
        expect(panel?.className).toContain('safe-area-inset-bottom');
        expect(panel?.className).toContain('overscroll-contain');
        expect(panel?.className).toContain('min-w-0');
        expect(panel).toHaveAttribute('data-keyboard-inset', '96');
        expect(panel?.getAttribute('style') ?? '').toContain('96px');
    });
});
