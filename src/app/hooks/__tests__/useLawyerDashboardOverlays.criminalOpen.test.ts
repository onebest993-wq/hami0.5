import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const contractMocks = vi.hoisted(() => ({
    openCriminalDossierWithContract: vi.fn((caseId: string, commit: (id: string) => void) => {
        commit(String(caseId).trim());
    }),
}));

const authMocks = vi.hoisted(() => ({
    isRealSignedIn: vi.fn(() => true),
    resolveShellAuthUserId: vi.fn(() => 'user-1'),
}));

vi.mock('@/app/runtime/criminalOpenContract', () => contractMocks);
vi.mock('@/app/services/auth/shellAuth', () => authMocks);
vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';

describe('openCriminalCase — عبر criminalOpenContract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMocks.isRealSignedIn.mockReturnValue(true);
        authMocks.resolveShellAuthUserId.mockReturnValue('user-1');
    });

    it('يركب caseId فوراً عبر العقد', async () => {
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.openCriminalCase('cr-1');
            await Promise.resolve();
        });

        expect(contractMocks.openCriminalDossierWithContract).toHaveBeenCalledWith(
            'cr-1',
            expect.any(Function),
        );
        expect(result.current.criminalDashboardCaseId).toBe('cr-1');
    });

    it('يرفض الفتح بدون جلسة موقّعة', async () => {
        authMocks.isRealSignedIn.mockReturnValue(false);
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.openCriminalCase('cr-blocked');
            await Promise.resolve();
        });

        expect(contractMocks.openCriminalDossierWithContract).not.toHaveBeenCalled();
        expect(result.current.criminalDashboardCaseId).toBeNull();
    });
});
