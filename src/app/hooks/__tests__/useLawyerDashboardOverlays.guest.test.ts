import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

describe('useLawyerDashboardOverlays — الضيف التجريبي', () => {
    it('لا يملك مسار فتح البحث (نُقل إلى useLawyerDashboardGlobalSearch)', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );

        expect('openGlobalSearch' in result.current).toBe(false);
    });

    it('إعادة التركيب أثناء جلسة فتح تبقي تبويب الملف', () => {
        resetProfileOpenedThisPageForTests();
        markProfileOpenedThisPage();
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );
        expect(result.current.activeTab).toBe('profile');
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        resetProfileOpenedThisPageForTests();
    });
});
