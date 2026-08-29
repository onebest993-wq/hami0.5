/**
 * سلوك حقيقي: معاملات plaintext محلياً + ترحيل ciphertext قديم عند التسخين.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';
import {
    isTransactionsLocalPlaintextKey,
    shouldEncryptValue,
} from '@/app/services/secureStorageKeys';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';
const TX_KEY = 'hami:transactions:v1';
const THREAD_KEY = 'hami:transactionsThreading:v1:lawyer-migrate-1';

describe('transactions local plaintext migration (behavior)', () => {
    beforeAll(async () => {
        await CryptoService.initialize('tx-plaintext-migrate-passphrase');
    });

    afterAll(() => {
        CryptoService.destroy();
    });

    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        SecureStoreService.clearDecryptedMemoryCache();
    });

    it('الكتابة اليومية لا تضع hami_enc_v2 على مفاتيح المعاملات', async () => {
        const payload = JSON.stringify([{ id: 't1', userId: 'u1', title: 'معاملة' }]);
        expect(isTransactionsLocalPlaintextKey(TX_KEY)).toBe(true);
        expect(shouldEncryptValue(TX_KEY, payload)).toBe(false);

        await SecureStoreService.setItem(TX_KEY, payload);
        const raw = await SecureStoreService.peekRawFromDisk(TX_KEY);
        expect(raw).toBe(payload);
        expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(false);
        expect(await SecureStoreService.getItem(TX_KEY)).toContain('معاملة');
    });

    it('warmKeys يرحّل ciphertext قديم إلى plaintext على القرص', async () => {
        const plain = JSON.stringify([{ id: 'legacy', userId: 'u1', clientName: 'موكل قديم' }]);
        const cipherBody = await CryptoService.encryptData(plain);
        const planted = `${ENCRYPTED_PREFIX}${cipherBody}`;

        await SecureStoreService.setItem(TX_KEY, planted);
        SecureStoreService.clearDecryptedMemoryCache();

        const beforeWarm = await SecureStoreService.peekRawFromDisk(TX_KEY);
        expect(beforeWarm?.startsWith(ENCRYPTED_PREFIX)).toBe(true);

        await SecureStoreService.warmKeys([TX_KEY]);
        // setItem الترحيل غير متزامن داخل warm — انتظر دورة
        await vi.waitFor(
            async () => {
                const raw = await SecureStoreService.peekRawFromDisk(TX_KEY);
                expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(false);
                expect(raw).toContain('موكل قديم');
            },
            { timeout: 5_000 },
        );

        expect(SecureStoreService.getItemSync(TX_KEY)).toContain('موكل قديم');
    });

    it('خيوط المعاملات: نفس سياسة plaintext بعد الكتابة', async () => {
        const state = JSON.stringify({
            userId: 'lawyer-migrate-1',
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
            updatedAt: new Date().toISOString(),
        });
        expect(shouldEncryptValue(THREAD_KEY, state)).toBe(false);
        await SecureStoreService.setItem(THREAD_KEY, state);
        const raw = await SecureStoreService.peekRawFromDisk(THREAD_KEY);
        expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(false);
    });
});
