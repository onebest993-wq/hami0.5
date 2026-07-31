import { describe, expect, it, beforeEach, vi } from 'vitest';
import { recoverPlaintextAfterDecryptFailure, clearDecryptRecoveryAttempt, isPlaintextRecoveryEnabled } from '@/app/services/secureStoreRecovery';
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
        vi.unstubAllEnvs();
    });

    it('defaults to disabled (no silent recovery)', () => {
        expect(isPlaintextRecoveryEnabled()).toBe(false);
    });

    it('kill switch / default-off returns null even when legacy plaintext exists', async () => {
        localStorage.setItem('lawyer_files', JSON.stringify([{ id: '1' }]));
        const recovered = await recoverPlaintextAfterDecryptFailure('lawyer_files');
        expect(recovered).toBeNull();
    });

    it('recovers lawsuit files when explicitly enabled', async () => {
        vi.stubEnv('VITE_SECURE_STORE_PLAINTEXT_RECOVERY', 'true');
        const payload = [{ id: '1', caseNo: '2026/1' }];
        localStorage.setItem('lawyer_files', JSON.stringify(payload));

        const recovered = await recoverPlaintextAfterDecryptFailure('lawyer_files');
        expect(JSON.parse(String(recovered))).toEqual(payload);
    });

    it('returns null when no recovery source exists (even if enabled)', async () => {
        vi.stubEnv('VITE_SECURE_STORE_PLAINTEXT_RECOVERY', 'true');
        const recovered = await recoverPlaintextAfterDecryptFailure('lawyer_settings');
        expect(recovered).toBeNull();
    });
});
