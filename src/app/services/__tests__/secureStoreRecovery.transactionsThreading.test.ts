import { beforeEach, describe, expect, it, vi } from 'vitest';

const readLatestDossierBackup = vi.fn();

vi.mock('@/app/services/dossierPersistence/dossierBackupStore', () => ({
    readLatestDossierBackup: (...args: unknown[]) => readLatestDossierBackup(...args),
}));

describe('secureStoreRecovery — خيوط المعاملات', () => {
    beforeEach(async () => {
        vi.unstubAllEnvs();
        readLatestDossierBackup.mockReset();
        const { clearDecryptRecoveryAttempt } = await import('@/app/services/secureStoreRecovery');
        clearDecryptRecoveryAttempt('hami:transactionsThreading:v1:u1');
    });

    it('يستعيد الحالة ككائن لا كمصفوفة مغلفة', async () => {
        vi.stubEnv('VITE_SECURE_STORE_PLAINTEXT_RECOVERY', 'true');
        const state = {
            userId: 'u1',
            transactions: [{ id: 't1' }],
            tasks: [],
            documents: [],
        };
        readLatestDossierBackup.mockResolvedValue({
            meta: {
                domain: 'transactionsThreading',
                revision: 1,
                savedAt: '2026-08-31T00:00:00.000Z',
                itemCount: 1,
            },
            payload: [state],
        });

        const { recoverPlaintextAfterDecryptFailure } = await import(
            '@/app/services/secureStoreRecovery'
        );
        const recovered = await recoverPlaintextAfterDecryptFailure(
            'hami:transactionsThreading:v1:u1',
        );
        expect(JSON.parse(String(recovered))).toEqual(state);
        expect(Array.isArray(JSON.parse(String(recovered)))).toBe(false);
    });
});
