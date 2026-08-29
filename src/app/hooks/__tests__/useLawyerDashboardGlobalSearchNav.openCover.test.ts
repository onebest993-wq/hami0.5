import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const openContractMocks = vi.hoisted(() => ({
    openExecutionDossierWithContract: vi.fn((commit: () => void) => {
        commit();
    }),
}));
const lawsuitOpenMocks = vi.hoisted(() => ({
    openLawsuitDossierWithContract: vi.fn((commit: () => void) => {
        commit();
    }),
}));

vi.mock('@/app/runtime/executionOpenContract', () => openContractMocks);
vi.mock('@/app/runtime/lawsuitOpenContract', () => lawsuitOpenMocks);

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => {
        const id = userId?.trim();
        if (!id) return false;
        return id !== 'guest-lawyer-1' && id !== 'demo_user';
    },
    hasLocalAppSession: (userId: string | null | undefined) => Boolean(userId?.trim()),
    resolveShellAuthUserId: (auth?: string | null, display?: string | null) =>
        auth?.trim() || display?.trim() || null,
}));

import { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';

describe('globalSearchNav — cover before close search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح إضبارة التنفيذ ثم يغلق البحث داخل commit', () => {
        const setActiveFile = vi.fn();
        const setActiveTab = vi.fn();
        const closeGlobalSearch = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardGlobalSearchNav({
                userId: 'lawyer-1',
                files: [],
                executionFiles: [{ id: 'ex-9', type: 'execution' } as never],
                closeGlobalSearch,
                openNotifications: vi.fn(),
                openProfileTab: vi.fn(),
                openScheduleTab: vi.fn(),
                setActiveTab,
                openCommunityTab: vi.fn(),
                setCommunityDeepLink: vi.fn(),
                openUrgentInLawsuitsWorkspace: vi.fn(),
                openCriminalCase: vi.fn(),
                openTransactionsHub: vi.fn(),
                openTasksManager: vi.fn(),
                openNotepad: vi.fn(),
                openVaultModal: vi.fn(),
                setActiveFile,
                selectCase: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleGlobalSearchNavigate({
                type: 'file',
                fileId: 'ex-9',
            } as never);
        });

        expect(openContractMocks.openExecutionDossierWithContract).toHaveBeenCalledTimes(1);
        expect(setActiveFile).toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('يفتح الجنائي ثم يغلق البحث', () => {
        const openCriminalCase = vi.fn();
        const closeGlobalSearch = vi.fn();
        const setActiveTab = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardGlobalSearchNav({
                userId: 'lawyer-1',
                files: [],
                executionFiles: [],
                criminalCases: [{ id: 'cr-1' }],
                closeGlobalSearch,
                openNotifications: vi.fn(),
                openProfileTab: vi.fn(),
                openScheduleTab: vi.fn(),
                setActiveTab,
                openCommunityTab: vi.fn(),
                setCommunityDeepLink: vi.fn(),
                openUrgentInLawsuitsWorkspace: vi.fn(),
                openCriminalCase,
                openTransactionsHub: vi.fn(),
                openTasksManager: vi.fn(),
                openNotepad: vi.fn(),
                openVaultModal: vi.fn(),
                setActiveFile: vi.fn(),
                selectCase: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleGlobalSearchNavigate({
                type: 'criminal',
                criminalId: 'cr-1',
            } as never);
        });

        expect(openCriminalCase).toHaveBeenCalledWith('cr-1');
        expect(closeGlobalSearch).toHaveBeenCalled();
    });

    it('يفتح القضية المدنية عبر العقد ثم يغلق', () => {
        const setActiveFile = vi.fn();
        const closeGlobalSearch = vi.fn();
        const selectCase = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardGlobalSearchNav({
                userId: 'lawyer-1',
                files: [{ id: 'case-1', type: 'lawsuit' } as never],
                executionFiles: [],
                closeGlobalSearch,
                openNotifications: vi.fn(),
                openProfileTab: vi.fn(),
                openScheduleTab: vi.fn(),
                setActiveTab: vi.fn(),
                openCommunityTab: vi.fn(),
                setCommunityDeepLink: vi.fn(),
                openUrgentInLawsuitsWorkspace: vi.fn(),
                openCriminalCase: vi.fn(),
                openTransactionsHub: vi.fn(),
                openTasksManager: vi.fn(),
                openNotepad: vi.fn(),
                openVaultModal: vi.fn(),
                setActiveFile,
                selectCase,
            }),
        );

        act(() => {
            result.current.handleGlobalSearchNavigate({
                type: 'case',
                caseId: 'case-1',
            } as never);
        });

        expect(selectCase).toHaveBeenCalledWith('case-1');
        expect(lawsuitOpenMocks.openLawsuitDossierWithContract).toHaveBeenCalledTimes(1);
        expect(setActiveFile).toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalled();
    });
});
