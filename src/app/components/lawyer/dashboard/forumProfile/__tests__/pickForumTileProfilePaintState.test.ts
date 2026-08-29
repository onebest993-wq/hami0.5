import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pickForumTileProfilePaintState } from '@/app/components/lawyer/dashboard/forumProfile/pickForumTileProfilePaintState';
import { invalidateProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import { resetLawyerProfileBootWarmPendingForTests } from '@/app/services/profile/profileBootWarmPending';
import {
    mergeUserIdentityUiState,
    resetUserIdentityUiStateForTests,
} from '@/app/services/profile/userIdentityUiState';

vi.mock('@/app/services/profile/lawyerProfileLocalRead', () => ({
    readLocalProfileSync: vi.fn(() => null),
    isLawyerProfileLocalUnread: vi.fn(() => false),
    lawyerProfileLocalRecordExists: vi.fn(() => false),
}));

describe('pickForumTileProfilePaintState', () => {
    beforeEach(() => {
        invalidateProfileWarmCache('lawyer-1');
        resetLawyerProfileBootWarmPendingForTests();
        resetUserIdentityUiStateForTests();
    });

    it('يفضّل اسم الجلسة/البذرة على اسم الخطاف الحي', () => {
        const state = pickForumTileProfilePaintState(
            'lawyer-1',
            { full_name: 'احمد مهدي الحسناوي' },
            'مطور حامي',
            '',
            'احمد مهدي الحسناوي',
        );
        expect(state.displayName).toBe('احمد مهدي الحسناوي');
        expect(state.displayName).not.toBe('مطور حامي');
        expect(state.isLoaded).toBe(true);
    });

    it('يعيد الهوية المجمّدة المحمّلة دون استبدالها بالخطاف الحي', () => {
        mergeUserIdentityUiState({
            userId: 'lawyer-1',
            displayName: 'اسم مجمّد',
            avatarUrl: '',
            profileInitial: 'ا',
            isLoaded: true,
        });
        const state = pickForumTileProfilePaintState(
            'lawyer-1',
            { full_name: 'احمد مهدي الحسناوي' },
            'مطور حامي',
            '',
            'احمد مهدي الحسناوي',
        );
        expect(state.displayName).toBe('اسم مجمّد');
        expect(state.isLoaded).toBe(true);
    });

    it('يغني التجميد المحمّل من احمد إلى أحمد مهدي دون استبداله بالخطاف', () => {
        mergeUserIdentityUiState({
            userId: 'lawyer-1',
            displayName: 'احمد',
            avatarUrl: '',
            profileInitial: 'ا',
            isLoaded: true,
        });
        const state = pickForumTileProfilePaintState(
            'lawyer-1',
            { full_name: 'أحمد مهدي' },
            'مطور حامي',
            '',
            'أحمد مهدي',
        );
        expect(state.displayName).toBe('أحمد مهدي');
        expect(state.displayName).not.toBe('مطور حامي');
        expect(state.isLoaded).toBe(true);
    });

    it('يثبّت الحساب الجديد بلا اسم بعد التسخين', () => {
        const state = pickForumTileProfilePaintState(
            'lawyer-new-nameless',
            { accountType: 'lawyer', verificationStatus: 'pending' },
            '',
            '',
            '',
        );
        expect(state.displayName).toBe('');
        expect(state.profileInitial).toBe('م');
        expect(state.isLoaded).toBe(true);
    });
});
