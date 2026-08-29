import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    parseProfileKvOwnerId,
    redactProfileKvValueForViewer,
} from '@/app/services/profile/profileKvReadRedact';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';

const isFollowingMock = vi.fn<(followerId: string, followingId: string) => Promise<boolean>>();

vi.mock('@/app/services/forum/forumFollowRepository', () => ({
    ForumFollowRepository: {
        isFollowing: (followerId: string, followingId: string) => isFollowingMock(followerId, followingId),
    },
}));

function sampleProfile(pageAccess?: ProfilePageAccess): LawyerProfileData {
    return {
        header: {
            name: 'أحمد',
            title: 'محامٍ',
            coverImage: '',
            profileImage: 'https://cdn.example/a.jpg',
            profileImagePath: 'secret/path',
            phone: '07501234567',
            city: 'بغداد',
            syndicateId: 'SY-1',
        },
        sections: [
            {
                id: 'actions-1',
                type: 'actions',
                data: [{ id: 'a1', type: 'call', label: 'هاتف', value: '07501234567' }],
            },
        ],
        customization: {
            privacy: {
                pageAccess,
                showPhoneMeta: false,
                showCityMeta: true,
                showSyndicate: true,
                showContactChannels: true,
                showGallery: true,
                showCustomBlocks: true,
                hiddenContactIds: ['a1'],
            },
            appearance: { accentColor: 'gold', material: 'glass' },
            customBlocks: [{ id: 'b1' } as never],
        },
    };
}

describe('profileKvReadRedact', () => {
    beforeEach(() => {
        isFollowingMock.mockReset();
    });

    it('يستخرج معرّف المالك من مفتاح KV', () => {
        expect(parseProfileKvOwnerId('profile:user-1')).toBe('user-1');
        expect(parseProfileKvOwnerId('other:user-1')).toBeNull();
    });

    it('لا يُعدّل قيمة ملف المالك نفسه', async () => {
        const raw = sampleProfile('private');
        const out = await redactProfileKvValueForViewer('profile:owner-1', 'owner-1', raw);
        expect(out).toBe(raw);
        expect((out as LawyerProfileData).header.phone).toBe('07501234567');
        expect(isFollowingMock).not.toHaveBeenCalled();
    });

    it('يفرض redact الحقلي على الخادم لزائر يقرأ ملفاً عاماً (public)', async () => {
        const raw = sampleProfile('public');
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.header.phone).toBe('');
        expect(out.header.profileImagePath).toBeUndefined();
        expect(out.customization?.privacy.hiddenContactIds).toEqual([]);
        const actions = out.sections.find((s) => s.type === 'actions')?.data as { id: string }[];
        expect(actions).toEqual([]);
        expect(isFollowingMock).not.toHaveBeenCalled();
    });

    it('يفرض redact الحقلي عندما pageAccess غير معرّف (الافتراضي public)', async () => {
        const raw = sampleProfile(undefined);
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.header.phone).toBe('');
    });

    it('يحجب ملفاً private كاملاً عن أي زائر — صفر تسريب محتوى', async () => {
        const raw = sampleProfile('private');
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.header.name).toBe('أحمد');
        expect(out.header.phone).toBe('');
        expect(out.header.city).toBe('');
        expect(out.header.syndicateId).toBe('');
        expect(out.sections).toEqual([]);
        expect(out.customization?.customBlocks).toEqual([]);
        expect(isFollowingMock).not.toHaveBeenCalled();
    });

    it('يحجب ملفاً followers عن زائر لا يتابع صاحب الملف', async () => {
        isFollowingMock.mockResolvedValue(false);
        const raw = sampleProfile('followers');
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.sections).toEqual([]);
        expect(out.header.phone).toBe('');
        expect(isFollowingMock).toHaveBeenCalledWith('visitor-9', 'owner-1');
    });

    it('يسمح بملف followers لزائر يتابع فعلياً — يطبّق redact الحقلي فقط', async () => {
        isFollowingMock.mockResolvedValue(true);
        const raw = sampleProfile('followers');
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.sections.find((s) => s.type === 'actions')?.data).toEqual([]);
        expect(out.header.name).toBe('أحمد');
        expect(isFollowingMock).toHaveBeenCalledWith('visitor-9', 'owner-1');
    });

    it('فشل التحقق من المتابعة (استثناء) ⇒ يُعامَل كغير متابع (حجب لا سماح)', async () => {
        isFollowingMock.mockRejectedValue(new Error('network down'));
        const raw = sampleProfile('followers');
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            raw,
        )) as LawyerProfileData;
        expect(out.sections).toEqual([]);
    });

    it('يمرّر القيم غير المتعلقة بالملف كما هي', async () => {
        expect(await redactProfileKvValueForViewer('calendar:x', 'u', { a: 1 })).toEqual({ a: 1 });
        expect(await redactProfileKvValueForViewer('profile:u', 'v', null)).toBeNull();
    });
});
