/**
 * سلوك حقيقي على المخزن: مفاتيح المعاملات تُكتب مشفَّرة وتُقرأ سليمة.
 * لا يُقاس بالسياسة وحدها — تُكتب ثم يُقرأ الخام من القرص.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';
import { ENCRYPT_MAX_BYTES, shouldEncryptValue } from '@/app/services/secureStorageKeys';

const ENCRYPTED_PREFIX = 'hami_enc_v2:';
const TX_KEY = 'hami:transactions:v1';
const THREAD_KEY = 'hami:transactionsThreading:v1:lawyer-at-rest-1';

describe('transactions at-rest encryption (behavior)', () => {
    beforeAll(async () => {
        await CryptoService.initialize('tx-at-rest-passphrase');
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

    it('سجل المعاملات يُكتب مشفَّراً على القرص ولا يترك اسم الموكّل صريحاً', async () => {
        const clientName = 'موكل_لا_يُخزَّن_صريحاً';
        const payload = JSON.stringify([{ id: 't1', userId: 'u1', clientName }]);
        await SecureStoreService.setItem(TX_KEY, payload);

        const raw = await SecureStoreService.peekRawFromDisk(TX_KEY);
        expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(true);
        expect(raw).not.toContain(clientName);

        expect(await SecureStoreService.getItem(TX_KEY)).toContain(clientName);
    });

    it('حالة الخيوط تُشفَّر كذلك', async () => {
        const state = JSON.stringify({
            userId: 'lawyer-at-rest-1',
            transactions: [],
            tasks: [{ id: 'k1', title: 'مهمة سرّية' }],
            financeRecords: [],
            documents: [],
            updatedAt: new Date().toISOString(),
        });
        await SecureStoreService.setItem(THREAD_KEY, state);

        const raw = await SecureStoreService.peekRawFromDisk(THREAD_KEY);
        expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(true);
        expect(raw).not.toContain('مهمة سرّية');
    });

    it('فوق حدّ الحجم: تشفير أو فشل — لا كتابة صريحة', async () => {
        const oversize = JSON.stringify([{ id: 'big', pad: 'x'.repeat(ENCRYPT_MAX_BYTES) }]);
        expect(shouldEncryptValue(TX_KEY, oversize)).toBe(true);
        await SecureStoreService.setItem(TX_KEY, oversize);
        const raw = await SecureStoreService.peekRawFromDisk(TX_KEY);
        expect(raw?.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    });

    /*
     * بلا مفتاح رئيسي لا تُرفض الكتابة برمي: `setItem` يحتجزها في طابور مؤجَّل
     * (`queueCryptoDeferredWrite`) لأن مفاتيح غير الدعاوى لا تُسقط رميها للمستدعي.
     * الضمان الذي يهمّ هو أن القرص لا يرى الاسم صريحاً — وهذا ما يُقاس هنا.
     */
    it('بلا مفتاح رئيسي: لا نص صريح على القرص — الكتابة تُؤجَّل', async () => {
        const clientName = 'موكل_مؤجَّل_لا_يُكتب_صريحاً';
        CryptoService.destroy();
        try {
            await SecureStoreService.setItem(TX_KEY, JSON.stringify([{ id: 'x', clientName }]));
            const raw = await SecureStoreService.peekRawFromDisk(TX_KEY);
            expect(raw ?? '').not.toContain(clientName);
            expect(raw == null || raw.startsWith(ENCRYPTED_PREFIX)).toBe(true);
        } finally {
            await CryptoService.initialize('tx-at-rest-passphrase');
        }
    });
});
