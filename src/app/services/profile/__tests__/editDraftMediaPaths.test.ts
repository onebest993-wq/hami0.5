import { describe, expect, it } from 'vitest';
import { collectEditDraftOrphanMediaPaths } from '@/app/services/profile/editDraftMediaPaths';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';

const committed = {
    header: {
        name: 'أحمد',
        title: '',
        coverImage: '',
        profileImage: 'https://cdn/a.jpg',
        profileImagePath: 'users/u1/avatar.jpg',
    },
    sections: [
        {
            id: 'gallery-1',
            type: 'gallery',
            data: [{ url: 'https://cdn/g1.jpg', focusX: 50, focusY: 50, zoom: 100, storagePath: 'users/u1/g1.jpg' }],
        },
    ],
} as LawyerProfileData;

describe('collectEditDraftOrphanMediaPaths', () => {
    it('يكتشف صورة شخصية ومعرض غير مُثبَّتين', () => {
        const draft: EditDraft = {
            header: {
                ...committed.header,
                profileImagePath: 'users/u1/avatar-new.jpg',
            },
            actions: [],
            gallery: [
                {
                    url: 'https://cdn/g2.jpg',
                    focusX: 50,
                    focusY: 50,
                    zoom: 100,
                    storagePath: 'users/u1/g2.jpg',
                },
            ],
        };

        expect(collectEditDraftOrphanMediaPaths(draft, committed)).toEqual([
            'users/u1/avatar-new.jpg',
            'users/u1/g2.jpg',
        ]);
    });

    it('لا يعيد مسارات الملف المحفوظ', () => {
        const draft: EditDraft = {
            header: { ...committed.header },
            actions: [],
            gallery: [
                {
                    url: 'https://cdn/g1.jpg',
                    focusX: 50,
                    focusY: 50,
                    zoom: 100,
                    storagePath: 'users/u1/g1.jpg',
                },
            ],
        };

        expect(collectEditDraftOrphanMediaPaths(draft, committed)).toEqual([]);
    });
});
