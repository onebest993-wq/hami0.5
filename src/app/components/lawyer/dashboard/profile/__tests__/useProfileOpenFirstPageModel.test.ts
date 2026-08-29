import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProfileOpenFirstPageModel } from '@/app/components/lawyer/dashboard/profile/useProfileOpenFirstPageModel';
import {
    consumeProfileCoverCustomization,
    resetProfileCoverIntentsForTests,
} from '@/app/components/lawyer/dashboard/profile/profileCoverIntents';
import { invalidateProfileWarmCache, setProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import {
    publishUserIdentityUiState,
    resetUserIdentityUiStateForTests,
} from '@/app/services/profile/userIdentityUiState';
import {
    normalizeProfilePageCustomization,
    type ProfilePageCustomization,
} from '@/app/services/profile/profilePageCustomization';

describe('useProfileOpenFirstPageModel', () => {
    afterEach(() => {
        resetUserIdentityUiStateForTests();
        resetProfileCoverIntentsForTests();
        invalidateProfileWarmCache();
    });

    it('يتابع الهوية بعد أول إطار — لا يتجمّد الغطاء على لقطة ناقصة', () => {
        const { result } = renderHook(() => useProfileOpenFirstPageModel('lawyer-1', () => undefined));

        act(() => {
            publishUserIdentityUiState({
                userId: 'lawyer-1',
                displayName: 'سعد النوري',
                avatarUrl: '',
                profileInitial: 'س',
                isLoaded: true,
            });
        });

        expect(result.current.displayNamePublic).toBe('سعد النوري');
        expect(result.current.initials).toBe('س');
    });

    it('يتابع الكاش الدافئ حتى تمتلئ القنوات/المعرض قبل الاعتماد', () => {
        const { result } = renderHook(() => useProfileOpenFirstPageModel('lawyer-1', () => undefined));

        act(() => {
            setProfileWarmCache('lawyer-1', {
                ...DEFAULT_LAWYER_PROFILE,
                header: {
                    ...DEFAULT_LAWYER_PROFILE.header,
                    name: 'علي الكاظم',
                    city: 'بغداد',
                },
                sections: [
                    { id: 'bio-1', type: 'bio', data: '' },
                    {
                        id: 'actions-1',
                        type: 'actions',
                        data: [{ id: 'c1', type: 'call', label: 'هاتف', value: '07501234567' }],
                    },
                    { id: 'gallery-1', type: 'gallery', data: [] },
                ],
            });
        });

        expect(result.current.displayNamePublic).toBe('علي الكاظم');
        expect(result.current.actions).toHaveLength(1);
        expect(result.current.cityPublic).toBe('بغداد');
    });

    it('للجميع على الغطاء يحدّث الواجهة فوراً ويصفّر الحفظ للشجرة الحية', async () => {
        const { result } = renderHook(() => useProfileOpenFirstPageModel('lawyer-1', () => undefined));
        const next: ProfilePageCustomization = {
            ...normalizeProfilePageCustomization(undefined),
            privacy: {
                ...normalizeProfilePageCustomization(undefined).privacy,
                pageAccess: 'followers',
            },
        };

        await act(async () => {
            await result.current.saveCustomization(next);
        });

        expect(result.current.customization.privacy.pageAccess).toBe('followers');
        expect(consumeProfileCoverCustomization()?.privacy.pageAccess).toBe('followers');
    });
});
