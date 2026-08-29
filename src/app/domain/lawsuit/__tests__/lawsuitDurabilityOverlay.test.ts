import { beforeEach, describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import {
    clearLawsuitPendingCreatesForTests,
    stagePendingLawsuitCreate,
} from '../lawsuitPendingCreateStore';
import {
    LAWSUIT_WRITE_JOURNAL_KEY,
    stageLawsuitJournalRecords,
} from '../lawsuitWriteJournal';
import {
    finalizeLawsuitDurabilityAfterCommit,
    lawsuitDurabilityHasUncommittedWrites,
    mergeLawsuitDurabilityOverlaysInto,
    pruneLawsuitDurabilityOverlaysForFileIds,
} from '../lawsuitDurabilityOverlay';
import {
    applyLawsuitArchiveSegments,
    emptyLawsuitFileSegments,
} from '../lawsuitFilesRepository';
import { resetLawsuitPageWriteGuardForTests } from '../lawsuitPageWriteGuard';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `o/${id}`,
        court: 'أحوال',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitDurabilityOverlay', () => {
    beforeEach(() => {
        SecureStoreService.dropMemoryMirrorsForTests?.();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        } catch {
            /* ignore */
        }
        clearLawsuitPendingCreatesForTests();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_WRITE_JOURNAL_KEY);
        } catch {
            /* ignore */
        }
        localStorage.removeItem(LAWSUIT_WRITE_JOURNAL_KEY);
        resetLawsuitPageWriteGuardForTests();
    });

    it('merges pending then journal into active', () => {
        stagePendingLawsuitCreate(file(2));
        stageLawsuitJournalRecords([file(3)]);
        const merged = mergeLawsuitDurabilityOverlaysInto([file(1)]);
        expect(merged.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2, 3]);
        expect(lawsuitDurabilityHasUncommittedWrites()).toBe(true);
    });

    it('pruneLawsuitDurabilityOverlaysForFileIds clears pending and journal', () => {
        stagePendingLawsuitCreate(file(4));
        stageLawsuitJournalRecords([file(4)]);
        pruneLawsuitDurabilityOverlaysForFileIds([4]);
        expect(lawsuitDurabilityHasUncommittedWrites()).toBe(false);
    });

    it('archive lifecycle prunes durability overlays for moved file', () => {
        stagePendingLawsuitCreate(file(8));
        stageLawsuitJournalRecords([file(8)]);
        const segments = {
            ...emptyLawsuitFileSegments(),
            active: [file(8)],
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            },
        };
        applyLawsuitArchiveSegments(segments, 8);
        expect(lawsuitDurabilityHasUncommittedWrites()).toBe(false);
    });

    it('finalizeLawsuitDurabilityAfterCommit clears pending and journal after disk proof', async () => {
        stagePendingLawsuitCreate(file(6));
        stageLawsuitJournalRecords([file(6)]);
        await SecureStoreService.setItem(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([file(6)]),
        );
        resetLawsuitPageWriteGuardForTests();
        const finalized = await finalizeLawsuitDurabilityAfterCommit({ ok: true }, [6]);
        expect(finalized).toBeGreaterThan(0);
        expect(lawsuitDurabilityHasUncommittedWrites()).toBe(false);
    });
});
