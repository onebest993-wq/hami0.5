import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { persistLawsuitActiveSegment } from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import {
    LAWSUIT_PENDING_CREATES_KEY,
    clearLawsuitPendingCreatesForTests,
    listPendingLawsuitCreates,
    stagePendingLawsuitCreate,
} from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import {
    LAWSUIT_WRITE_JOURNAL_KEY,
    listLawsuitJournalEntries,
    mergeLawsuitJournalInto,
    stageLawsuitJournalRecords,
} from '@/app/domain/lawsuit/lawsuitWriteJournal';
import type { FileData } from '../lawsuitFileTypes';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `2026/${id}`,
        court: 'أحوال',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuit reload durability — root causes', () => {
    beforeEach(async () => {
        SecureStoreService.dropMemoryMirrorsForTests?.();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_INDEX_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_STORAGE_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_WRITE_JOURNAL_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_PENDING_CREATES_KEY);
        } catch {
            /* ignore */
        }
        clearLawsuitPendingCreatesForTests();
        localStorage.removeItem(LAWSUIT_WRITE_JOURNAL_KEY);
        await SecureStoreService.waitForAllPendingPersist();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_INDEX_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_STORAGE_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_WRITE_JOURNAL_KEY);
            SecureStoreService.deleteItemSync(LAWSUIT_PENDING_CREATES_KEY);
        } catch {
            /* ignore */
        }
        SecureStoreService.dropMemoryMirrorsForTests?.();
    });

    it('wipe guard rejects poorer non-empty lawyer_files_active write', () => {
        const existing = JSON.stringify([file(1), file(2), file(3)]);
        const incoming = JSON.stringify([file(9)]);
        expect(shouldRejectDossierWipe(LAWSUIT_FILES_ACTIVE_KEY, incoming, existing)).toBe(true);
    });

    it('wipe guard rejects any overwrite of unreadable/encrypted lawyer payload', () => {
        const cipher = 'hami_enc_v2:not-json-ciphertext';
        const incoming = JSON.stringify([file(1)]);
        expect(shouldRejectDossierWipe(LAWSUIT_FILES_ACTIVE_KEY, incoming, cipher)).toBe(true);
    });

    it('persist poorer list does not shrink readable active segment', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1), file(2)]));
        persistLawsuitActiveSegment([file(9)]);
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        const parsed = JSON.parse(String(raw)) as Array<{ id: number }>;
        const ids = parsed.map((r) => r.id).sort((a, b) => a - b);
        expect(ids).toEqual([1, 2, 9]);
    });

    it('persistLawsuitFiles skips index/mirror when active segment is cold', async () => {
        const { LAWSUIT_FILES_INDEX_KEY, LAWSUIT_FILES_STORAGE_KEY } = await import(
            '@/app/services/dossierPersistence/dossierStorageKeys'
        );
        const { persistLawsuitFiles } = await import('@/app/domain/lawsuit/lawsuitFilesRepository');

        const cipher = 'hami_enc_v2:cold-active-segment';
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, cipher);
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                counts: { active: 3, archived: 0, trash: 0 },
                entries: {},
            }),
        );
        SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, cipher);
        SecureStoreService.clearDecryptedMemoryCache();

        persistLawsuitFiles([file(99)]);

        const indexRaw = SecureStoreService.getItemSync(LAWSUIT_FILES_INDEX_KEY);
        expect(String(indexRaw)).toContain('"active":3');
        const activeRaw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(activeRaw == null || activeRaw === cipher).toBe(true);
        expect(String(activeRaw ?? '')).not.toContain('"id":99');
        expect(
            activeRaw === cipher || SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY),
        ).toBe(true);
    });

    it('create → drop memory (reload) → boot still returns the personal-status file from pending', async () => {
        const { persistLawsuitFiles, loadInitialLawsuitFiles } = await import(
            '@/app/domain/lawsuit/lawsuitFilesRepository'
        );
        const { resetLawsuitPageWriteGuardForTests } = await import(
            '@/app/domain/lawsuit/lawsuitPageWriteGuard'
        );

        stagePendingLawsuitCreate(file(42));
        persistLawsuitFiles([file(42)]);
        SecureStoreService.dropMemoryMirrorsForTests?.([LAWSUIT_FILES_ACTIVE_KEY]);

        const afterReload = loadInitialLawsuitFiles();
        expect(afterReload.map((f) => Number(f.id))).toContain(42);

        resetLawsuitPageWriteGuardForTests();
        expect(listPendingLawsuitCreates().map((f) => Number(f.id))).toContain(42);
    });

    it('reload keeps personal pending when disk only has a different civil file', async () => {
        const { persistLawsuitFiles, loadInitialLawsuitFiles } = await import(
            '@/app/domain/lawsuit/lawsuitFilesRepository'
        );
        const personal = {
            ...file(77),
            lawsuitJurisdiction: 'personal',
            court: 'عفغ',
            parties: [{ id: 1, name: 'فغعفغ', role: 'المدعي', isClient: true }],
        } as FileData;

        persistLawsuitFiles([file(1)]);
        stagePendingLawsuitCreate(personal);
        SecureStoreService.dropMemoryMirrorsForTests?.([LAWSUIT_FILES_ACTIVE_KEY]);

        const afterReload = loadInitialLawsuitFiles();
        const ids = afterReload.map((f) => Number(f.id));
        expect(ids).toContain(1);
        expect(ids).toContain(77);
    });

    it('write journal survives memory drop and merges back into active list', () => {
        stageLawsuitJournalRecords([file(43)]);
        expect(listLawsuitJournalEntries()).toHaveLength(1);

        SecureStoreService.dropMemoryMirrorsForTests?.([LAWSUIT_FILES_ACTIVE_KEY]);
        const merged = mergeLawsuitJournalInto([]);
        expect(merged.map((f) => Number(f.id))).toEqual([43]);
    });

    it('allowShrink permits intentional archive shrink past wipe guard', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1), file(2)]));
        persistLawsuitActiveSegment([file(1)], { allowShrink: true });
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(JSON.parse(String(raw))).toHaveLength(1);
    });
});
