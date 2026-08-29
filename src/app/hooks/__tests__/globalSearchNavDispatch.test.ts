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

const segmentLookupMocks = vi.hoisted(() => ({
    findLawsuitFileAcrossSegments: vi.fn(() => null as null | { id: string; type: string; status: string }),
}));

vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', () => ({
    findLawsuitFileAcrossSegments: segmentLookupMocks.findLawsuitFileAcrossSegments,
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (userId: string | null | undefined) => {
        const id = userId?.trim();
        if (!id) return false;
        return id !== 'guest-lawyer-1' && id !== 'demo_user';
    },
    hasLocalAppSession: (userId: string | null | undefined) => Boolean(userId?.trim()),
}));

const toastMocks = vi.hoisted(() => ({
    error: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: toastMocks.error, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
    dispatchGlobalSearchNavigate,
    GLOBAL_SEARCH_NAV_UNAVAILABLE,
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

    it('الضيف يصل للإشعارات من نتيجة البحث', () => {
        const closeGlobalSearch = vi.fn();
        const openNotifications = vi.fn();
        const ctx = makeCtx({ userId: 'guest-lawyer-1', closeGlobalSearch, openNotifications });

        dispatchGlobalSearchNavigate({ type: 'notifications' } as never, ctx);

        expect(openNotifications).toHaveBeenCalledTimes(1);
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
    });

    it('الضيف يفتح إضبارة التنفيذ من نتيجة البحث', () => {
        const setActiveFile = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({
            userId: 'guest-lawyer-1',
            executionFiles: [{ id: 'ex-9', type: 'execution' } as never],
            setActiveFile,
            closeGlobalSearch,
        });

        dispatchGlobalSearchNavigate({ type: 'file', fileId: 'ex-9' } as never, ctx);

        expect(openContractMocks.openExecutionDossierWithContract).toHaveBeenCalledTimes(1);
        expect(setActiveFile).toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalled();
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

    it('يرفض قضية جزائية غير مملوكة', () => {
        const openCriminalCase = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({
            criminalCases: [{ id: 'cr-1' }],
            openCriminalCase,
            closeGlobalSearch,
        });

        dispatchGlobalSearchNavigate({ type: 'criminal', criminalId: 'cr-9' } as never, ctx);

        expect(openCriminalCase).not.toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(toastMocks.error).toHaveBeenCalledWith(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    });

    it('يُظهر تعذّر الفتح ولا يغيّر التبويب عندما الملف غير موجود', () => {
        const setActiveTab = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({ files: [], executionFiles: [], setActiveTab, closeGlobalSearch });

        dispatchGlobalSearchNavigate({ type: 'file', fileId: 'missing' } as never, ctx);

        expect(setActiveTab).not.toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(toastMocks.error).toHaveBeenCalledWith(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    });

    it('يُظهر تعذّر الفتح ولا يختار قضية عندما السجل غير موجود', () => {
        const selectCase = vi.fn();
        const onNavigateToCase = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({ files: [], executionFiles: [], selectCase, onNavigateToCase, closeGlobalSearch });

        dispatchGlobalSearchNavigate({ type: 'case', caseId: 'missing' } as never, ctx);

        expect(selectCase).not.toHaveBeenCalled();
        expect(onNavigateToCase).not.toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(toastMocks.error).toHaveBeenCalledWith(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    });

    it('يفتح قضية جزائية مملوكة', () => {
        const openCriminalCase = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({
            criminalCases: [{ id: 'cr-1' }],
            openCriminalCase,
            closeGlobalSearch,
        });

        dispatchGlobalSearchNavigate({ type: 'criminal', criminalId: 'cr-1' } as never, ctx);

        expect(openCriminalCase).toHaveBeenCalledWith('cr-1');
        expect(closeGlobalSearch).toHaveBeenCalled();
        expect(toastMocks.error).not.toHaveBeenCalled();
    });

    it('يفتح دعوى مؤرشفة من مقطع التخزين عندما لا تكون في files النشطة', () => {
        segmentLookupMocks.findLawsuitFileAcrossSegments.mockReturnValueOnce({
            id: 'arch-1',
            type: 'lawsuit',
            status: 'archived',
        });
        const setActiveFile = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({ files: [], setActiveFile, closeGlobalSearch });

        dispatchGlobalSearchNavigate({ type: 'file', fileId: 'arch-1' } as never, ctx);

        expect(lawsuitOpenMocks.openLawsuitDossierWithContract).toHaveBeenCalledTimes(1);
        expect(setActiveFile).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'arch-1', status: 'archived' }),
        );
        expect(closeGlobalSearch).toHaveBeenCalled();
    });

    it('يرفض التنقّل بلا جلسة محلية', () => {
        const openNotifications = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({ userId: null, openNotifications, closeGlobalSearch });

        dispatchGlobalSearchNavigate({ type: 'notifications' } as never, ctx);

        expect(openNotifications).not.toHaveBeenCalled();
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(toastMocks.error).toHaveBeenCalledWith(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    });

    it('يرفض معرّف ملف بمخطط javascript', () => {
        const setActiveFile = vi.fn();
        const closeGlobalSearch = vi.fn();
        const ctx = makeCtx({
            executionFiles: [{ id: 'javascript:alert(1)', type: 'execution' } as never],
            setActiveFile,
            closeGlobalSearch,
        });

        dispatchGlobalSearchNavigate({ type: 'file', fileId: 'javascript:alert(1)' } as never, ctx);

        expect(setActiveFile).not.toHaveBeenCalled();
        expect(toastMocks.error).toHaveBeenCalledWith(GLOBAL_SEARCH_NAV_UNAVAILABLE);
    });
});
