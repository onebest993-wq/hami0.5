import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    clearLawsuitPendingCreatesForTests,
    listPendingLawsuitCreates,
    stagePendingLawsuitCreate,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import {
    pruneVerifiedLawsuitJournalEntries,
    tryClearPendingLawsuitCreateAfterProof,
    tryFinalizeLawsuitJournalAfterProof,
    verifyLawsuitActiveFileOnDisk,
    verifyLawsuitActiveFileOnDiskSync,
} from '@/app/domain/lawsuit/lawsuitDurabilityVerify';
import {
    LAWSUIT_WRITE_JOURNAL_KEY,
    listLawsuitJournalEntries,
    stageLawsuitJournalRecords,
} from '@/app/domain/lawsuit/lawsuitWriteJournal';
import { resetLawsuitPageWriteGuardForTests } from '@/app/domain/lawsuit/lawsuitPageWriteGuard';

const sample = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `2026/${id}`,
        court: 'أحوال',
        lawsuitJurisdiction: 'personal',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitDurabilityVerify — golden pending rule', () => {
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

    it('لا يمسح المعلّق عند commit.ok بدون إثبات قرص', async () => {
        stagePendingLawsuitCreate(sample(77));
        const cleared = await tryClearPendingLawsuitCreateAfterProof(77, { ok: true });
        expect(cleared).toBe(false);
        expect(listPendingLawsuitCreates()).toHaveLength(1);
    });

    it('لا يمسح المعلّق في نفس صفحة الإنشاء حتى بعد إثبات قرص', async () => {
        stagePendingLawsuitCreate(sample(88));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([sample(88)]),
        );
        await SecureStoreService.waitForAllPendingPersist();

        const samePage = await tryClearPendingLawsuitCreateAfterProof(88, { ok: true });
        expect(samePage).toBe(false);
        expect(listPendingLawsuitCreates()).toHaveLength(1);
    });

    it('يمسح المعلّق فقط بعد إقلاع صفحة جديدة + commit + قرص مُفكّ', async () => {
        const { resetLawsuitPageWriteGuardForTests } = await import(
            '@/app/domain/lawsuit/lawsuitPageWriteGuard'
        );
        stagePendingLawsuitCreate(sample(88));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([sample(88)]),
        );
        await SecureStoreService.waitForAllPendingPersist();
        resetLawsuitPageWriteGuardForTests();

        const cleared = await tryClearPendingLawsuitCreateAfterProof(88, { ok: true });
        expect(cleared).toBe(true);
        expect(listPendingLawsuitCreates()).toHaveLength(0);
        expect(await verifyLawsuitActiveFileOnDisk(88)).toBe(true);
    });

    it('verifyLawsuitActiveFileOnDisk يقرأ من القرص لا من الذاكرة فقط', async () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([sample(5)]),
        );
        await SecureStoreService.waitForAllPendingPersist();
        SecureStoreService.dropMemoryMirrorsForTests?.([LAWSUIT_FILES_ACTIVE_KEY]);

        expect(await verifyLawsuitActiveFileOnDisk(5)).toBe(true);
        expect(await verifyLawsuitActiveFileOnDisk(99)).toBe(false);
    });

    it('لا يمسح سجل WAL عند commit.ok بدون إثبات قرص', async () => {
        stageLawsuitJournalRecords([sample(91)]);
        const cleared = await tryFinalizeLawsuitJournalAfterProof(91, { ok: true });
        expect(cleared).toBe(false);
        expect(listLawsuitJournalEntries()).toHaveLength(1);
    });

    it('يمسح سجل WAL فقط بعد إقلاع صفحة جديدة + commit + قرص مُفكّ', async () => {
        const { resetLawsuitPageWriteGuardForTests } = await import(
            '@/app/domain/lawsuit/lawsuitPageWriteGuard'
        );
        stageLawsuitJournalRecords([sample(92)]);
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([sample(92)]),
        );
        await SecureStoreService.waitForAllPendingPersist();
        resetLawsuitPageWriteGuardForTests();

        const cleared = await tryFinalizeLawsuitJournalAfterProof(92, { ok: true });
        expect(cleared).toBe(true);
        expect(listLawsuitJournalEntries()).toHaveLength(0);
    });

    it('pruneVerifiedLawsuitJournalEntries يزيل المثبت sync فقط بعد إقلاع صفحة جديدة', async () => {
        const { resetLawsuitPageWriteGuardForTests } = await import(
            '@/app/domain/lawsuit/lawsuitPageWriteGuard'
        );
        stageLawsuitJournalRecords([sample(93), sample(94)]);
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([sample(93)]),
        );
        resetLawsuitPageWriteGuardForTests();
        expect(verifyLawsuitActiveFileOnDiskSync(93)).toBe(true);
        expect(verifyLawsuitActiveFileOnDiskSync(94)).toBe(false);
        const pruned = pruneVerifiedLawsuitJournalEntries([93, 94]);
        expect(pruned).toBe(1);
        expect(listLawsuitJournalEntries().map((e) => e.fileId)).toEqual(['94']);
    });
});
