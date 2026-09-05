import { describe, expect, it, vi, beforeEach } from 'vitest';

const writeDossierBackup = vi.fn(async () => undefined);

vi.mock('@/app/services/dossierPersistence/dossierBackupStore', () => ({
    writeDossierBackup: (...args: unknown[]) => writeDossierBackup(...args),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(() => '0'),
        setItemSync: vi.fn(),
    },
}));

describe('transactions threading backup payload', () => {
    beforeEach(() => {
        writeDossierBackup.mockClear();
    });

    it('يحفظ حالة الخيوط كعنصر واحد في مجال مستقل', async () => {
        const { writeProtectedBackupFromRaw } = await import(
            '@/app/services/dossierPersistence/protectedBackupService'
        );
        await writeProtectedBackupFromRaw(
            'hami:transactionsThreading:v1:u1',
            JSON.stringify({
                userId: 'u1',
                transactions: [{ id: 't1' }],
                tasks: [{ id: 'k1' }],
                documents: [],
            }),
        );
        expect(writeDossierBackup).toHaveBeenCalledTimes(1);
        expect(writeDossierBackup.mock.calls[0]?.[0]).toBe('transactionsThreading');
        const payload = writeDossierBackup.mock.calls[0]?.[1] as unknown[];
        expect(payload).toHaveLength(1);
        expect(payload[0]).toMatchObject({ userId: 'u1' });
        expect(Array.isArray(payload[0])).toBe(false);
    });

    it('لا ينسخ حالة فارغة', async () => {
        const { writeProtectedBackupFromRaw } = await import(
            '@/app/services/dossierPersistence/protectedBackupService'
        );
        await writeProtectedBackupFromRaw(
            'hami:transactionsThreading:v1:u1',
            JSON.stringify({
                userId: 'u1',
                transactions: [],
                tasks: [],
                documents: [],
            }),
        );
        expect(writeDossierBackup).not.toHaveBeenCalled();
    });
});
