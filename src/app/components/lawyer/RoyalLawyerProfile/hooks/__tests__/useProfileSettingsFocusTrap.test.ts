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
});
