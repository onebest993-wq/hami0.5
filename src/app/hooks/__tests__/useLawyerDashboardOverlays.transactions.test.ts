import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLawyerDashboardOverlays } from '../useLawyerDashboardOverlays';

describe('useLawyerDashboardOverlays — لا يملك حالة المعاملات', () => {
    it('لا يعرّض openTransactionsHub', () => {
        const { result } = renderHook(() =>
            useLawyerDashboardOverlays({ setArchiveType: vi.fn() }),
        );

        expect('openTransactionsHub' in result.current).toBe(false);
        expect('showTransactions' in result.current).toBe(false);
    });
});
