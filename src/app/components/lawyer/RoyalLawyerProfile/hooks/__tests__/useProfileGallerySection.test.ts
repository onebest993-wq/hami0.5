import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useProfileGallerySection } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileGallerySection';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';

vi.mock('@/app/services/profile/editDraftMediaPaths', () => ({
    discardUnsavedMediaPathUnlessCommitted: vi.fn(),
}));

const g = (id: string): ProfileGalleryItem => ({
    url: `https://cdn.example/${id}.jpg`,
    focusX: 50,
    focusY: 50,
    zoom: 1,
    storagePath: `gallery/${id}.jpg`,
});

function useHarness(initial: ProfileGalleryItem[]) {
    const [draft, setDraft] = useState<EditDraft>({
        header: { name: 'احمد', title: '', coverImage: '', profileImage: '' },
        actions: [],
        gallery: initial,
    });
    const gallery = useProfileGallerySection({
        isEditing: true,
        readOnly: false,
        draft,
        setDraft,
        gallery: draft.gallery,
        committedGalleryPaths: [],
        uploading: null,
        screenActive: true,
    });
    return { gallery, draft };
}

describe('useProfileGallerySection', () => {
    it('لا يفتح معايناً خارج الحدود ويغلق عند الفراغ', () => {
        const { result } = renderHook(() => useHarness([]));
        act(() => result.current.gallery.openViewer(0, 'view'));
        expect(result.current.gallery.viewer.open).toBe(false);
        expect(result.current.gallery.activeItem).toBeNull();
    });

    it('يفتح ويغلق ويعدّل العنصر النشط', () => {
        const { result } = renderHook(() => useHarness([g('a'), g('b')]));
        act(() => result.current.gallery.openViewer(1, 'view'));
        expect(result.current.gallery.viewer).toEqual({ open: true, index: 1, mode: 'view' });
        expect(result.current.gallery.activeItem?.url).toContain('b.jpg');
        act(() => result.current.gallery.closeViewer());
        expect(result.current.gallery.viewer.open).toBe(false);
    });

    it('الحذف يزيح مؤشر المعاين أو يغلقه', () => {
        const { result } = renderHook(() => useHarness([g('a'), g('b'), g('c')]));
        act(() => result.current.gallery.openViewer(2, 'adjust'));
        act(() => result.current.gallery.removeAt(0));
        expect(result.current.draft.gallery).toHaveLength(2);
        expect(result.current.gallery.viewer).toMatchObject({ open: true, index: 1 });
        act(() => result.current.gallery.removeAt(1));
        expect(result.current.gallery.viewer.open).toBe(false);
        expect(result.current.draft.gallery).toHaveLength(1);
    });
});
