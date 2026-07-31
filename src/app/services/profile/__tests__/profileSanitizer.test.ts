import { describe, expect, it } from 'vitest';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';

describe('sanitizeLawyerProfile', () => {
    it('لا ينهار عند غياب sections', () => {
        const cleaned = sanitizeLawyerProfile({
            header: { name: 'محامٍ', title: '' },
            customization: {},
        } as LawyerProfileData);
        expect(cleaned.sections).toEqual([]);
        expect(cleaned.header.name).toBe('محامٍ');
    });

    it('يقصّ أطوال الاسم وقنوات التواصل عند التحميل', () => {
        const raw: LawyerProfileData = {
            header: { name: 'ن'.repeat(100), title: 'محامٍ' },
            sections: [
                {
                    type: 'actions',
                    data: [
                        {
                            id: 'a1',
                            type: 'call',
                            label: 'ب'.repeat(60),
                            value: '07501234567',
                        },
                    ],
                },
            ],
            customization: {},
        };

        const cleaned = sanitizeLawyerProfile(raw);
        expect(cleaned.header.name.length).toBe(80);
        const action = cleaned.sections[0]?.data?.[0] as { label: string; value: string };
        expect(action.label.length).toBe(48);
        expect(action.value).toBe('07501234567');
    });

    it('يسقط قنوات تواصل غير صالحة عند التنقية', () => {
        const raw: LawyerProfileData = {
            header: { name: 'محامٍ', title: 'محامٍ' },
            sections: [
                {
                    type: 'actions',
                    data: [
                        { id: 'bad', type: 'email', label: 'بريد', value: 'not-an-email' },
                        { id: 'ok', type: 'email', label: 'بريد', value: 'ok@example.com' },
                    ],
                },
            ],
            customization: {},
        };
        const cleaned = sanitizeLawyerProfile(raw);
        const actions = cleaned.sections[0]?.data as { id: string }[];
        expect(actions.map((a) => a.id)).toEqual(['ok']);
    });

    it('يحافظ على مسار الأفاتار حتى لو الرابط فارغ/منتهي', () => {
        const raw: LawyerProfileData = {
            header: {
                name: 'محامٍ',
                title: 'محامٍ',
                profileImage: '',
                profileImagePath: 'owner-1/repository/avatar.jpg',
            },
            sections: [],
            customization: {},
        };
        const cleaned = sanitizeLawyerProfile(raw);
        expect(cleaned.header.profileImagePath).toBe('owner-1/repository/avatar.jpg');
    });

    it('يحافظ على عنصر معرض بمسار حتى لو الرابط منتهياً', () => {
        const raw: LawyerProfileData = {
            header: { name: 'محامٍ', title: 'محامٍ' },
            sections: [
                {
                    id: 'gallery-1',
                    type: 'gallery',
                    data: [
                        {
                            url: 'javascript:alert(1)',
                            storagePath: 'owner-1/repository/g1.jpg',
                            focusX: 40,
                            focusY: 60,
                            zoom: 110,
                        },
                    ],
                },
            ],
            customization: {},
        };
        const cleaned = sanitizeLawyerProfile(raw);
        const gallery = cleaned.sections.find((s) => s.type === 'gallery')?.data as Array<{
            url: string;
            storagePath?: string;
            focusX: number;
        }>;
        expect(gallery).toHaveLength(1);
        expect(gallery[0]?.storagePath).toBe('owner-1/repository/g1.jpg');
        expect(gallery[0]?.url).toBe('');
        expect(gallery[0]?.focusX).toBe(40);
    });

    it('يحافظ على عناصر المعرض ككائنات url/focus/zoom', () => {
        const raw: LawyerProfileData = {
            header: { name: 'محامٍ', title: 'محامٍ' },
            sections: [
                {
                    id: 'gallery-1',
                    type: 'gallery',
                    data: [
                        { url: 'https://example.com/a.jpg', focusX: 40, focusY: 60, zoom: 120 },
                        'https://example.com/b.jpg',
                    ],
                },
            ],
            customization: {},
        };

        const cleaned = sanitizeLawyerProfile(raw);
        const gallery = cleaned.sections.find((s) => s.type === 'gallery')?.data as Array<{
            url: string;
            focusX: number;
            focusY: number;
            zoom: number;
        }>;
        expect(gallery).toHaveLength(2);
        expect(gallery[0]).toEqual({
            url: 'https://example.com/a.jpg',
            focusX: 40,
            focusY: 60,
            zoom: 120,
        });
        expect(gallery[1]).toEqual({
            url: 'https://example.com/b.jpg',
            focusX: 50,
            focusY: 50,
            zoom: 100,
        });
    });
});
