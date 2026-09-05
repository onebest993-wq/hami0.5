import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLawsuitFileMutations } from '@/app/hooks/useLawsuitFileMutations';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import {
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitTrashSegments,
    emptyLawsuitFileSegments,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import type { LawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFileSegments';
import type { LawsuitLifecycleMutationKind } from '@/app/domain/lawsuit/lawsuitLifecycleTransaction';

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
}));

vi.mock('@/app/services/SupabaseService', () => ({
    SupabaseService: {
        deleteLawsuitFile: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

function sampleFile(overrides: Partial<FileData> = {}): FileData {
    return {
        id: 'f1',
        type: 'lawsuit',
        caseNo: '1/2026',
        court: 'بداءة',
        date: '2026-01-01',
        parties: [],
        history: [],
        notes: [],
        images: [],
        status: 'active',
        ...overrides,
    } as FileData;
}

function createCommit(initial: LawsuitFileSegments) {
    let segments = initial;
    const commit = vi.fn(
        async (
            kind: LawsuitLifecycleMutationKind,
            ids: readonly (string | number)[],
        ): Promise<LawsuitFileSegments | null> => {
            if (kind === 'trash') {
                segments = applyLawsuitTrashSegments(segments, ids[0]!);
            } else if (kind === 'restore-trash') {
                segments = applyLawsuitRestoreFromTrashSegments(segments, ids[0]!);
            } else if (kind === 'permanent-delete') {
                segments = applyLawsuitPermanentDeleteSegments(segments, [...ids]);
            }
            return segments;
        },
    );
    return { commit, getSegments: () => segments };
}

function renderMutations(
    commitLawsuitLifecycleMutation: ReturnType<typeof createCommit>['commit'],
) {
    return renderHook(() =>
        useLawsuitFileMutations({
            commitLawsuitLifecycleMutation,
            setActiveFile: vi.fn(),
            userId: 'u1',
            authUserId: 'u1',
            refreshAppAlerts: vi.fn(),
            unpinWorkspaceForDeletedFile: vi.fn(),
        }),
    );
}

describe('useLawsuitFileMutations transactional contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLiveCloudSyncBucketEnabled.mockReturnValue(true);
    });

    it('moves to trash only through the durable lifecycle command', async () => {
        const state = createCommit({
            ...emptyLawsuitFileSegments(),
            active: [sampleFile()],
            trash: [],
        });
        const { result } = renderMutations(state.commit);

        let ok = false;
        await act(async () => {
            ok = await result.current.moveLawsuitToTrash('f1');
        });

        expect(ok).toBe(true);
        expect(state.commit).toHaveBeenCalledWith('trash', ['f1']);
        expect(state.getSegments().active).toHaveLength(0);
        expect(state.getSegments().trash?.[0]).toMatchObject({ id: 'f1', status: 'deleted' });
    });

    it('does not report success or run deletion side effects when COMMIT fails', async () => {
        const commit = vi.fn(async () => null);
        const { result } = renderMutations(commit);
        const { SupabaseService } = await import('@/app/services/SupabaseService');

        let ok = true;
        await act(async () => {
            ok = await result.current.permanentlyDeleteLawsuits(['f1']);
        });

        expect(ok).toBe(false);
        expect(SupabaseService.deleteLawsuitFile).not.toHaveBeenCalled();
    });

    it('permanently deletes locally before scheduling cloud cleanup', async () => {
        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const state = createCommit({
            ...emptyLawsuitFileSegments(),
            trash: [trashed],
        });
        const { result } = renderMutations(state.commit);
        const { SupabaseService } = await import('@/app/services/SupabaseService');

        await act(async () => {
            expect(await result.current.permanentlyDeleteLawsuits(['f1'])).toBe(true);
        });

        expect(state.commit).toHaveBeenCalledWith('permanent-delete', ['f1']);
        expect(state.getSegments().trash).toHaveLength(0);
        expect(SupabaseService.deleteLawsuitFile).toHaveBeenCalledWith('f1');
    });

    it('restores from trash after the durable command succeeds', async () => {
        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const state = createCommit({
            ...emptyLawsuitFileSegments(),
            trash: [trashed],
        });
        const { result } = renderMutations(state.commit);

        await act(async () => {
            expect(await result.current.restoreLawsuitFromTrash('f1')).toBe(true);
        });

        expect(state.getSegments().active[0]).toMatchObject({ id: 'f1', status: 'active' });
        expect(state.getSegments().trash).toHaveLength(0);
    });

    it('handleDeleteFile unpins only after disk COMMIT success', async () => {
        const unpin = vi.fn();
        const commit = vi.fn(async () => null);
        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                commitLawsuitLifecycleMutation: commit,
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                unpinWorkspaceForDeletedFile: unpin,
            }),
        );

        act(() => result.current.handleDeleteFile(sampleFile()));
        await waitFor(() => expect(commit).toHaveBeenCalled());
        expect(unpin).not.toHaveBeenCalled();
    });
});
