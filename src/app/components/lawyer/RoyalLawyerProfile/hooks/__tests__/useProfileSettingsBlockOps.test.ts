import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useProfileSettingsBlockOps } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsBlockOps';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageDefaults';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/services/profileMediaService', () => ({
    uploadProfileMedia: vi.fn(),
    profileMediaErrorMessage: vi.fn(() => 'خطأ رفع'),
    removeProfileMediaPaths: vi.fn(async () => undefined),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { uploadProfileMedia } from '@/app/services/profileMediaService';
import { SmartToast } from '@/app/components/ui/SmartToast';

function useHarness(initial?: ProfilePageCustomization) {
    const [draft, setDraft] = useState(() => initial ?? defaultProfilePageCustomization());
    const baseline = defaultProfilePageCustomization();
    const ops = useProfileSettingsBlockOps({
        userId: 'owner-1',
        isOwnProfile: true,
        open: true,
        saving: false,
        draft,
        baseline,
        setDraft,
        setTab: vi.fn(),
    });
    return { draft, ops };
}

describe('useProfileSettingsBlockOps upload gens', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('رفع خلفية اللوحة لا يُبطل رفع صورة كتلة جارٍ', async () => {
        const resolvers: Array<(v: {
            displayUrl: string;
            source: 'cloud' | 'local';
            storagePath?: string;
        }) => void> = [];
        vi.mocked(uploadProfileMedia).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvers.push(resolve);
                }),
        );

        const { result } = renderHook(() => useHarness());

        await act(async () => {
            result.current.ops.addBlock('image');
            result.current.ops.addBlock('text');
        });

        const imageId = result.current.ops.imageBlocks[0]?.id;
        const textId = result.current.ops.textBlocks[0]?.id;
        expect(imageId).toBeTruthy();
        expect(textId).toBeTruthy();

        await act(async () => {
            result.current.ops.triggerBlockImage(imageId!);
            void result.current.ops.onBlockImageSelected(
                new File(['i'], 'i.jpg', { type: 'image/jpeg' }),
            );
        });

        await act(async () => {
            result.current.ops.triggerCanvasBg(textId!);
            void result.current.ops.onCanvasBgSelected(
                new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
            );
        });

        await act(async () => {
            result.current.ops.triggerCanvasBg(textId!);
            void result.current.ops.onCanvasBgSelected(
                new File(['c'], 'c.jpg', { type: 'image/jpeg' }),
            );
        });

        expect(result.current.ops.canvasBgEditor?.blockId).toBe(textId);
        expect(uploadProfileMedia).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolvers[0]!({
                displayUrl: 'https://cdn/img.jpg',
                source: 'cloud',
                storagePath: 'profiles/img.jpg',
            });
        });

        expect(SmartToast.success).toHaveBeenCalledWith('تم رفع الصورة');
        expect(result.current.ops.uploadingBlockId).toBeNull();

        await act(async () => {
            void result.current.ops.confirmCanvasBgEditor(
                new File(['c'], 'c-edited.jpg', { type: 'image/jpeg' }),
            );
        });

        expect(uploadProfileMedia).toHaveBeenCalledTimes(2);
        expect(resolvers.length).toBe(2);

        await act(async () => {
            resolvers[1]!({
                displayUrl: 'https://cdn/bg.jpg',
                source: 'cloud',
                storagePath: 'profiles/bg.jpg',
            });
        });

        expect(SmartToast.success).toHaveBeenCalledWith('تم رفع خلفية اللوحة');
    });

    it('حذف الكتلة أثناء الرفع يتجاهل النتيجة ولا يُظهر نجاحاً', async () => {
        let resolveUpload!: (v: {
            displayUrl: string;
            source: 'cloud' | 'local';
            storagePath?: string;
        }) => void;
        vi.mocked(uploadProfileMedia).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveUpload = resolve;
                }),
        );

        const { result } = renderHook(() => useHarness());

        await act(async () => {
            result.current.ops.addBlock('image');
        });
        const imageId = result.current.ops.imageBlocks[0]!.id;

        await act(async () => {
            result.current.ops.triggerBlockImage(imageId);
            void result.current.ops.onBlockImageSelected(
                new File(['i'], 'i.jpg', { type: 'image/jpeg' }),
            );
        });

        expect(result.current.ops.uploadingBlockId).toBe(imageId);

        await act(async () => {
            result.current.ops.removeBlock(imageId);
        });

        expect(result.current.ops.uploadingBlockId).toBeNull();

        await act(async () => {
            resolveUpload({
                displayUrl: 'https://cdn/orphan.jpg',
                source: 'cloud',
                storagePath: 'profiles/orphan.jpg',
            });
        });

        expect(SmartToast.success).not.toHaveBeenCalled();
        expect(result.current.draft.customBlocks.some((b) => b.id === imageId)).toBe(false);
    });
});
