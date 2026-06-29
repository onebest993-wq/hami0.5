import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerExecutionOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape';

describe('useLawyerExecutionOverlayEscape', () => {
    it('closes creation modal before archive on Escape', () => {
        const onCloseExecutionCreate = vi.fn();
        const onCloseArchive = vi.fn();

        renderHook(() =>
            useLawyerExecutionOverlayEscape({
                archiveOpen: true,
                executionFileOpen: false,
                executionCreateOpen: true,
                onCloseArchive,
                onCloseExecutionFile: vi.fn(),
                onCloseExecutionCreate,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(onCloseExecutionCreate).toHaveBeenCalledTimes(1);
        expect(onCloseArchive).not.toHaveBeenCalled();
    });
});
