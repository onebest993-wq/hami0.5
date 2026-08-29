import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';

vi.mock('@/app/domain/lawsuit/lawsuitFilesRepository', () => ({
    loadInitialLawsuitFilesAsync: vi.fn(),
    loadInitialLawsuitFiles: vi.fn(),
}));

vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', () => ({
    lawsuitSegmentsNeedWarm: vi.fn(() => false),
}));

import {
    awaitLawsuitFilesEagerHydrate,
    getLawsuitFilesEagerHydrateIfReady,
    isLawsuitFilesEagerHydrateSettled,
    resetLawsuitFilesEagerHydrateForTests,
    startLawsuitFilesEagerHydrate,
} from '../lawsuitFilesEagerHydrate';
import {
    loadInitialLawsuitFiles,
    loadInitialLawsuitFilesAsync,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { lawsuitSegmentsNeedWarm } from '@/app/domain/lawsuit/lawsuitSegmentStorage';

const file = (id: number): FileData => ({
    id,
    type: 'lawsuit',
    status: 'active',
    caseNo: `2026/ب/${id}`,
    court: 'بداءة',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuitFilesEagerHydrate', () => {
    beforeEach(() => {
        resetLawsuitFilesEagerHydrateForTests();
        vi.clearAllMocks();
        vi.mocked(loadInitialLawsuitFiles).mockReturnValue([]);
        vi.mocked(loadInitialLawsuitFilesAsync).mockResolvedValue([]);
        vi.mocked(lawsuitSegmentsNeedWarm).mockReturnValue(false);
    });

    it('returns cached result without re-fetching', async () => {
        vi.mocked(loadInitialLawsuitFilesAsync).mockResolvedValue([file(1)]);
        startLawsuitFilesEagerHydrate();
        await awaitLawsuitFilesEagerHydrate();
        expect(getLawsuitFilesEagerHydrateIfReady()).toHaveLength(1);
        vi.mocked(loadInitialLawsuitFilesAsync).mockClear();
        const second = await awaitLawsuitFilesEagerHydrate();
        expect(second).toHaveLength(1);
        expect(loadInitialLawsuitFilesAsync).not.toHaveBeenCalled();
    });

    it('falls back to sync boot on async failure', async () => {
        vi.mocked(loadInitialLawsuitFilesAsync).mockRejectedValue(new Error('idb'));
        vi.mocked(loadInitialLawsuitFiles).mockReturnValue([file(9)]);
        startLawsuitFilesEagerHydrate();
        const rows = await awaitLawsuitFilesEagerHydrate(0);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(9);
    });

    it('uses sync boot when async exceeds timeout', async () => {
        vi.mocked(loadInitialLawsuitFilesAsync).mockImplementation(
            () => new Promise(() => undefined),
        );
        vi.mocked(loadInitialLawsuitFiles).mockReturnValue([file(4)]);
        const rows = await awaitLawsuitFilesEagerHydrate(30);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(4);
    });

    it('does not settle empty timeout while hydrate still in flight and storage cold', async () => {
        let resolveAsync: (rows: FileData[]) => void = () => undefined;
        vi.mocked(loadInitialLawsuitFilesAsync).mockImplementation(
            () =>
                new Promise<FileData[]>((resolve) => {
                    resolveAsync = resolve;
                }),
        );
        vi.mocked(loadInitialLawsuitFiles).mockReturnValue([]);
        vi.mocked(lawsuitSegmentsNeedWarm).mockReturnValue(true);

        const raced = awaitLawsuitFilesEagerHydrate(20);
        const early = await raced;
        expect(early).toHaveLength(0);
        expect(isLawsuitFilesEagerHydrateSettled()).toBe(false);

        resolveAsync([file(42)]);
        await Promise.resolve();
        await Promise.resolve();

        expect(isLawsuitFilesEagerHydrateSettled()).toBe(true);
        expect(getLawsuitFilesEagerHydrateIfReady()?.[0]?.id).toBe(42);

        const again = await awaitLawsuitFilesEagerHydrate(20);
        expect(again).toHaveLength(1);
        expect(again[0]?.id).toBe(42);
    });

    it('does not treat cached empty array as final before settle', async () => {
        vi.mocked(loadInitialLawsuitFilesAsync).mockImplementation(
            () => new Promise(() => undefined),
        );
        vi.mocked(loadInitialLawsuitFiles).mockReturnValue([]);
        vi.mocked(lawsuitSegmentsNeedWarm).mockReturnValue(true);

        await awaitLawsuitFilesEagerHydrate(15);
        expect(isLawsuitFilesEagerHydrateSettled()).toBe(false);

        vi.mocked(loadInitialLawsuitFilesAsync).mockResolvedValue([file(7)]);
        resetLawsuitFilesEagerHydrateForTests();
        const rows = await awaitLawsuitFilesEagerHydrate(0);
        expect(rows).toHaveLength(1);
    });
});
