import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const loadProfileCanvasBgEditorModule = vi.fn(() => Promise.resolve());
const isProfileCanvasBgEditorResolved = vi.fn(() => false);
const getCachedProfileCanvasBackgroundEditor = vi.fn(() => null);

vi.mock('@/app/runtime/profileCanvasBgEditorLoader', () => ({
    loadProfileCanvasBgEditorModule: (...args: unknown[]) => loadProfileCanvasBgEditorModule(...args),
    isProfileCanvasBgEditorResolved: () => isProfileCanvasBgEditorResolved(),
    getCachedProfileCanvasBackgroundEditor: () => getCachedProfileCanvasBackgroundEditor(),
    prefetchProfileCanvasBgEditorModule: vi.fn(),
}));

import { useProfileCanvasBackgroundEditorChunk } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditorChunk';

describe('useProfileCanvasBackgroundEditorChunk', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isProfileCanvasBgEditorResolved.mockReturnValue(false);
    });

    it('لا يحمّل عند الإغلاق', () => {
        renderHook(() => useProfileCanvasBackgroundEditorChunk(false));
        expect(loadProfileCanvasBgEditorModule).not.toHaveBeenCalled();
    });

    it('يحمّل عند الفتح', async () => {
        const { result } = renderHook(() => useProfileCanvasBackgroundEditorChunk(true));
        await waitFor(() => {
            expect(loadProfileCanvasBgEditorModule).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(result.current.ready).toBe(true);
        });
    });
});
