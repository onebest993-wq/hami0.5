import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — لا يملك حالة المنتدى', () => {
    it('لا يعرّض openCommunityTab', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );

        expect('openCommunityTab' in result.current).toBe(false);
        expect('showCommunity' in result.current).toBe(false);
    });
});
