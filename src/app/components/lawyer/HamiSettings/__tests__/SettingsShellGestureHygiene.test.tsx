import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SettingsShell } from '@/app/components/lawyer/HamiSettings/SettingsShell';
import {
    armSettingsOverlayInteraction,
    clearSettingsReopenSuppress,
    isSettingsReopenSuppressed,
    scheduleSettingsOverlayInteractionArm,
    SETTINGS_INTERACT_ARM_MS,
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

    it('زر الإغلاق يعمل فوراً بعد تسليح التفاعل من مسار الفتح', () => {
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
            armSettingsOverlayInteraction();
        });

        fireEvent.click(getByTestId('settings-shell-close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('زر الإغلاق لا يعمل بمهلة قصيرة بلا تسليح — يمنع إغلاق الفتحة الأولى', () => {
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
            vi.advanceTimersByTime(64);
        });

        fireEvent.click(getByTestId('settings-shell-close'));
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            scheduleSettingsOverlayInteractionArm();
            vi.advanceTimersByTime(SETTINGS_INTERACT_ARM_MS);
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

        fireEvent.pointerDown(getByTestId('settings-shell-close'), { button: 0 });
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            armSettingsOverlayInteraction();
        });

        fireEvent.pointerDown(getByTestId('settings-shell-close'), { button: 0 });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
