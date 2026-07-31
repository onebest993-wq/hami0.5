import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SettingsShell } from '@/app/components/lawyer/HamiSettings/SettingsShell';
import {
    armSettingsOverlayInteraction,
    clearSettingsReopenSuppress,
    isSettingsReopenSuppressed,
} from '@/app/runtime/settingsInstantPaint';

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsAppearance: () => ({
        language: 'ar',
        glassOpacity: 0.7,
        fontSize: 'medium',
        highContrast: false,
        reduceMotion: true,
        theme: 'dark',
        brandColor: '#E6C673',
    }),
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap', () => ({
    useSettingsShellFocusTrap: () => ({ onKeyDownCapture: () => undefined }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/useSettingsMobileSuspend', () => ({
    useSettingsMobileSuspend: () => undefined,
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoader', () => ({
    prefetchSettingsSection: vi.fn(),
}));

describe('SettingsShell open/close gesture hygiene', () => {
    beforeEach(() => {
        clearSettingsReopenSuppress();
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearSettingsReopenSuppress();
        vi.useRealTimers();
    });

    it('تركيب keepAlive مغلق لا يكبح إعادة فتح الترس', () => {
        render(
            <SettingsShell
                open={false}
                onClose={() => undefined}
                activeSection="appearance"
                onSectionChange={() => undefined}
            >
                <div>body</div>
            </SettingsShell>,
        );
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('زر الإغلاق لا يعمل قبل تسليح التفاعل، ثم يعمل فوراً', () => {
        const onClose = vi.fn();
        const { getByTestId, rerender } = render(
            <SettingsShell
                open={false}
                onClose={onClose}
                activeSection="appearance"
                onSectionChange={() => undefined}
            >
                <div>body</div>
            </SettingsShell>,
        );

        rerender(
            <SettingsShell
                open
                onClose={onClose}
                activeSection="appearance"
                onSectionChange={() => undefined}
            >
                <div>body</div>
            </SettingsShell>,
        );

        fireEvent.click(getByTestId('settings-shell-close'));
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            window.dispatchEvent(new Event('pointerup', { bubbles: true }));
            window.dispatchEvent(new Event('click', { bubbles: true }));
        });

        fireEvent.click(getByTestId('settings-shell-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('زر الإغلاق يستجيب على pointerdown بعد التسليح', () => {
        const onClose = vi.fn();
        const { getByTestId, rerender } = render(
            <SettingsShell
                open={false}
                onClose={onClose}
                activeSection="appearance"
                onSectionChange={() => undefined}
            >
                <div>body</div>
            </SettingsShell>,
        );

        rerender(
            <SettingsShell
                open
                onClose={onClose}
                activeSection="appearance"
                onSectionChange={() => undefined}
            >
                <div>body</div>
            </SettingsShell>,
        );

        act(() => {
            armSettingsOverlayInteraction();
        });

        fireEvent.pointerDown(getByTestId('settings-shell-close'), { button: 0 });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
