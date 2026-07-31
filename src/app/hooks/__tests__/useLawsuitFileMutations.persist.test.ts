import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawsuitFileMutations } from '@/app/hooks/useLawsuitFileMutations';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

const persistSpy = vi.fn((files: FileData[]) => files);

vi.mock('@/app/domain/lawsuit/lawsuitFilesRepository', async () => {
    const actual = await vi.importActual<typeof import('@/app/domain/lawsuit/lawsuitFilesRepository')>(
        '@/app/domain/lawsuit/lawsuitFilesRepository',
    );
    return {
        ...actual,
        persistLawsuitFiles: (files: FileData[]) => persistSpy(files),
    };
});

vi.mock('@/app/services/calendar/dossierSyncLazy', () => ({
    pruneOrphanedBridgeEvents: vi.fn(() => Promise.resolve()),
    removeAllBridgedEventsForEntity: vi.fn(() => Promise.resolve()),
    syncLawsuitFileToCalendar: vi.fn(),
}));

vi.mock('@/app/services/calendar/bridge/lite', () => ({
    resolveCalendarUserId: (id: string | null | undefined) => id ?? null,
}));

function sampleFile(overrides: Partial<FileData> = {}): FileData {
    return {
        id: 'f1',
        caseNo: '1/2026',
        status: 'active',
        ...overrides,
    } as FileData;
}

describe('useLawsuitFileMutations persist integrity', () => {
    beforeEach(() => {
        persistSpy.mockClear();
        persistSpy.mockImplementation((files: FileData[]) => files);
    });

    it('يحفظ الحذف الناعم عبر persistLawsuitFiles', () => {
        const setFiles = vi.fn((updater: (prev: FileData[]) => FileData[]) => {
            updater([sampleFile()]);
        });
        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                files: [sampleFile()],
                setFiles: setFiles as React.Dispatch<React.SetStateAction<FileData[]>>,
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                showLawsuitsWorkspace: true,
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDeleteFile(sampleFile());
        });

        expect(persistSpy).toHaveBeenCalled();
        const persisted = persistSpy.mock.calls[0]?.[0] as FileData[];
        expect(persisted[0]?.status).toBe('deleted');
        expect(persisted[0]?.deletedAt).toEqual(expect.any(Number));
    });

    it('يحفظ الاستعادة عبر persistLawsuitFiles', () => {
        const trashed = sampleFile({ status: 'deleted', deletedAt: Date.now() });
        const setFiles = vi.fn((updater: (prev: FileData[]) => FileData[]) => {
            updater([trashed]);
        });
        const { result } = renderHook(() =>
            useLawsuitFileMutations({
                files: [trashed],
                setFiles: setFiles as React.Dispatch<React.SetStateAction<FileData[]>>,
                setActiveFile: vi.fn(),
                userId: 'u1',
                authUserId: 'u1',
                refreshAppAlerts: vi.fn(),
                showLawsuitsWorkspace: true,
                unpinWorkspaceForDeletedFile: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleRestoreFile(trashed);
        });

        expect(persistSpy).toHaveBeenCalled();
        const persisted = persistSpy.mock.calls[0]?.[0] as FileData[];
        expect(persisted[0]?.status).toBe('active');
        expect(persisted[0]?.deletedAt).toBeUndefined();
    });
});
