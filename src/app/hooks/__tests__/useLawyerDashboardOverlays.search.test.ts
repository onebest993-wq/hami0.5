import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — لا يملك حالة البحث الشامل', () => {
    it('لا يعرّض openGlobalSearch', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );

        expect('openGlobalSearch' in result.current).toBe(false);
        expect('showGlobalSearch' in result.current).toBe(false);
        expect('globalSearchShellMounted' in result.current).toBe(false);
    });
});
