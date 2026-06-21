import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — المنتدى', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح شاشة المنتدى مع إغلاق overlays العابرة', () => {
    const { result } = renderHook(() =>
        useLawyerDashboardOverlays({ setArchiveType: vi.fn(), userId: 'lawyer-1' }),
    );

        act(() => {
            result.current.openCommunityTab();
        });

        expect(result.current.showCommunity).toBe(true);
    });
});
