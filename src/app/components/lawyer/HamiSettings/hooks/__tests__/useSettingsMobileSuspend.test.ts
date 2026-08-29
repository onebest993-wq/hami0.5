import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsMobileSuspend } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsMobileSuspend';

describe('useSettingsMobileSuspend', () => {
    it('يزيل التركيز عند pagehide و visibilitychange', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        expect(document.activeElement).toBe(input);

        renderHook(() => useSettingsMobileSuspend(true));

        window.dispatchEvent(new Event('pagehide'));
        expect(document.activeElement).not.toBe(input);

        input.focus();
        expect(document.activeElement).toBe(input);
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.activeElement).not.toBe(input);

        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        input.focus();
        expect(document.activeElement).toBe(input);
        window.dispatchEvent(
            new CustomEvent('hami-native-app-state', { detail: { isActive: false } }),
        );
        expect(document.activeElement).not.toBe(input);

        input.remove();
    });
});
