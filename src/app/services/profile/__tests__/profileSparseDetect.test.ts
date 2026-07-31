import { describe, expect, it } from 'vitest';
import {
    isProfilePaintReady,
    shouldAwaitCloudProfileSettle,
} from '@/app/services/profile/profileSparseDetect';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

describe('profileSparseDetect', () => {
    it('يعتبر الملف الفارغ غير جاهز للرسم', () => {
        expect(shouldAwaitCloudProfileSettle(null)).toBe(true);
        expect(isProfilePaintReady(null)).toBe(false);
        expect(
            shouldAwaitCloudProfileSettle({
                header: { name: 'أحمد', title: '', coverImage: '', profileImage: '' },
                sections: [],
            } as LawyerProfileData),
        ).toBe(true);
    });

    it('جاهز عند وجود صورة أو تواصل أو معرض', () => {
        expect(
            isProfilePaintReady({
                header: {
                    name: 'أحمد',
                    title: '',
                    coverImage: '',
                    profileImage: 'https://x/a.jpg',
                },
                sections: [],
            } as LawyerProfileData),
        ).toBe(true);

        expect(
            isProfilePaintReady({
                header: { name: 'أحمد', title: '', coverImage: '', profileImage: '' },
                sections: [
                    {
                        id: 'a',
                        type: 'actions',
                        data: [{ id: '1', type: 'call', label: 'ه', value: '1' }],
                    },
                ],
            } as LawyerProfileData),
        ).toBe(true);
    });
});
