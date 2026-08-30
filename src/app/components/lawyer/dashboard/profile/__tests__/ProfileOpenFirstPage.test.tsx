import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { ProfileOpenFirstPage } from '@/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage';
import { resetUserIdentityUiStateForTests } from '@/app/services/profile/userIdentityUiState';
import { invalidateProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import {
    consumeProfileCoverCustomization,
    resetProfileCoverIntentsForTests,
} from '@/app/components/lawyer/dashboard/profile/profileCoverIntents';
import { useAuthUser } from '@/app/context/authHooks';

vi.mock('@/app/utils/lazyComponentsIntent', () => ({
    prefetchProfileSettingsSheet: vi.fn(),
}));

vi.mock('@/app/context/authHooks', () => ({
    useAuthUser: vi.fn(() => ({ id: 'lawyer-1' })),
}));

const OWNER = { id: 'lawyer-1' } as User;

describe('ProfileOpenFirstPage', () => {
    afterEach(() => {
        resetUserIdentityUiStateForTests();
        resetProfileCoverIntentsForTests();
        invalidateProfileWarmCache();
        vi.mocked(useAuthUser).mockReturnValue(OWNER);
    });

    it('يرسم الصفحة الكاملة: كروم + هيرو + قنوات/معرض — بلا مضيف استوديو', () => {
        render(<ProfileOpenFirstPage userId="lawyer-1" onBack={() => undefined} />);

        expect(screen.getByTestId('profile-open-first-page')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile')).toBeInTheDocument();
        expect(document.querySelector('[data-profile-page-body]')).toBeTruthy();
        expect(screen.getByTestId('lawyer-profile-edit')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-gallery')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-page-access')).toHaveAttribute(
            'data-page-access',
            'public',
        );
        expect(screen.queryByTestId('profile-settings-sheet')).toBeNull();
    });

    it('للجميع على الغطاء يحدّث الواجهة فوراً ويصفّر للشجرة الحية', () => {
        render(<ProfileOpenFirstPage userId="lawyer-1" onBack={() => undefined} />);

        fireEvent.click(screen.getByTestId('lawyer-profile-page-access'));

        expect(screen.getByTestId('lawyer-profile-page-access')).toHaveAttribute(
            'data-page-access',
            'followers',
        );
        expect(consumeProfileCoverCustomization()?.privacy.pageAccess).toBe('followers');
    });

    it('بلا مشاهد معروف — لا أدوات مالك (fail-closed)', () => {
        vi.mocked(useAuthUser).mockReturnValue(null);
        render(<ProfileOpenFirstPage userId="lawyer-1" onBack={() => undefined} />);

        expect(screen.getByTestId('profile-open-first-page')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-gallery')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-profile-page-access')).not.toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-profile-edit')).not.toBeInTheDocument();
    });
});
