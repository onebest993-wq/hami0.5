import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLawsuitFileMutations } from '@/app/hooks/useLawsuitFileMutations';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import {
    applyLawsuitTrashSegments,
    emptyLawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';

vi.mock('@/app/services/calendar/dossierSyncLazy', () => ({
    pruneOrphanedBridgeEvents: vi.fn(() => Promise.resolve()),
    removeAllBridgedEventsForEntity: vi.fn(() => Promise.resolve()),
    syncLawsuitFileToCalendar: vi.fn(),
}));

vi.mock('@/app/services/calendar/bridge/lite', () => ({
    resolveCalendarUserId: (id: string | null | undefined) => id ?? null,
}));

vi.mock('@/app/services/caseShare/caseShareDossierRevocation', () => ({
    scheduleRevokeLawsuitCaseShares: vi.fn(),
}));

const isLiveCloudSyncBucketEnabled = vi.fn(() => true);

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: (...args: unknown[]) => isLiveCloudSyncBucketEnabled(...args),
    isCloudSyncBucketEnabled: () => true,
}));

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        deleteLawsuitFile: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('@/app/utils/lawsuitDossierTombstones', () => ({
    commitLawsuitDossierTombstone: vi.fn(async () => true),
}));

vi.mock('@/app/domain/lawsuit/lawsuitPersistFlush', () => ({
    awaitLawsuitWorkspaceCommit: vi.fn(async () => ({ ok: true })),
    scheduleLawsuitWorkspaceCommit: vi.fn(),
    commitLawsuitWorkspacePersist: vi.fn(async () => ({ ok: true })),
    flushLawsuitWorkspacePersist: vi.fn(async () => true),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

function sampleFile(overrides: Partial<FileData> = {}): FileData {
    return {
        id: 'f1',
        caseNo: '1/2026',
        status: 'active',
        ...overrides,
    } as FileData;
}

describe('useLawsuitFileMutations segment integrity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLiveCloudSyncBucketEnabled.mockReturnValue(true);
    });

    it('handleDeleteFile ينقل الإضبارة النشطة إلى مقطع trash (لا soft-delete داخل active)', () => {
        const initial = {
            ...emptyLawsuitFileSegments(),
            active: [sampleFile()],
            trash: [],
        };
        let segments = initial;

        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                setLawsuitSegments: (updater) => {
                    segments =
                        typeof updater === 'function'
                            ? updater(segments)
                            : updater;
                },
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDeleteFile(sampleFile());
        });

        expect(segments.active).toHaveLength(0);
        expect(segments.trash).toHaveLength(1);
        expect(segments.trash?.[0]?.status).toBe('deleted');
        expect(segments.trash?.[0]?.deletedAt).toEqual(expect.any(Number));
    });

    it('handleDeleteFile للحذف النهائي يضيف tombstone ويحذف من السحابة', async () => {
        const { commitLawsuitDossierTombstone } = await import('@/app/utils/lawsuitDossierTombstones');
        const { SupabaseService } = await import('@/app/services/SupabaseService');
        const { scheduleRevokeLawsuitCaseShares } = await import(
            '@/app/services/caseShare/caseShareDossierRevocation'
        );

        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const initial = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: [trashed],
        };
        let segments = initial;

        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                setLawsuitSegments: (updater) => {
                    segments =
                        typeof updater === 'function'
                            ? updater(segments)
                            : updater;
                },
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDeleteFile(trashed);
        });

        expect(commitLawsuitDossierTombstone).toHaveBeenCalledWith('f1');
        expect(segments.trash).toHaveLength(1);

        await waitFor(() => {
            expect(segments.trash).toHaveLength(0);
        });

        expect(SupabaseService.deleteLawsuitFile).toHaveBeenCalledWith('f1');
        expect(scheduleRevokeLawsuitCaseShares).toHaveBeenCalledWith('u1', 'f1');
        expect(segments.trash).toHaveLength(0);
    });

    it('الحذف النهائي يبقى محلياً عندما سلة الملفات السحابية مطفأة', async () => {
        isLiveCloudSyncBucketEnabled.mockReturnValue(false);
        const { SupabaseService } = await import('@/app/services/SupabaseService');
        const { commitLawsuitDossierTombstone } = await import('@/app/utils/lawsuitDossierTombstones');

        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const initial = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: [trashed],
        };
        let segments = initial;

        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                setLawsuitSegments: (updater) => {
                    segments =
                        typeof updater === 'function'
                            ? updater(segments)
                            : updater;
                },
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDeleteFile(trashed);
        });

        expect(commitLawsuitDossierTombstone).toHaveBeenCalledWith('f1');
        expect(segments.trash).toHaveLength(1);

        await waitFor(() => {
            expect(segments.trash).toHaveLength(0);
        });

        expect(SupabaseService.deleteLawsuitFile).not.toHaveBeenCalled();
        expect(segments.trash).toHaveLength(0);
    });

    it('لا يمسح القائمة المحلية قبل أن يُثبَّت الشاهد', async () => {
        let release!: (ok: boolean) => void;
        const { commitLawsuitDossierTombstone } = await import('@/app/utils/lawsuitDossierTombstones');
        vi.mocked(commitLawsuitDossierTombstone).mockImplementation(
            () =>
                new Promise<boolean>((resolve) => {
                    release = resolve;
                }),
        );

        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const initial = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: [trashed],
        };
        let segments = initial;

        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                setLawsuitSegments: (updater) => {
                    segments =
                        typeof updater === 'function'
                            ? updater(segments)
                            : updater;
                },
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDeleteFile(trashed);
        });

        expect(segments.trash).toHaveLength(1);

        await act(async () => {
            release(true);
            await Promise.resolve();
        });

        expect(segments.trash).toHaveLength(0);
    });

    it('handleRestoreFile يستعيد من مقطع trash إلى active', () => {
        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const initial = applyLawsuitTrashSegments(
            { ...emptyLawsuitFileSegments(), active: [sampleFile()], trash: [] },
            'f1',
        );
        expect(initial.trash).toHaveLength(1);

        let segments = initial;
        const setActiveFile = vi.fn();

        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                setLawsuitSegments: (updater) => {
                    segments =
                        typeof updater === 'function'
                            ? updater(segments)
                            : updater;
                },
                setActiveFile,
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleRestoreFile(trashed);
        });

        expect(segments.active).toHaveLength(1);
        expect(segments.active[0]?.status).toBe('active');
        expect(segments.trash).toHaveLength(0);
        expect(setActiveFile).toHaveBeenCalled();
    });
});
