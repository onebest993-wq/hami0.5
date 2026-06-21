import { describe, expect, it } from 'vitest';
import {
    ENCRYPT_MAX_BYTES,
    isSensitiveStorageKey,
    isNeverEncryptedKey,
    shouldEncryptValue,
} from './secureStorageKeys';

describe('secureStorageKeys', () => {
    it('encrypts legal settings and execution files', () => {
        expect(isSensitiveStorageKey('lawyer_settings')).toBe(true);
        expect(isSensitiveStorageKey('executionFiles')).toBe(true);
        expect(isSensitiveStorageKey('hami:smartvault:docs:v1')).toBe(true);
    });

    it('never encrypts criminal monolith store', () => {
        expect(isNeverEncryptedKey('hami:criminal:store')).toBe(true);
        expect(isSensitiveStorageKey('hami:criminal:store')).toBe(false);
    });

    it('encrypts criminal shards under size cap', () => {
        expect(isSensitiveStorageKey('hami:criminal:case:abc')).toBe(true);
        expect(isSensitiveStorageKey('hami:criminal:meta')).toBe(true);
        expect(shouldEncryptValue('hami:criminal:case:abc', '{"id":"abc"}')).toBe(true);
    });

    it('skips encryption above size cap', () => {
        const huge = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);
        expect(shouldEncryptValue('lawyer_settings', huge)).toBe(false);
        expect(shouldEncryptValue('lawyer_settings', '{"a":1}')).toBe(true);
    });
});
