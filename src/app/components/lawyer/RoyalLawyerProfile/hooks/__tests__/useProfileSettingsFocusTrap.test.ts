import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useProfileSettingsFocusTrap } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap';

describe('useProfileSettingsFocusTrap', () => {
    it('يستدعي onClose عند Escape', () => {
        const onClose = vi.fn();
        const sheetRef = createRef<HTMLDivElement>();

        renderHook(() => useProfileSettingsFocusTrap(true, sheetRef, onClose));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يستدعي onClose عند الإغلاق', () => {
        const onClose = vi.fn();
        const sheetRef = createRef<HTMLDivElement>();

        renderHook(() => useProfileSettingsFocusTrap(false, sheetRef, onClose));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('لا يستدعي onClose عند Escape إن عُطّل الإغلاق', () => {
        const onClose = vi.fn();
        const sheetRef = createRef<HTMLDivElement>();

        renderHook(() => useProfileSettingsFocusTrap(true, sheetRef, onClose, { closeEnabled: false }));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('يعيد Tab من خارج الورقة إلى أول عنصر داخلها', () => {
        const onClose = vi.fn();
        const sheet = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'داخل';
        sheet.appendChild(btn);
        document.body.appendChild(sheet);

        const outside = document.createElement('button');
        outside.textContent = 'خارج';
        document.body.appendChild(outside);
        outside.focus();

        const sheetRef = { current: sheet };
        renderHook(() => useProfileSettingsFocusTrap(true, sheetRef, onClose));

        act(() => {
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
            );
        });

        expect(document.activeElement).toBe(btn);

        sheet.remove();
        outside.remove();
    });
});
