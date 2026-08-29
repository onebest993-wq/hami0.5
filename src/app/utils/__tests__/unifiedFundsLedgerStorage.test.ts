import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    appendUnifiedLedgerExecutionExpense,
    readUnifiedFundsLedger,
    unifiedFundsLedgerStorageKey,
} from '@/app/utils/unifiedFundsLedgerStorage';

const EXEC_ID = 'ledger-drain';
const KEY = unifiedFundsLedgerStorageKey(EXEC_ID);

const leftoverLedger = {
    lawyerFees: [{ id: 'fee-legacy', amount: 1000, label: 'أتعاب', at: '2026-01-01' }],
    expenses: [],
    payments: [],
    completed: false,
    garnishment: false,
    seeded: true,
    collectionRequestActive: false,
};

describe('unifiedFundsLedgerStorage leftover drain', () => {
    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
    });

    it('يرحّل leftover localStorage عند القراءة ويمحوه', () => {
        localStorage.setItem(KEY, JSON.stringify(leftoverLedger));
        const snap = readUnifiedFundsLedger(EXEC_ID);
        expect(snap?.lawyerFees[0]?.id).toBe('fee-legacy');
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toContain('fee-legacy');
    });

    it('لا يرحّل المرآة فوق أصل مشفّر لم يُفكّ', () => {
        SecureStoreService.setItemSync(KEY, 'hami_enc_v2:unified-ledger-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(KEY, JSON.stringify(leftoverLedger));
        expect(SecureStoreService.isUnreadSync(KEY)).toBe(true);
        expect(readUnifiedFundsLedger(EXEC_ID)).toBeNull();
        expect(localStorage.getItem(KEY)).not.toBeNull();
    });

    it('الكتابة تمحو المرآة الصريحة', () => {
        localStorage.setItem(KEY, JSON.stringify(leftoverLedger));
        expect(appendUnifiedLedgerExecutionExpense(EXEC_ID, 250, 'رسم محكمة')).toBe(true);
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toContain('رسم محكمة');
    });
});
