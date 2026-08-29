import { beforeEach, describe, expect, it } from 'vitest';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';

const KEY = 'hami:test:repo-leftover:v1';

describe('LocalStorageRepository leftover drain', () => {
    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        persistenceRepository.remove(KEY);
        localStorage.clear();
    });

    it('يرحّل leftover عند load ويمحوه', () => {
        localStorage.setItem(KEY, JSON.stringify({ id: 'repo-ls' }));
        expect(persistenceRepository.load<{ id: string }>(KEY)).toEqual({ id: 'repo-ls' });
        expect(localStorage.getItem(KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(KEY)).toContain('repo-ls');
    });

    it('بعد flush يمحو المرآة الصريحة', () => {
        const flushKey = 'hami:test:files-leftover:v1';
        persistenceRepository.remove(flushKey);
        localStorage.setItem(flushKey, JSON.stringify({ stale: true }));
        persistenceRepository.save(flushKey, { id: 'fresh' });
        persistenceRepository.flushPending(flushKey);
        expect(localStorage.getItem(flushKey)).toBeNull();
        expect(SecureStoreService.getItemSync(flushKey)).toContain('"id":"fresh"');
    });

    it('حارس المسح يرى leftover قبل الكتابة الفارغة', () => {
        const filesKey = 'lawyer_files';
        persistenceRepository.remove(filesKey);
        localStorage.setItem(filesKey, JSON.stringify([{ id: 1 }, { id: 2 }]));
        persistenceRepository.save(filesKey, []);
        expect(JSON.parse(String(SecureStoreService.getItemSync(filesKey)))).toHaveLength(2);
        expect(localStorage.getItem(filesKey)).toBeNull();
    });
});
