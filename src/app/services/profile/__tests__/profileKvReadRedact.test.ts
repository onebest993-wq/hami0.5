import { describe, expect, it } from 'vitest';
import {
    parseProfileKvOwnerId,
    redactProfileKvValueForViewer,
} from '@/app/services/profile/profileKvReadRedact';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

function sampleProfile(): LawyerProfileData {
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
                showPhoneMeta: false,
                showCityMeta: true,
                showSyndicate: true,
                showContactChannels: true,
                showGallery: true,
                showCustomBlocks: true,
                hiddenContactIds: ['a1'],
            },
            appearance: { accentColor: 'gold', material: 'glass' },
            customBlocks: [],
        },
    };
}

describe('profileKvReadRedact', () => {
    it('يستخرج معرّف المالك من مفتاح KV', () => {
        expect(parseProfileKvOwnerId('profile:user-1')).toBe('user-1');
        expect(parseProfileKvOwnerId('other:user-1')).toBeNull();
    });

    it('لا يُعدّل قيمة ملف المالك نفسه', () => {
        const raw = sampleProfile();
        const out = redactProfileKvValueForViewer('profile:owner-1', 'owner-1', raw);
        expect(out).toBe(raw);
        expect((out as LawyerProfileData).header.phone).toBe('07501234567');
    });

    it('يفرض redact على الخادم لزائر يقرأ ملف غيره', () => {
        const raw = sampleProfile();
        const out = redactProfileKvValueForViewer('profile:owner-1', 'visitor-9', raw) as LawyerProfileData;
        expect(out.header.phone).toBe('');
        expect(out.header.profileImagePath).toBeUndefined();
        expect(out.customization?.privacy.hiddenContactIds).toEqual([]);
        const actions = out.sections.find((s) => s.type === 'actions')?.data as { id: string }[];
        expect(actions).toEqual([]);
    });

    it('يمرّر القيم غير المتعلقة بالملف كما هي', () => {
        expect(redactProfileKvValueForViewer('calendar:x', 'u', { a: 1 })).toEqual({ a: 1 });
        expect(redactProfileKvValueForViewer('profile:u', 'v', null)).toBeNull();
    });
});
