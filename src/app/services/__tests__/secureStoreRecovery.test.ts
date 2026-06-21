import { describe, expect, it, vi, beforeEach } from 'vitest';
import { recoverPlaintextAfterDecryptFailure, clearDecryptRecoveryAttempt } from '@/app/services/secureStoreRecovery';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('secureStoreRecovery', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        clearDecryptRecoveryAttempt('lawyer_files');
        try {
            localStorage.removeItem('lawyer_files');
        } catch {
            /* ignore */
        }
    });

    it('recovers lawsuit files from legacy localStorage plaintext', async () => {
        const payload = [{ id: '1', caseNo: '2026/1' }];
        localStorage.setItem('lawyer_files', JSON.stringify(payload));

        const recovered = await recoverPlaintextAfterDecryptFailure('lawyer_files');
        expect(JSON.parse(String(recovered))).toEqual(payload);
    });

    it('returns null when no recovery source exists', async () => {
        const recovered = await recoverPlaintextAfterDecryptFailure('lawyer_settings');
        expect(recovered).toBeNull();
    });
});
