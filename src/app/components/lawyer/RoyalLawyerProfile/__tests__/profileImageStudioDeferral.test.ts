import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildProfileEditPersistPayload } from '@/app/services/profile/buildProfileEditPersistPayload';

describe('profileImageStudioFx — FOUC-safe deferral', () => {
    const dir = resolve(__dirname, '..');
    const imageFx = readFileSync(resolve(dir, 'profileImageFx.css'), 'utf8');
    const studioFx = readFileSync(resolve(dir, 'profileImageStudioFx.css'), 'utf8');
    const studioEditor = readFileSync(
        resolve(dir, 'components/ImageBlockStudioEditor.tsx'),
        'utf8',
    );

    it('يحافظ على إطار العرض في sync بدون قواعد لوحة الاستوديو', () => {
        expect(imageFx).toContain('.profile-image-frame-wrap');
        expect(imageFx).not.toContain('.profile-studio-media-shape-grid');
        expect(imageFx).not.toContain('.profile-studio-image-interaction');
    });

    it('يحمّل شكل/حافة الاستوديو مع chunk المحرر فقط', () => {
        expect(studioFx).toContain('.profile-studio-media-shape-grid');
        expect(studioFx).toContain('.profile-studio-rim-grid');
        expect(studioEditor).toContain('profileImageStudioFx.css');
    });
});

describe('buildProfileEditPersistPayload', () => {
    it('يرفض اسماً فارغاً', () => {
        expect(() =>
            buildProfileEditPersistPayload(
                {
                    header: { name: '   ', title: '', phone: '', city: '', syndicateId: '' },
                    actions: [],
                    gallery: [],
                },
                {
                    header: { name: 'قديم', title: '', coverImage: '', profileImage: '' },
                    sections: [],
                    customization: undefined,
                } as never,
            ),
        ).toThrow('profile-edit-name-required');
    });

    it('يبني رأسًا مقطّعاً ويصفّي جهات اتصال مخفية يتيمة', () => {
        const payload = buildProfileEditPersistPayload(
            {
                header: {
                    name: '  أحمد  ',
                    title: 'محامٍ',
                    phone: '07801234567',
                    city: 'بغداد',
                    syndicateId: '123',
                },
                actions: [
                    {
                        id: 'call-1',
                        type: 'call',
                        label: 'هاتف',
                        value: '07801234567',
                    },
                ],
                gallery: [],
            },
            {
                header: { name: 'قديم', title: '', coverImage: '', profileImage: '' },
                sections: [],
                customization: {
                    privacy: { hiddenContactIds: ['call-1', 'gone'] },
                },
            } as never,
        );

        expect(payload.header.name).toBe('أحمد');
        expect(payload.actionIds.has('call-1')).toBe(true);
        expect(payload.customization.privacy.hiddenContactIds).toEqual(['call-1']);
    });
});
