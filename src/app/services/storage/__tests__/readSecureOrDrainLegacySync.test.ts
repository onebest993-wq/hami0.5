import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    persistSecurePayloadWhenReady,
    peekSecureOrLegacySync,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

const KEY = 'hami:calendar:events:v1';

describe('readSecureOrDrainLegacySync', () => {
    beforeEach(async () => {
        for (const key of SecureStoreService.listKeysSync()) {
            await SecureStoreService.deleteItem(key);
        }
        localStorage.clear();
    });

    it('يفضّل SecureStore ويمحو مرآة localStorage المتبقية', async () => {
        await SecureStoreService.setItem(KEY, JSON.stringify([{ id: 'from-secure' }]));
        localStorage.setItem(KEY, JSON.stringify([{ id: 'from-legacy' }]));

        const raw = readSecureOrDrainLegacySync(KEY);
        expect(JSON.parse(String(raw))).toEqual([{ id: 'from-secure' }]);
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('يرحّل مرآة غير فارغة ثم يمحوها', () => {
        const payload = JSON.stringify([{ id: 'legacy-only' }]);
        localStorage.setItem(KEY, payload);

        const raw = readSecureOrDrainLegacySync(KEY);
        expect(raw).toBe(payload);
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toBe(payload);
    });

    it('لا يرحّل المرآة فوق أصل مشفّر لم يُفكّ', () => {
        const cipher = 'hami_enc_v2:calendar-cold';
        SecureStoreService.setItemSync(KEY, cipher);
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(KEY, JSON.stringify([{ id: 'poison' }]));
        expect(SecureStoreService.isUnreadSync(KEY)).toBe(true);
        expect(readSecureOrDrainLegacySync(KEY)).toBeNull();
        expect(localStorage.getItem(KEY)).not.toBeNull();
    });

    it('لا يرحّل مصفوفة فارغة — مسار تظليل الحارس', () => {
        localStorage.setItem(KEY, '[]');
        expect(readSecureOrDrainLegacySync(KEY)).toBeNull();
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toBeNull();
    });

    it('peekSecureOrLegacySync يقرأ leftover دون ترحيل', () => {
        const payload = JSON.stringify([{ id: 'peek-only' }]);
        localStorage.setItem(KEY, payload);
        expect(peekSecureOrLegacySync(KEY)).toBe(payload);
        expect(localStorage.getItem(KEY)).toBe(payload);
        expect(SecureStoreService.getItemSync(KEY)).toBeNull();
    });

    it('peekSecureOrLegacySync لا يسمّ leftover فوق أصل unread', () => {
        SecureStoreService.setItemSync(KEY, 'hami_enc_v2:peek-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(KEY, JSON.stringify([{ id: 'poison' }]));
        expect(peekSecureOrLegacySync(KEY)).toBeNull();
        expect(localStorage.getItem(KEY)).not.toBeNull();
    });

    it('writeSecureAndClearLegacySync يكتب المخزن ويمحو المرآة', () => {
        localStorage.setItem(KEY, JSON.stringify([{ id: 'stale' }]));
        const payload = JSON.stringify([{ id: 'fresh' }]);
        writeSecureAndClearLegacySync(KEY, payload);
        expect(SecureStoreService.getItemSync(KEY)).toBe(payload);
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('persistSecurePayloadWhenReady يكتب القرص ويمحو المرآة دون مهلة نجاح', async () => {
        localStorage.setItem(KEY, JSON.stringify([{ id: 'stale' }]));
        const payload = JSON.stringify([{ id: 'disk' }]);
        await persistSecurePayloadWhenReady(KEY, payload);
        expect(await SecureStoreService.getItem(KEY)).toBe(payload);
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('clearLegacyPlaintextMirror يمحو المفتاح فقط', () => {
        localStorage.setItem(KEY, '[]');
        clearLegacyPlaintextMirror(KEY);
        expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('تقويم ومنتدى لا يعاملان مهلة 4ث كنجاح قبل IndexedDB', () => {
        const root = process.cwd();
        const community = readFileSync(
            join(root, 'src/app/services/cloud/lawyerCommunityCloud.ts'),
            'utf8',
        );
        const calendar = readFileSync(join(root, 'src/app/services/cloud/lawyerCalendarCloud.ts'), 'utf8');
        expect(community).toContain('persistSecurePayloadWhenReady');
        expect(calendar).toContain('persistSecurePayloadWhenReady');
        expect(community).not.toContain('ensurePersistedReady()');
        expect(calendar).not.toContain('ensurePersistedReady()');
        expect(community).not.toMatch(/setTimeout\(resolve, 4_000\)/);
        expect(calendar).not.toMatch(/setTimeout\(resolve, 4_000\)/);
    });

    it('خزنة ومعاملات ومستودع وملف لا يعاملون المهلة أو النص الصريح كنجاح', () => {
        const root = process.cwd();
        const vault = readFileSync(join(root, 'src/app/services/vault/vaultLocalIndex.ts'), 'utf8');
        const tx = readFileSync(join(root, 'src/app/services/cloud/lawyerTransactionsCloud.ts'), 'utf8');
        const threading = readFileSync(
            join(root, 'src/app/services/transactions/transactionsThreadingMirror.ts'),
            'utf8',
        );
        const repo = readFileSync(join(root, 'src/app/services/lawyer-cloud.ts'), 'utf8');
        const profile = readFileSync(join(root, 'src/app/services/cloud/lawyerProfileCloud.ts'), 'utf8');
        const urgent = readFileSync(join(root, 'src/app/services/urgent-actions-db.ts'), 'utf8');
        const templates = readFileSync(
            join(root, 'src/app/modules/transactionsThreading/taskTemplates.ts'),
            'utf8',
        );

        expect(vault).toContain('await SecureStoreService.setItem(VAULT_LOCAL_KEY, payload)');
        expect(vault).not.toMatch(/PERSIST_FLUSH_TIMEOUT/);
        expect(tx).toContain('persistTransactionsSecureAwait');
        expect(tx).not.toMatch(/last-resort plaintext/);
        expect(threading).toContain('writeSecureAndClearLegacySync');
        expect(threading).not.toMatch(/localStorage\.setItem\(key/);
        expect(repo).toContain('await loadLocalRepositoryDocs()');
        expect(repo).not.toContain('withRepositoryAsyncTimeout');
        expect(repo).not.toContain('repository-async-timeout');
        expect(profile).toContain('waitForPendingSetItem');
        expect(profile).not.toMatch(/setTimeout\(resolve, 8_000\)/);
        expect(urgent).toContain('persistSecurePayloadWhenReady');
        expect(urgent).not.toMatch(/localStorage\.setItem\(key, payload\)/);
        expect(templates).toContain('writeSecureAndClearLegacySync');
        expect(templates).not.toMatch(/localStorage\.setItem\(key, payload\)/);
        expect(readFileSync(join(root, 'src/app/services/vault/vaultDocsTombstonesLite.ts'), 'utf8')).not.toMatch(
            /localStorage\.setItem/,
        );
        expect(readFileSync(join(root, 'src/app/services/forum/forumGroupLocalStore.ts'), 'utf8')).toContain(
            'writeSecureJsonValue',
        );
        expect(readFileSync(join(root, 'src/app/services/repository/repositoryRooms.ts'), 'utf8')).toContain(
            'writeSecureJsonValue',
        );
        const journal = readFileSync(join(root, 'src/app/domain/lawsuit/lawsuitWriteJournal.ts'), 'utf8');
        expect(journal).toContain('writeSecureJsonValue');
        expect(journal).not.toMatch(/localStorage\.setItem\(LAWSUIT_WRITE_JOURNAL_KEY/);
        const pending = readFileSync(
            join(root, 'src/app/domain/lawsuit/lawsuitPendingCreateStore.ts'),
            'utf8',
        );
        expect(pending).toContain('writeSecureJsonValue');
        expect(pending).not.toMatch(/localStorage\.setItem\(LAWSUIT_PENDING_CREATES_KEY/);
        expect(pending).not.toMatch(/sessionStorage\.setItem\(LAWSUIT_PENDING_CREATES_KEY/);
        const kyc = readFileSync(join(root, 'src/app/services/auth/lawyerVerificationStore.ts'), 'utf8');
        expect(kyc).toContain('writeSecureJsonValue');
        expect(kyc).not.toMatch(/localStorage\.setItem\(STORE_KEY/);
        const quantum = readFileSync(join(root, 'src/app/utils/quantumTasksStorage.ts'), 'utf8');
        expect(quantum).toContain('writeSecureAndClearLegacySync');
        expect(quantum).not.toMatch(/localStorage\.setItem\(QUANTUM_TASKS_STORAGE_KEY/);
        const caseStore = readFileSync(join(root, 'src/app/stores/caseStore.ts'), 'utf8');
        expect(caseStore).toContain('createSecureJSONStorage');
        expect(caseStore).not.toMatch(/createGuardedJSONStorage/);
        expect(caseStore).not.toMatch(/localStorage\)/);
        const criminalPersist = readFileSync(
            join(root, 'src/app/services/criminalShardedPersistStorage.ts'),
            'utf8',
        );
        expect(criminalPersist).toContain('waitForCriminalShardedFlush');
        expect(criminalPersist).not.toMatch(/await SecureStoreService\.setItem\(name, value\)/);
        const quantumProvider = readFileSync(
            join(root, 'src/app/context/QuantumTasksProvider.tsx'),
            'utf8',
        );
        expect(quantumProvider).toContain('clearLegacyPlaintextMirror(QUANTUM_TASKS_STORAGE_KEY)');
        expect(quantumProvider).toContain('onBootContentReady');
        const cache = readFileSync(join(root, 'src/app/utils/storageCache.ts'), 'utf8');
        expect(cache).toContain('readSecureOrDrainLegacySync');
        expect(cache).toContain('clearLegacyPlaintextMirror(key)');
        const ledger = readFileSync(join(root, 'src/app/utils/unifiedFundsLedgerStorage.ts'), 'utf8');
        expect(ledger).toContain('readSecureOrDrainLegacySync');
        expect(ledger).toContain('clearLegacyPlaintextMirror');
        const execFiles = readFileSync(join(root, 'src/app/utils/executionFilesStorage.ts'), 'utf8');
        expect(execFiles).toContain('readSecureOrDrainLegacySync');
        expect(execFiles).toContain('writeSecureAndClearLegacySync');
        const notes = readFileSync(join(root, 'src/app/utils/globalNotesStorage.ts'), 'utf8');
        expect(notes).toContain('readSecureOrDrainLegacySync');
        const profileRead = readFileSync(
            join(root, 'src/app/services/profile/lawyerProfileLocalRead.ts'),
            'utf8',
        );
        expect(profileRead).toContain('peekSecureOrLegacySync');
        expect(profileRead).not.toMatch(/readSecureOrDrainLegacySync\(/);
        const peek = readFileSync(join(root, 'src/app/infrastructure/notificationPeekLite.ts'), 'utf8');
        expect(peek).toContain('peekSecureOrLegacySync');
        expect(peek).not.toMatch(/readSecureOrDrainLegacySync\(/);
        const wipe = readFileSync(join(root, 'src/app/utils/executionWipeRegistry.ts'), 'utf8');
        expect(wipe).toContain('EXECUTION_WIPE_EXACT_KEYS');
        expect(wipe).toContain('waitForPendingSetItem');
        const blob = readFileSync(join(root, 'src/app/utils/executionDossierBlobPersistence.ts'), 'utf8');
        expect(blob).toContain('readScopedSecureOrDrainLegacySync');
        expect(blob).toContain('clearLegacyPlaintextMirror(writeKey)');
        expect(blob).not.toMatch(/localStorage\?\.setItem\(k, v\)/);
        const archiveUtils = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/utils.ts'),
            'utf8',
        );
        expect(archiveUtils).toContain('readScopedSecureOrDrainLegacySync');
        const persistenceRepo = readFileSync(
            join(root, 'src/app/infrastructure/persistence/LocalStorageRepository.ts'),
            'utf8',
        );
        expect(persistenceRepo).toContain('readSecureOrDrainLegacySync');
        expect(persistenceRepo).toContain('clearLegacyPlaintextMirror(key)');
        const criminalRead = readFileSync(join(root, 'src/app/utils/criminalCasesStorageRead.ts'), 'utf8');
        expect(criminalRead).toContain('readCriminalMonolithRawSync');
        expect(criminalRead).not.toMatch(/readSecureOrDrainLegacySync\(CRIMINAL_STORE_KEY\)/);
        const decisionsStore = readFileSync(
            join(root, 'src/app/utils/executionDecisionsNamespaceStore.ts'),
            'utf8',
        );
        expect(decisionsStore).toContain('readScopedSecureOrDrainLegacySync');
        const lawsuitPersist = readFileSync(
            join(root, 'src/app/domain/lawsuit/lawsuitSegmentPersist.ts'),
            'utf8',
        );
        expect(lawsuitPersist).toContain('readSecureOrDrainLegacySync');
        expect(lawsuitPersist).toContain('clearLegacyPlaintextMirror');
        const lawsuitFlush = readFileSync(
            join(root, 'src/app/domain/lawsuit/lawsuitPersistFlush.ts'),
            'utf8',
        );
        expect(lawsuitFlush).toContain('readSecureOrDrainLegacySync');
        const lawsuitGate = readFileSync(
            join(root, 'src/app/domain/lawsuit/lawsuitDurabilityGate.ts'),
            'utf8',
        );
        expect(lawsuitGate).toContain('readSecureOrDrainLegacySync');
        const peekShare = readFileSync(
            join(root, 'src/app/services/caseShare/caseSharePeekLite.ts'),
            'utf8',
        );
        expect(peekShare).toContain('peekSecureOrLegacySync');
        expect(peekShare).not.toMatch(/readSecureOrDrainLegacySync\(/);
        const shareStore = readFileSync(
            join(root, 'src/app/services/caseShare/caseShareLocalStore.ts'),
            'utf8',
        );
        expect(shareStore).not.toContain('ensurePersistedReady');
        expect(shareStore).toContain('readSecureOrDrainLegacySync');
        const notesBridge = readFileSync(join(root, 'src/app/services/notesSyncBridge.ts'), 'utf8');
        expect(notesBridge).toContain('readSecureOrDrainLegacySync');
        const dossierPersist = readFileSync(
            join(root, 'src/app/services/dossierPersistence/dossierPersistenceService.ts'),
            'utf8',
        );
        expect(dossierPersist).toContain('readSecureOrDrainLegacySync');
        expect(dossierPersist).toContain('clearLegacyPlaintextMirror');
        const verify = readFileSync(
            join(root, 'src/app/domain/lawsuit/lawsuitDurabilityVerify.ts'),
            'utf8',
        );
        expect(verify).toContain('leftover في localStorage وحده ليس إثبات قرص');
    });
});
