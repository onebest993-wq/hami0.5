import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import {
    isExecutionDossierMainBlobKey,
    persistExecutionDossierBlob,
    readExecutionDossierBlob,
    readExecutionDossierBlobScanningScopes,
    shouldRejectExecutionDossierBlobWipe,
    syncExecutionFileInIndex,
    ensureExecutionDossierBlobReady,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionStorageKey, unscopedExecutionStorageKey } from '@/app/utils/executionStorageKeys';
import { scopeExecutionDeviceStorageKey } from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { markExecutionDossierTombstone } from '@/app/utils/executionDossierTombstones';

describe('executionDossierBlobPersistence', () => {
    const execId = 'exec_persist_test_1';
    const blobKey = executionStorageKey(execId);

    beforeEach(() => {
        vi.restoreAllMocks();
        setLiveAuthUserId(null);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
    });

    it('detects main dossier blob keys', () => {
        expect(isExecutionDossierMainBlobKey(blobKey)).toBe(true);
        expect(isExecutionDossierMainBlobKey('executionFiles')).toBe(false);
        expect(isExecutionDossierMainBlobKey(`${blobKey}_decisions`)).toBe(false);
        expect(isExecutionDossierMainBlobKey(`${blobKey}_decisions_ns_financial`)).toBe(false);
    });

    it('rejects wiping a rich dossier blob with an empty object', () => {
        const existing = JSON.stringify({
            id: execId,
            timelineEvents: [{ id: 't1', title: 'حدث' }],
            debtors: [{ name: 'مدين' }],
            creditors: [{ name: 'دائن' }],
        });
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, '{}', existing)).toBe(true);
    });

    it('rejects wiping a dossier blob whose stored copy is unreadable', () => {
        // بلوب مبتور — قراءة فاشلة تُظهر إضبارة خالية، فتكتب أول حفظة فوق آخر نسخة
        const corrupt = '{"id":"exec_persist_test_1","debtors":[{"name":"مد';
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, '{}', corrupt)).toBe(true);
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, '{"id":"x"}', corrupt)).toBe(true);
        // استعادة حقيقية فوق التالف تمرّ
        const restored = JSON.stringify({ id: execId, debtors: [{ name: 'مدين' }] });
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, restored, corrupt)).toBe(false);
    });

    it('rejects an unparsable payload over a readable dossier blob', () => {
        const existing = JSON.stringify({ id: execId, debtors: [{ name: 'مدين' }] });
        expect(shouldRejectExecutionDossierBlobWipe(blobKey, 'not-json', existing)).toBe(true);
    });

    it('persists blob and syncs executionFiles index', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([{ id: execId, fileNumber: '100', debtors: [{ name: 'قديم' }] }]),
        );

        const ok = persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: '100',
            debtors: [{ name: 'مدين' }],
            timelineEvents: [{ id: 'ev-1', title: 'جلسة' }],
            updatedAt: '2026-06-25T12:00:00.000Z',
        });

        expect(ok).toBe(true);
        const storedBlob = JSON.parse(SecureStoreService.getItemSync(blobKey) || '{}') as {
            timelineEvents?: unknown[];
        };
        expect(storedBlob.timelineEvents).toHaveLength(1);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ id?: string; timelineEvents?: unknown[] }>;
        const row = index.find((r) => r.id === execId);
        expect(row?.timelineEvents).toHaveLength(1);
    });

    it('syncExecutionFileInIndex merges without dropping trash markers', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: execId,
                    executionTrashDeletedAt: '2026-06-01',
                    debtor_absence_badge_dismissed: true,
                },
            ]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '55',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        const row = index.find((r) => r.id === execId);
        expect(row?.fileNumber).toBe('55');
        expect(row?.executionTrashDeletedAt).toBe('2026-06-01');
        expect(row?.debtor_absence_badge_dismissed).toBe(true);
    });

    it('syncExecutionFileInIndex keeps list classification when incoming omits it', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: execId,
                    claimType: 'مشاهدة',
                    classification: 'أحوال شخصية',
                    debtor_entity_kind: 'natural_person',
                    total_remaining_balance: 900_000,
                },
            ]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '88',
            claimType: '',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        const row = index.find((r) => r.id === execId);
        expect(row?.fileNumber).toBe('88');
        expect(row?.claimType).toBe('مشاهدة');
        expect(row?.classification).toBe('أحوال شخصية');
        expect(row?.total_remaining_balance).toBe(900_000);
    });

    it('syncExecutionFileInIndex merges without dropping archive markers', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([
                {
                    id: execId,
                    executionArchivedAt: '2026-06-10',
                },
            ]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '77',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        const row = index.find((r) => r.id === execId);
        expect(row?.fileNumber).toBe('77');
        expect(row?.executionArchivedAt).toBe('2026-06-10');
    });

    it('syncExecutionFileInIndex skips tombstoned dossiers', () => {
        SecureStoreService.setItemSync(
            'hami:execution:dossier-tombstones:v1',
            JSON.stringify([execId]),
        );

        syncExecutionFileInIndex({
            id: execId,
            fileNumber: '999',
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        expect(index.some((r) => r.id === execId)).toBe(false);
    });

    it('persistExecutionDossierBlob refuses to resurrect a tombstoned dossier', () => {
        markExecutionDossierTombstone(execId);
        const ok = persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'zombie',
            debtors: [{ name: 'مدين' }],
        });
        expect(ok).toBe(false);
        expect(SecureStoreService.getItemSync(blobKey)).toBeNull();
    });

    it('reads legacy unscoped blob when scoped key is missing', () => {
        const legacyKey = unscopedExecutionStorageKey(execId);
        SecureStoreService.setItemSync(
            legacyKey,
            JSON.stringify({
                id: execId,
                fileNumber: 'legacy-read',
                timelineEvents: [{ id: 't-legacy', title: 'قديم' }],
            }),
        );

        setLiveAuthUserId('scoped-user');
        const scopedKey = scopeExecutionDeviceStorageKey(legacyKey);
        expect(scopedKey).not.toBe(legacyKey);
        expect(SecureStoreService.getItemSync(scopedKey)).toBeNull();

        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('legacy-read');
        expect(Array.isArray(blob?.timelineEvents)).toBe(true);
    });

    it('writes main blob to owner-scoped key when user is live', () => {
        setLiveAuthUserId('scoped-user');
        const legacyKey = unscopedExecutionStorageKey(execId);
        const scopedKey = scopeExecutionDeviceStorageKey(legacyKey);

        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'scoped-write',
            timelineEvents: [],
        });

        expect(SecureStoreService.getItemSync(scopedKey)).toContain('scoped-write');
        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('scoped-write');
    });

    it('does not read another user scoped blob via scope scan', () => {
        const foreignId = 'exec_foreign_scope';
        setLiveAuthUserId('user-b');
        const foreignKey = scopeExecutionDeviceStorageKey(unscopedExecutionStorageKey(foreignId));
        SecureStoreService.setItemSync(
            foreignKey,
            JSON.stringify({
                id: foreignId,
                fileNumber: 'SECRET-FROM-B',
                debtors: [{ name: 'مدين حساب ب' }],
            }),
        );

        setLiveAuthUserId('user-a');
        const hit = readExecutionDossierBlobScanningScopes(foreignId);
        expect(hit).toBeNull();
    });

    it('reads own scoped blob via scope scan when primary miss', () => {
        const ownId = 'exec_own_scope';
        setLiveAuthUserId('user-a');
        const scopedKey = scopeExecutionDeviceStorageKey(unscopedExecutionStorageKey(ownId));
        SecureStoreService.setItemSync(
            scopedKey,
            JSON.stringify({
                id: ownId,
                fileNumber: 'OWN-SCOPED',
            }),
        );

        const hit = readExecutionDossierBlobScanningScopes(ownId);
        expect(hit?.fileNumber).toBe('OWN-SCOPED');
    });

    it('يرحّل leftover localStorage للبلوب ويمحوه', () => {
        localStorage.setItem(
            blobKey,
            JSON.stringify({
                id: execId,
                fileNumber: 'ls-blob',
                debtors: [{ name: 'مدين leftover' }],
            }),
        );
        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('ls-blob');
        expect(localStorage.getItem(blobKey)).toBeNull();
        expect(SecureStoreService.getItemSync(blobKey)).toContain('ls-blob');
    });

    it('لا يرحّل مرآة البلوب فوق أصل مشفّر لم يُفكّ', () => {
        SecureStoreService.setItemSync(blobKey, 'hami_enc_v2:blob-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(
            blobKey,
            JSON.stringify({ id: execId, fileNumber: 'poison' }),
        );
        expect(SecureStoreService.isUnreadSync(blobKey)).toBe(true);
        expect(readExecutionDossierBlob(execId)).toBeNull();
        expect(localStorage.getItem(blobKey)).not.toBeNull();
        expect(SecureStoreService.getItemSync(blobKey)).toBeNull();
    });

    it('بعد كتابة البلوب يمحو مرآة localStorage', () => {
        localStorage.setItem(blobKey, JSON.stringify({ id: execId, fileNumber: 'stale' }));
        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'fresh',
            debtors: [{ name: 'مدين' }],
        });
        expect(localStorage.getItem(blobKey)).toBeNull();
        expect(SecureStoreService.getItemSync(blobKey)).toContain('fresh');
    });

    it('ensureExecutionDossierBlobReady لا يعيد كتابة بلوب IDB إن كان القرص plaintext', async () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'warm-plain',
            debtors: [{ name: 'مدين' }],
        });
        // اترك طابور كتابة الفهرس يستقر قبل قياس مسار التسخين
        await Promise.resolve();
        await Promise.resolve();
        const setSpy = vi.spyOn(SecureStoreService, 'setItem');
        await ensureExecutionDossierBlobReady(execId);
        const blobRewrites = setSpy.mock.calls.filter(([key]) => {
            const k = String(key);
            return k === blobKey || k.endsWith(`:${blobKey}`) || k.includes(blobKey);
        });
        expect(blobRewrites).toEqual([]);
        setSpy.mockRestore();
    });

    it('ensureExecutionDossierBlobReady ينتظر إعادة الكتابة عند ciphertext على القرص', async () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            fileNumber: 'migrate-me',
            debtors: [{ name: 'مدين' }],
        });
        vi.spyOn(SecureStoreService, 'peekRawFromDisk').mockResolvedValue('hami_enc_v2:legacy');
        const setSpy = vi.spyOn(SecureStoreService, 'setItem').mockResolvedValue(undefined as never);
        await ensureExecutionDossierBlobReady(execId);
        expect(setSpy).toHaveBeenCalled();
        expect(String(setSpy.mock.calls[0]?.[1] || '')).toContain('migrate-me');
        setSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('يرحّل leftover غير المقيّد إلى المقيّد عند وجود جلسة', () => {
        setLiveAuthUserId('scoped-user');
        const legacyKey = unscopedExecutionStorageKey(execId);
        const scopedKey = scopeExecutionDeviceStorageKey(legacyKey);
        localStorage.setItem(
            legacyKey,
            JSON.stringify({ id: execId, fileNumber: 'ls-unscoped' }),
        );
        const blob = readExecutionDossierBlob(execId);
        expect(blob?.fileNumber).toBe('ls-unscoped');
        expect(localStorage.getItem(legacyKey)).toBeNull();
        expect(SecureStoreService.getItemSync(scopedKey)).toContain('ls-unscoped');
    });
});
