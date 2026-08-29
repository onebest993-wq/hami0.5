import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    addRequestTypeTemplate,
    loadRequestTypeTemplates,
    normalizeRequestTypeTemplate,
    persistRequestTypeTemplates,
    removeRequestTypeTemplate,
    requestTypeTemplatesStorageKey,
} from '../fastTrackRequestTemplates';

const LEGACY = 'hami:fast-track-request-type-templates';

describe('fastTrackRequestTemplates', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.unstubAllEnvs();
        try {
            SecureStoreService.deleteItemSync(LEGACY);
            SecureStoreService.deleteItemSync(`${LEGACY}:alice`);
            SecureStoreService.deleteItemSync(`${LEGACY}:bob`);
            SecureStoreService.deleteItemSync(`${LEGACY}:migrated-user`);
        } catch {
            /* ignore */
        }
    });

    it('normalizes and dedupes on add', () => {
        expect(addRequestTypeTemplate([], '  منع سفر  ')).toEqual(['منع سفر']);
        expect(addRequestTypeTemplate(['منع سفر'], 'منع سفر')).toEqual(['منع سفر']);
        expect(addRequestTypeTemplate(['منع سفر'], 'أمر ولائي')).toEqual(['أمر ولائي', 'منع سفر']);
    });

    it('removes template by normalized text', () => {
        expect(removeRequestTypeTemplate(['أ', 'ب'], '  أ ')).toEqual(['ب']);
    });

    it('rejects empty templates', () => {
        expect(normalizeRequestTypeTemplate('   ')).toBe('');
        expect(addRequestTypeTemplate(['x'], '   ')).toEqual(['x']);
    });

    it('scopes storage key by userId', () => {
        expect(requestTypeTemplatesStorageKey('u1')).toBe(`${LEGACY}:u1`);
        expect(requestTypeTemplatesStorageKey('u2')).toBe(`${LEGACY}:u2`);
    });

    it('persists and loads per user without leaking across users', () => {
        persistRequestTypeTemplates(['منع سفر'], 'alice');
        persistRequestTypeTemplates(['أمر ولائي'], 'bob');
        expect(loadRequestTypeTemplates('alice')).toEqual(['منع سفر']);
        expect(loadRequestTypeTemplates('bob')).toEqual(['أمر ولائي']);
        expect(localStorage.getItem(`${LEGACY}:alice`)).toBeNull();
        expect(localStorage.getItem(`${LEGACY}:bob`)).toBeNull();
        expect(SecureStoreService.getItemSync(`${LEGACY}:alice`)).toBeTruthy();
        expect(SecureStoreService.getItemSync(`${LEGACY}:bob`)).toBeTruthy();
    });

    it('migrates legacy unscoped templates once into scoped key', () => {
        localStorage.setItem(LEGACY, JSON.stringify(['تراثي']));
        expect(loadRequestTypeTemplates('migrated-user')).toEqual(['تراثي']);
        expect(JSON.parse(String(SecureStoreService.getItemSync(`${LEGACY}:migrated-user`)))).toEqual(['تراثي']);
        expect(localStorage.getItem(LEGACY)).toBeNull();
        // scoped takes precedence on subsequent loads
        persistRequestTypeTemplates(['جديد'], 'migrated-user');
        expect(loadRequestTypeTemplates('migrated-user')).toEqual(['جديد']);
    });
});
