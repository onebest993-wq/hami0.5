import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const contractMocks = vi.hoisted(() => ({
    openCriminalDossierWithContract: vi.fn((caseId: string, commit: (id: string) => void) => {
        commit(String(caseId).trim());
    }),
}));

const authMocks = vi.hoisted(() => ({
    isRealSignedIn: vi.fn(() => true),
    hasLocalAppSession: vi.fn(() => true),
    resolveShellAuthUserId: vi.fn(() => 'user-1'),
}));

vi.mock('@/app/runtime/criminalOpenContract', () => contractMocks);
vi.mock('@/app/services/auth/shellAuth', () => authMocks);
vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/app/runtime/lawsuitsOverlayEntryLoader', () => ({
    loadLawsuitsOverlayEntry: vi.fn(async () => ({})),
    prefetchLawsuitsOverlayEntry: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
    error: vi.fn(),
}));
vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: toastMocks.error, success: vi.fn(), info: vi.fn() },
}));

import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';

describe('openCriminalCase — عبر criminalOpenContract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMocks.isRealSignedIn.mockReturnValue(true);
        authMocks.hasLocalAppSession.mockReturnValue(true);
        authMocks.resolveShellAuthUserId.mockReturnValue('user-1');
    });

    it('يركب caseId فوراً عبر العقد', async () => {
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.openCriminalCase('cr-1');
        });

        await waitFor(() => {
            expect(contractMocks.openCriminalDossierWithContract).toHaveBeenCalledWith(
                'cr-1',
                expect.any(Function),
            );
        });
        expect(result.current.criminalDashboardCaseId).toBe('cr-1');
    });

    it('يرفض الفتح بدون جلسة محلية', async () => {
        authMocks.hasLocalAppSession.mockReturnValue(false);
        authMocks.resolveShellAuthUserId.mockReturnValue(null);
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.openCriminalCase('cr-blocked');
            await Promise.resolve();
        });

        expect(contractMocks.openCriminalDossierWithContract).not.toHaveBeenCalled();
        expect(result.current.criminalDashboardCaseId).toBeNull();
        expect(toastMocks.error).toHaveBeenCalled();
    });

    it('من مخزن الدعاوى: الإغلاق يعيد مساحة الدعاوى', async () => {
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.setShowLawsuitsWorkspace(true);
        });
        expect(result.current.showLawsuitsWorkspace).toBe(true);

        await act(async () => {
            result.current.openCriminalCase('cr-return', { fromLawsuitsWorkspace: true });
        });

        expect(result.current.criminalDashboardCaseId).toBe('cr-return');
        expect(result.current.showLawsuitsWorkspace).toBe(true);

        await act(async () => {
            result.current.closeCriminalCase();
        });

        expect(result.current.criminalDashboardCaseId).toBeNull();
        expect(result.current.showLawsuitsWorkspace).toBe(true);
    });

    it('بدون fromLawsuitsWorkspace: يغلق مساحة الدعاوى عند الفتح', async () => {
        const setArchiveType = vi.fn();
        const { result } = renderHook(() => useLawyerDashboardOverlays({ setArchiveType }));

        await act(async () => {
            result.current.setShowLawsuitsWorkspace(true);
        });

        await act(async () => {
            result.current.openCriminalCase('cr-main');
        });

        expect(result.current.criminalDashboardCaseId).toBe('cr-main');
        expect(result.current.showLawsuitsWorkspace).toBe(false);

        await act(async () => {
            result.current.closeCriminalCase();
        });

        expect(result.current.criminalDashboardCaseId).toBeNull();
        expect(result.current.showLawsuitsWorkspace).toBe(false);
    });
});
