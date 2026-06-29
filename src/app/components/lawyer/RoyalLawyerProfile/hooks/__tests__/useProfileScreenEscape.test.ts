import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileScreenEscape } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileScreenEscape';

describe('useProfileScreenEscape', () => {
    it('يستدعي onBack عند Escape بدون استوديو أو تحرير', () => {
        const onBack = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onCancelEdit: vi.fn(),
                onBack,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('يلغي التحرير قبل الرجوع عند Escape', () => {
        const onCancelEdit = vi.fn();
        const onBack = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                isEditing: true,
                onCloseSettings: vi.fn(),
                onCancelEdit,
                onBack,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onCancelEdit).toHaveBeenCalledTimes(1);
        expect(onBack).not.toHaveBeenCalled();
    });

    it('يتجاهل Escape عند فتح استوديو الصفحة', () => {
        const onBack = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: true,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onCancelEdit: vi.fn(),
                onBack,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onBack).not.toHaveBeenCalled();
    });
});
