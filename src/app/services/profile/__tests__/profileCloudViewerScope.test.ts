import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LawyerProfileData } from '@/app/services/profile/profileTypes';

const sampleProfile: LawyerProfileData = {
    header: {
        name: 'محامٍ زائر',
        title: 'محامٍ',
        coverImage: '',
        profileImage: '',
        profileImagePath: '/private/profile.png',
        coverImagePath: '/private/cover.png',
        phone: '07700000000',
        city: 'بغداد',
        workplace: 'مكتب بغداد',
        specialization: 'مدني',
        syndicateId: 'IRAQ-42',
    },
    sections: [
        {
            id: 'actions-1',
            type: 'actions',
            data: [
                { id: 'phone', type: 'call', label: 'اتصال', value: '07700000000' },
                { id: 'mail', type: 'email', label: 'بريد', value: 'a@example.com' },
            ],
        },
        { id: 'gallery-1', type: 'gallery', data: ['https://example.com/one.jpg'] },
    ],
    customization: {
        privacy: {
            showContactChannels: false,
            showGallery: false,
            showCustomBlocks: false,
            showPhoneMeta: false,
            showCityMeta: false,
            showSyndicate: false,
        },
        customBlocks: [{ id: 'secret', kind: 'text', title: 'داخلي', body: 'خاص' }],
    },
};

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(() => null),
        getItem: vi.fn(() => Promise.resolve(null)),
        setItemSync: vi.fn(),
        setItem: vi.fn(() => Promise.resolve()),
        waitForPendingSetItem: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('@/app/services/profileMediaService', () => ({
    refreshProfileMediaUrl: vi.fn(async (_path: string, current?: string) => current ?? ''),
    refreshProfileCustomizationMedia: vi.fn(async (c) => c),
}));

vi.mock('@/app/services/calendar/bridge', () => ({
    resolveCalendarUserId: vi.fn((id: string) => id),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({ data: { session: null } })),
        },
    },
}));

const cloudMocks = vi.hoisted(() => ({
    get: vi.fn(async () => sampleProfile),
    set: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        get: (...args: unknown[]) => cloudMocks.get(...args),
        set: (...args: unknown[]) => cloudMocks.set(...args),
    },
}));

describe('ProfileDB viewer scope', () => {
    beforeEach(() => {
        cloudMocks.get.mockClear();
        cloudMocks.set.mockClear();
        vi.resetModules();
    });

    it('يعيد نسخة redacted للزائر حتى لو كانت البيانات الخام كاملة', async () => {
        const { ProfileDB } = await import('@/app/services/cloud/lawyerProfileCloud');

        const result = await ProfileDB.getProfile('lawyer-owner', 'visitor-user');

        expect(result.header.phone).toBe('');
        expect(result.header.city).toBe('');
        expect(result.header.syndicateId).toBe('');
        expect(result.header.profileImagePath).toBeUndefined();
        expect(result.header.coverImagePath).toBeUndefined();
        expect(result.sections.find((s) => s.type === 'gallery')?.data).toEqual([]);
        expect(result.sections.find((s) => s.type === 'actions')?.data).toEqual([]);
        expect(result.customization?.customBlocks).toEqual([]);
    });
});
