import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

const getSignedUrl = vi.fn();

vi.mock('@/app/services/storage/lawyerStorageRuntime', () => ({
    LawyerStorage: {
        getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
        uploadSmartFile: vi.fn(),
    },
}));

describe('refreshProfileCustomizationMedia', () => {
    beforeEach(() => {
        getSignedUrl.mockReset();
    });

    it('re-signs block imageUrl from imageStoragePath without dropping the block', async () => {
        getSignedUrl.mockResolvedValue('https://fresh.example/a.jpg?sig=1');
        const { refreshProfileCustomizationMedia } = await import('@/app/services/profileMediaService');
        const input: ProfilePageCustomization = {
            privacy: {
                showPhoneMeta: true,
                showCityMeta: true,
                showSyndicate: true,
                showContactChannels: true,
                showGallery: true,
                showCustomBlocks: true,
                hiddenContactIds: [],
            },
            appearance: { accentColor: 'gold', material: 'glass', portraitFrame: 'classic' },
            customBlocks: [
                {
                    id: 'b1',
                    kind: 'image',
                    title: 'صورة',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageUrl: 'https://expired.example/a.jpg',
                    imageStoragePath: 'users/u1/repository/a.jpg',
                },
            ],
        };

        const next = await refreshProfileCustomizationMedia(input);
        expect(next?.customBlocks).toHaveLength(1);
        expect(next?.customBlocks[0]?.imageUrl).toBe('https://fresh.example/a.jpg?sig=1');
        expect(next?.customBlocks[0]?.imageStoragePath).toBe('users/u1/repository/a.jpg');
        expect(getSignedUrl).toHaveBeenCalledWith('users/u1/repository/a.jpg');
    });

    it('leaves blocks unchanged when no storage path', async () => {
        const { refreshProfileCustomizationMedia } = await import('@/app/services/profileMediaService');
        const input: ProfilePageCustomization = {
            privacy: {
                showPhoneMeta: true,
                showCityMeta: true,
                showSyndicate: true,
                showContactChannels: true,
                showGallery: true,
                showCustomBlocks: true,
                hiddenContactIds: [],
            },
            appearance: { accentColor: 'gold', material: 'glass', portraitFrame: 'classic' },
            customBlocks: [
                {
                    id: 'local',
                    kind: 'image',
                    title: 'صورة',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageUrl: 'data:image/jpeg;base64,/9j/4AAQ',
                },
            ],
        };
        const next = await refreshProfileCustomizationMedia(input);
        expect(getSignedUrl).not.toHaveBeenCalled();
        expect(next?.customBlocks[0]?.imageUrl).toBe(input.customBlocks[0]?.imageUrl);
    });
});
