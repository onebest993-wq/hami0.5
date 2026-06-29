import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — الضيف التجريبي', () => {
    it('لا يملك مسار فتح البحث (نُقل إلى useLawyerDashboardGlobalSearch)', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );

        expect('openGlobalSearch' in result.current).toBe(false);
    });
});
