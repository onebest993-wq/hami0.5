import { describe, expect, it, vi } from 'vitest';
import { DisplayNameCorrectionError } from '@/app/services/profile/displayNameCorrectionClient';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { ProfileDB } from '@/app/services/lawyer-cloud';

vi.mock('@/app/services/lawyer-cloud', () => ({
    ProfileDB: {
        saveProfile: vi.fn(),
    },
}));

vi.mock('@/app/services/profile/displayNameCorrectionClient', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/services/profile/displayNameCorrectionClient')
    >();
    return {
        ...actual,
        submitDisplayNameCorrection: vi.fn(),
    };
});

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    setProfileWarmCache: vi.fn(),
}));

vi.mock('@/app/services/profile/gcProfileEditOrphanMedia', () => ({
    gcProfileEditOrphanMediaAfterSave: vi.fn(),
}));

import { submitDisplayNameCorrection } from '@/app/services/profile/displayNameCorrectionClient';
import { executeProfileEditCloudSave } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileEditPersist';

const previous = {
    header: { name: 'أحمد محمد علي', title: '', coverImage: '', profileImage: '' },
    sections: [] as never[],
};

describe('executeProfileEditCloudSave', () => {
    it('فشل شبكة تصحيح الاسم لا يمنع الحفظ المحلي', async () => {
        vi.mocked(submitDisplayNameCorrection).mockRejectedValue(
            new DisplayNameCorrectionError('تعذّر حفظ الاسم', 'network'),
        );
        vi.mocked(ProfileDB.saveProfile).mockResolvedValue({
            cloudSynced: false,
            localPersisted: true,
            profile: {
                header: { name: 'سعد كريم عباس', title: '', coverImage: '', profileImage: '' },
                sections: [],
            },
        } as never);

        const setProfile = vi.fn();
        const result = await executeProfileEditCloudSave({
            userId: 'owner-1',
            header: { name: 'سعد كريم عباس', title: '', coverImage: '', profileImage: '' },
            sections: [],
            customization: defaultProfilePageCustomization(),
            actionIds: new Set(),
            previousProfile: previous as never,
            profileRef: { current: previous as never },
            saveEpoch: 1,
            saveEpochRef: { current: 1 },
            userIdRef: { current: 'owner-1' },
            isOwnProfileRef: { current: true },
            setProfile,
        });

        expect(ProfileDB.saveProfile).toHaveBeenCalled();
        expect(result.cloudSynced).toBe(false);
        expect(setProfile).toHaveBeenCalled();
    });
});
