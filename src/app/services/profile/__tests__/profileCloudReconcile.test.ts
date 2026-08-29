import { describe, expect, it } from 'vitest';
import { reconcileOwnerProfileFromCloud } from '@/app/services/profile/profileCloudReconcile';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

function baseProfile(overrides: Partial<LawyerProfileData> = {}): LawyerProfileData {
    return {
        header: { name: 'E2E Dev', title: 'محامٍ', coverImage: '', profileImage: '' },
        sections: [
            { id: 'actions-1', type: 'actions', data: [] },
            { id: 'gallery-1', type: 'gallery', data: [] },
        ],
        ...overrides,
    };
}

describe('reconcileOwnerProfileFromCloud', () => {
    it('يحافظ على المعرض والقنوات المحلية أمام سحابة شحيحة', () => {
        const local = baseProfile({
            sections: [
                {
                    id: 'actions-1',
                    type: 'actions',
                    data: [{ id: 'call', type: 'call', label: 'هاتف', value: '07801234567' }],
                },
                {
                    id: 'gallery-1',
                    type: 'gallery',
                    data: [{ url: 'https://cdn.example.com/g.jpg', focusX: 50, focusY: 50, zoom: 100 }],
                },
            ],
        });
        const remote = baseProfile({ header: { ...baseProfile().header, name: 'سحابة' } });

        const next = reconcileOwnerProfileFromCloud(local, remote);
        expect(getActionValues(next)).toEqual(['07801234567']);
        expect(getGalleryUrls(next)).toEqual(['https://cdn.example.com/g.jpg']);
        expect(next.header.name).toBe('E2E Dev');
    });

    it('يأخذ السحابة الغنية عندما المحلي شحيح', () => {
        const local = baseProfile();
        const remote = baseProfile({
            header: { ...baseProfile().header, name: 'من السحابة' },
            sections: [
                {
                    id: 'actions-1',
                    type: 'actions',
                    data: [{ id: 'call-1', type: 'call', label: 'هاتف', value: '07701112233' }],
                },
            ],
        });
        const next = reconcileOwnerProfileFromCloud(local, remote);
        expect(getActionValues(next)).toEqual(['07701112233']);
        expect(next.header.name).toBe('من السحابة');
    });

    it('يدمج قنوات ومعرضاً من الطرفين', () => {
        const local = baseProfile({
            sections: [
                {
                    id: 'actions-1',
                    type: 'actions',
                    data: [{ id: 'call', type: 'call', label: 'هاتف', value: '07801111111' }],
                },
                { id: 'gallery-1', type: 'gallery', data: [] },
            ],
        });
        const remote = baseProfile({
            header: { ...baseProfile().header, profileImage: 'https://cdn.example.com/a.jpg' },
            sections: [
                { id: 'actions-1', type: 'actions', data: [] },
                {
                    id: 'gallery-1',
                    type: 'gallery',
                    data: [{ url: 'https://cdn.example.com/g.jpg', focusX: 50, focusY: 50, zoom: 100 }],
                },
            ],
        });
        const next = reconcileOwnerProfileFromCloud(local, remote);
        expect(getActionValues(next)).toEqual(['07801111111']);
        expect(getGalleryUrls(next)).toEqual(['https://cdn.example.com/g.jpg']);
        expect(next.header.profileImage).toBe('https://cdn.example.com/a.jpg');
    });
});

function getActionValues(profile: LawyerProfileData): string[] {
    const section = profile.sections.find((s) => s.type === 'actions');
    const data = Array.isArray(section?.data) ? section.data : [];
    return data.map((item) => (item as { value: string }).value);
}

function getGalleryUrls(profile: LawyerProfileData): string[] {
    const section = profile.sections.find((s) => s.type === 'gallery');
    const data = Array.isArray(section?.data) ? section.data : [];
    return data.map((item) => (item as { url: string }).url);
}
