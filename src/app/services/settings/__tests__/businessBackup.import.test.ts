import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importBusinessBackupEntries } from '@/app/services/settings/businessBackup';
import { STORAGE_KEYS } from '@/app/utils/constants';

const store = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
        setItem: vi.fn(async (key: string, value: string) => {
            store.set(key, value);
        }),
        deleteItem: vi.fn(async (key: string) => {
            store.delete(key);
        }),
    },
}));

describe('importBusinessBackupEntries', () => {
    beforeEach(() => {
        store.clear();
        vi.clearAllMocks();
    });

    it('يكتب المفاتيح المسموحة ويُطلق حدث الاستيراد', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const entries: Array<[string, string]> = [[STORAGE_KEYS.LAWYER_NOTES, '[]']];

        await importBusinessBackupEntries(entries);

        expect(store.get(STORAGE_KEYS.LAWYER_NOTES)).toBe('[]');
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'hami:data-imported' }));
    });

    it('يُرجع البيانات السابقة عند فشل الكتابة في منتصف الاستيراد', async () => {
        store.set('hami_notes_vault_a', 'original-a');
        store.set('hami_notes_vault_b', 'original-b');

        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        vi.mocked(SecureStoreService.setItem).mockImplementation(async (key, value) => {
            if (key === 'hami_notes_vault_b') throw new Error('disk full');
            store.set(key, value);
        });

        const entries: Array<[string, string]> = [
            ['hami_notes_vault_a', 'new-a'],
            ['hami_notes_vault_b', 'new-b'],
        ];

        await expect(importBusinessBackupEntries(entries)).rejects.toThrow('disk full');
        expect(store.get('hami_notes_vault_a')).toBe('original-a');
        expect(store.get('hami_notes_vault_b')).toBe('original-b');
    });

    it('يحذف المفاتيح الجديدة عند الفشل إذا لم تكن موجودة مسبقاً', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        vi.mocked(SecureStoreService.setItem).mockImplementation(async (key, value) => {
            if (key === 'hami_notes_vault_new') throw new Error('write failed');
            store.set(key, value);
        });

        await expect(
            importBusinessBackupEntries([['hami_notes_vault_new', 'payload']]),
        ).rejects.toThrow('write failed');
        expect(store.has('hami_notes_vault_new')).toBe(false);
    });
});
