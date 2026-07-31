import { describe, expect, it, vi, beforeEach } from 'vitest';

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
}));

import {
    dispatchGlobalSearchNavigate,
    type GlobalSearchNavDispatchContext,
} from '@/app/hooks/globalSearchNavDispatch';

function makeCtx(
    overrides: Partial<GlobalSearchNavDispatchContext> = {},
): GlobalSearchNavDispatchContext {
    return {
        userId: 'lawyer-1',
        files: [],
        executionFiles: [],
        closeGlobalSearch: vi.fn(),
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
        setActiveFile: vi.fn(),
        selectCase: vi.fn(),
        ...overrides,
    };
}

describe('dispatchGlobalSearchNavigate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يغلق فقط عند غياب هوية حقيقية', () => {
        const closeGlobalSearch = vi.fn();
        const openNotifications = vi.fn();
        const ctx = makeCtx({ userId: 'guest-lawyer-1', closeGlobalSearch, openNotifications });

        dispatchGlobalSearchNavigate({ type: 'notifications' } as never, ctx);

        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(openNotifications).not.toHaveBeenCalled();
    });

    it('يفتح الإشعارات ثم يغلق', () => {
        const closeGlobalSearch = vi.fn();
        const openNotifications = vi.fn();
        const ctx = makeCtx({ closeGlobalSearch, openNotifications });

        dispatchGlobalSearchNavigate({ type: 'notifications' } as never, ctx);

        expect(openNotifications).toHaveBeenCalledTimes(1);
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
    });

    it('يفتح الجدول مع التاريخ والحدث', () => {
        const openScheduleTab = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({ openScheduleTab, closeGlobalSearch });

        dispatchGlobalSearchNavigate(
            { type: 'calendar', date: '2026-01-15', eventId: 'ev-1' } as never,
            ctx,
        );

        expect(openScheduleTab).toHaveBeenCalledWith({ date: '2026-01-15', eventId: 'ev-1' });
        expect(closeGlobalSearch).toHaveBeenCalled();
    });

    it('يفتح المجتمع مع deep link', () => {
        const openCommunityTab = vi.fn();
        const setCommunityDeepLink = vi.fn();
        const ctx = makeCtx({ openCommunityTab, setCommunityDeepLink });

        dispatchGlobalSearchNavigate({ type: 'community', postId: 'post-9' } as never, ctx);

        expect(openCommunityTab).toHaveBeenCalled();
        expect(setCommunityDeepLink).toHaveBeenCalledWith({ postId: 'post-9', openComments: false });
    });

    it('يفتح إضبارة التنفيذ عبر العقد', () => {
        const setActiveFile = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({
            executionFiles: [{ id: 'ex-9', type: 'execution' } as never],
            setActiveFile,
            closeGlobalSearch,
        });

        dispatchGlobalSearchNavigate({ type: 'file', fileId: 'ex-9' } as never, ctx);

        expect(openContractMocks.openExecutionDossierWithContract).toHaveBeenCalledTimes(1);
        expect(setActiveFile).toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalled();
    });
});
