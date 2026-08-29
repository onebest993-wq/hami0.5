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

    it('لا يغلق المخزن أثناء وجود طبقة تأكيد الأرشفة/السلة', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'execution-archive-trash-dialogs-layer');
        document.body.appendChild(layer);

        try {
            const onCloseArchive = vi.fn();
            renderHook(() =>
                useLawyerExecutionOverlayEscape({
                    archiveOpen: true,
                    executionFileOpen: false,
                    executionCreateOpen: false,
                    onCloseArchive,
                    onCloseExecutionFile: vi.fn(),
                }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(onCloseArchive).not.toHaveBeenCalled();
        } finally {
            layer.remove();
        }
    });

    it('لا يغلق المخزن أثناء وجود طبقة معاينة الإضبارة', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'execution-archive-preview-layer');
        document.body.appendChild(layer);

        try {
            const onCloseArchive = vi.fn();
            renderHook(() =>
                useLawyerExecutionOverlayEscape({
                    archiveOpen: true,
                    executionFileOpen: false,
                    executionCreateOpen: false,
                    onCloseArchive,
                    onCloseExecutionFile: vi.fn(),
                }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(onCloseArchive).not.toHaveBeenCalled();
        } finally {
            layer.remove();
        }
    });
});
