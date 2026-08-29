import { describe, expect, it } from 'vitest';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import { redactProfileForVisitorView } from '@/app/services/profile/profileVisitorView';

function sampleProfile(): LawyerProfileData {
    return {
        header: {
            name: 'أحمد',
            title: 'محامٍ',
            coverImage: '',
            profileImage: 'https://cdn.example/avatar.jpg',
            profileImagePath: 'lawyer_files:u1:avatar.jpg',
            phone: '07501234567',
            city: 'بغداد',
            syndicateId: 'SY-99',
        },
        sections: [
            {
                id: 'actions-1',
                type: 'actions',
                data: [
                    { id: 'a1', type: 'email', label: 'بريد', value: 'a@example.com' },
                    { id: 'a2', type: 'call', label: 'هاتف', value: '07501234567' },
                ],
            },
            {
                id: 'gallery-1',
                type: 'gallery',
                data: ['https://cdn.example/g1.jpg'],
            },
        ],
        customization: {
            privacy: {
                showPhoneMeta: false,
                showCityMeta: true,
                showSyndicate: false,
                showContactChannels: true,
                showGallery: false,
                showCustomBlocks: false,
                hiddenContactIds: ['a2'],
            },
            appearance: { accentColor: 'gold', material: 'glass' },
            customBlocks: [{ id: 'b1', kind: 'text', title: 'نص', order: 0 }],
        },
    };
}

describe('redactProfileForVisitorView', () => {
    it('يزيل meta وgallery وblocks وقنوات مخفية للزائر', () => {
        const redacted = redactProfileForVisitorView(sampleProfile());

        expect(redacted.header.phone).toBe('');
        expect(redacted.header.city).toBe('بغداد');
        expect(redacted.header.syndicateId).toBe('');
        expect(redacted.header.profileImagePath).toBeUndefined();

        const actions = redacted.sections.find((s) => s.type === 'actions')?.data as { id: string }[];
        expect(actions.map((a) => a.id)).toEqual(['a1']);

        const gallery = redacted.sections.find((s) => s.type === 'gallery')?.data as unknown[];
        expect(gallery).toEqual([]);

        expect(redacted.customization?.customBlocks).toEqual([]);
    });

    it('يبقي روابط المعرض/الكتل للزائر ويزيل مسارات التخزين', () => {
        const profile = sampleProfile();
        profile.customization!.privacy.showGallery = true;
        profile.customization!.privacy.showCustomBlocks = true;
        profile.sections = profile.sections.map((section) =>
            section.type === 'gallery'
                ? {
                      ...section,
                      data: [
                          {
                              url: 'https://cdn.example/g1.jpg',
                              focusX: 50,
                              focusY: 50,
                              zoom: 100,
                              storagePath: 'users/u1/g1.jpg',
                          },
                      ],
                  }
                : section,
        );
        profile.customization!.customBlocks = [
            {
                id: 'b1',
                kind: 'image',
                title: 'صورة',
                order: 0,
                imageUrl: 'https://cdn.example/block.jpg',
                imageStoragePath: 'users/u1/block.jpg',
                canvasStyle: {
                    backgroundStoragePath: 'users/u1/bg.jpg',
                },
            } as never,
        ];

        const redacted = redactProfileForVisitorView(profile);
        const gallery = redacted.sections.find((s) => s.type === 'gallery')?.data as Array<{
            url: string;
            storagePath?: string;
        }>;
        expect(gallery[0]?.url).toBe('https://cdn.example/g1.jpg');
        expect(gallery[0]?.storagePath).toBeUndefined();

        const block = redacted.customization?.customBlocks[0] as {
            imageUrl?: string;
            imageStoragePath?: string;
            canvasStyle?: { backgroundStoragePath?: string };
        };
        expect(block.imageUrl).toBe('https://cdn.example/block.jpg');
        expect(block.imageStoragePath).toBeUndefined();
        expect(block.canvasStyle?.backgroundStoragePath).toBeUndefined();
    });

    it('يفرغ قنوات التواصل عند إخفائها بالكامل', () => {
        const profile = sampleProfile();
        profile.customization!.privacy.showContactChannels = false;
        const redacted = redactProfileForVisitorView(profile);
        const actions = redacted.sections.find((s) => s.type === 'actions')?.data as unknown[];
        expect(actions).toEqual([]);
    });
});
