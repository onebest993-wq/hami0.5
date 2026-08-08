import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileStudioEditorChunk } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileStudioEditorChunk';

const loadProfileStudioChunk = vi.fn(() => Promise.resolve());
const isProfileStudioChunkResolved = vi.fn(() => false);

vi.mock('@/app/runtime/profileSettingsStudioTabsLoader', () => ({
    loadProfileStudioChunk: (...args: unknown[]) => loadProfileStudioChunk(...args),
    isProfileStudioChunkResolved: (...args: unknown[]) => isProfileStudioChunkResolved(...args),
    prefetchProfileStudioChunk: vi.fn(),
    getCachedTextBlockStudioEditor: () => null,
    getCachedImageBlockStudioEditor: () => null,
}));

describe('useProfileStudioEditorChunk', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isProfileStudioChunkResolved.mockReturnValue(false);
    });

    it('لا يحمّل المحرّر عندما يكون معطّلاً', () => {
        renderHook(() => useProfileStudioEditorChunk('text', false));
        expect(loadProfileStudioChunk).not.toHaveBeenCalled();
    });

    it('يحمّل محرّر النص عند التفعيل', async () => {
        renderHook(() => useProfileStudioEditorChunk('text', true));
        await waitFor(() => {
            expect(loadProfileStudioChunk).toHaveBeenCalledWith('textEditor');
        });
    });
});
