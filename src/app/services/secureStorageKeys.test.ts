import { describe, expect, it } from 'vitest';
import {
    CRIMINAL_SHARD_ENCRYPT_MAX_BYTES,
    ENCRYPT_MAX_BYTES,
    isCriminalShardKey,
    isSensitiveStorageKey,
    isNeverEncryptedKey,
    shouldEncryptValue,
} from './secureStorageKeys';

describe('secureStorageKeys', () => {
    it('encrypts legal settings and leaves execution files plaintext locally', () => {
        expect(isSensitiveStorageKey('lawyer_settings')).toBe(true);
        expect(isSensitiveStorageKey('executionFiles')).toBe(false);
        expect(isSensitiveStorageKey('hami:smartvault:docs:v1')).toBe(true);
        expect(isSensitiveStorageKey('executionFiles:user-abc')).toBe(false);
    });

    /*
     * كاش الإشعارات المحلي (hami:notifications:v1:<userId>) يحمل title/message/
     * actionPayload بلا تقييد — منها اسم موكّل ورقم قضية (نفس فئة بيانات
     * client_/lawsuit_). كان غائباً عن قائمة التشفير فيُكتب نصّاً صريحاً.
     */
    it('encrypts the per-user notifications cache — client names/case refs in title/message/payload', () => {
        expect(isSensitiveStorageKey('hami:notifications:v1:user-1')).toBe(true);
        expect(shouldEncryptValue('hami:notifications:v1:user-1', JSON.stringify([{ id: 'n1' }]))).toBe(true);
    });

    it('never encrypts criminal monolith store', () => {
        expect(isNeverEncryptedKey('hami:criminal:store')).toBe(true);
        expect(isSensitiveStorageKey('hami:criminal:store')).toBe(false);
    });

    it('never encrypts lawyer wallpaper blob (sync read for CSS)', () => {
        expect(isNeverEncryptedKey('lawyer_wallpaper')).toBe(true);
        expect(isSensitiveStorageKey('lawyer_wallpaper')).toBe(false);
        expect(shouldEncryptValue('lawyer_wallpaper', 'data:image/jpeg;base64,abc')).toBe(false);
    });

    it('encrypts criminal shards under size cap', () => {
        expect(isSensitiveStorageKey('hami:criminal:case:abc')).toBe(true);
        expect(isSensitiveStorageKey('hami:criminal:meta')).toBe(true);
        expect(shouldEncryptValue('hami:criminal:case:abc', '{"id":"abc"}')).toBe(true);
    });

    it('encrypts notifications and profile above size cap', () => {
        const huge = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);
        expect(shouldEncryptValue('hami:notifications:v1:user-1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:profile:v1:user-1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:notifications:v1:user-1', JSON.stringify([{ id: 'n1' }]))).toBe(true);
    });

    it('encrypts boot-warmed lawsuit keys even above size cap', () => {
        const huge = 'x'.repeat(ENCRYPT_MAX_BYTES + 1);
        expect(shouldEncryptValue('lawyer_files_active', huge)).toBe(true);
        expect(shouldEncryptValue('lawyer_files', huge)).toBe(true);
        expect(shouldEncryptValue('lawyer_files_archived', huge)).toBe(true);
        expect(shouldEncryptValue('lawyer_files_trash', huge)).toBe(true);
        expect(shouldEncryptValue('execution_exec_heavy', huge)).toBe(false);
        expect(shouldEncryptValue('executionFiles:user-1', huge)).toBe(false);
        expect(shouldEncryptValue('lawyer_settings', huge)).toBe(true);
        expect(shouldEncryptValue('lawyer_notes', huge)).toBe(true);
        expect(shouldEncryptValue('hami:calendar:events:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:community:posts:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:repository:docs:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:smartvault:docs:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:lawsuit:dossier-tombstones:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:calendar:tombstones:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:community:deleted-ids:v1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:notifications:v1:user-1', huge)).toBe(true);
        expect(shouldEncryptValue('hami:profile:v1:user-1', huge)).toBe(true);
    });

    it('encrypts criminal shards even above criminal cap — chunking keeps parts under the cap', () => {
        const huge = 'x'.repeat(CRIMINAL_SHARD_ENCRYPT_MAX_BYTES + 1);
        expect(isCriminalShardKey('hami:criminal:case:heavy')).toBe(true);
        expect(shouldEncryptValue('hami:criminal:case:heavy', huge)).toBe(true);
        expect(isCriminalShardKey('hami:criminal:card-index')).toBe(true);
        expect(shouldEncryptValue('hami:criminal:card-index', '{"v":1,"entries":[]}')).toBe(true);
    });

    it('encrypts the per-user lawyer profile blob — display name and contact on disk', () => {
        expect(isSensitiveStorageKey('hami:profile:v1:user-1')).toBe(true);
        expect(shouldEncryptValue('hami:profile:v1:user-1', '{"header":{"name":"أحمد"}}')).toBe(true);
    });

    it('encrypts repository rooms and custom vault categories — client names at rest', () => {
        expect(isSensitiveStorageKey('hami:repository:rooms:v1:user-1')).toBe(true);
        expect(isSensitiveStorageKey('hami:smartvault:custom-categories:v1:user-1')).toBe(true);
        expect(shouldEncryptValue('hami:repository:rooms:v1:user-1', '[{"title":"موكل"}]')).toBe(true);
    });

    it('encrypts calendar, community posts, and repository docs — titles at rest', () => {
        expect(isSensitiveStorageKey('hami:calendar:events:v1')).toBe(true);
        expect(isSensitiveStorageKey('hami:community:posts:v1')).toBe(true);
        expect(isSensitiveStorageKey('hami:repository:docs:v1')).toBe(true);
        expect(shouldEncryptValue('hami:calendar:events:v1', '[{"title":"جلسة"}]')).toBe(true);
        expect(shouldEncryptValue('hami:community:posts:v1', '[{"content":"استشارة"}]')).toBe(true);
        expect(shouldEncryptValue('hami:repository:docs:v1', '[{"title":"عقد"}]')).toBe(true);
        expect(isSensitiveStorageKey('hami:calendar:tombstones:v1')).toBe(true);
        expect(isSensitiveStorageKey('hami:community:deleted-ids:v1')).toBe(true);
    });
});
