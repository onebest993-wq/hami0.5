import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartFileDossierHeaderNavigation } from '@/app/components/lawyer/smart-modal/hooks/useSmartFileDossierHeaderNavigation';

describe('useSmartFileDossierHeaderNavigation', () => {
    it('زر المغادرة يستدعي onExitToProfile عند توفره', () => {
        const onClose = vi.fn();
        const onExitToProfile = vi.fn();
        const { result } = renderHook(() =>
            useSmartFileDossierHeaderNavigation({
                onClose,
                onExitToProfile,
                isTrashOpen: false,
                setIsTrashOpen: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDossierExit();
        });

        expect(onExitToProfile).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('زر المغادرة يستدعي onClose فقط بدون onExitToProfile', () => {
        const onClose = vi.fn();
        const { result } = renderHook(() =>
            useSmartFileDossierHeaderNavigation({
                onClose,
                isTrashOpen: false,
                setIsTrashOpen: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDossierExit();
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
