import { describe, expect, it } from 'vitest';
import {
    collectProfileMediaPaths,
    profileMediaPathsOnlyIn,
    profileMediaPathsRemovedFrom,
} from '../profileMediaPaths';
import type { ProfilePageCustomization } from '../profilePageTypes';
import { defaultProfilePageCustomization } from '../profilePageDefaults';

function withBlocks(
    blocks: ProfilePageCustomization['customBlocks'],
): ProfilePageCustomization {
    return { ...defaultProfilePageCustomization(), customBlocks: blocks };
}

describe('profileMediaPaths', () => {
    it('collects image and canvas background storage paths', () => {
        const paths = collectProfileMediaPaths(
            withBlocks([
                {
                    id: 'i1',
                    kind: 'image',
                    title: 'صورة',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 120,
                    imageStoragePath: 'users/u1/repository/a.jpg',
                },
                {
                    id: 't1',
                    kind: 'text',
                    title: 'نص',
                    shape: 'rounded',
                    width: 'full',
                    minHeightPx: 80,
                    canvasStyle: {
                        enabled: true,
                        backgroundStoragePath: 'users/u1/repository/bg.jpg',
                    },
                },
            ]),
        );
        expect(paths).toEqual(['users/u1/repository/a.jpg', 'users/u1/repository/bg.jpg']);
    });

    it('detects paths removed after delete/replace', () => {
        const previous = withBlocks([
            {
                id: 'i1',
                kind: 'image',
                title: 'صورة',
                shape: 'rounded',
                width: 'full',
                minHeightPx: 120,
                imageStoragePath: 'users/u1/repository/old.jpg',
            },
        ]);
        const next = withBlocks([]);
        expect(profileMediaPathsRemovedFrom(previous, next)).toEqual([
            'users/u1/repository/old.jpg',
        ]);
    });

    it('detects draft-only uploads for discard cleanup', () => {
        const committed = withBlocks([
            {
                id: 'i1',
                kind: 'image',
                title: 'صورة',
                shape: 'rounded',
                width: 'full',
                minHeightPx: 120,
                imageStoragePath: 'users/u1/repository/kept.jpg',
            },
        ]);
        const draft = withBlocks([
            {
                id: 'i1',
                kind: 'image',
                title: 'صورة',
                shape: 'rounded',
                width: 'full',
                minHeightPx: 120,
                imageStoragePath: 'users/u1/repository/kept.jpg',
            },
            {
                id: 'i2',
                kind: 'image',
                title: 'جديد',
                shape: 'rounded',
                width: 'full',
                minHeightPx: 120,
                imageStoragePath: 'users/u1/repository/unsaved.jpg',
            },
        ]);
        expect(profileMediaPathsOnlyIn(draft, committed)).toEqual([
            'users/u1/repository/unsaved.jpg',
        ]);
    });
});
