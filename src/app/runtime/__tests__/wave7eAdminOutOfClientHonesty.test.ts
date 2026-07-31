import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7e admin-out-of-client honesty', () => {
    it('forumNotificationDbResolver يستخدم @vite-ignore لوحدة الخادم', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/forumNotificationDbResolver.ts'),
            'utf8',
        );
        expect(t).toContain('@vite-ignore');
        expect(t).toContain('notificationForumStorage.server');
    });

    it('notificationServerBlob لا يستورد kvStoreAdmin بشكل static', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationServerBlob.ts'),
            'utf8',
        );
        expect(t).not.toMatch(/from\s+['"][^'"]*kvStoreAdmin['"]/);
        expect(t).toContain('loadKvStoreAdmin');
    });

    it('حارسك dist-no-kv-admin-chunk موجود', () => {
        expect(fs.existsSync(path.join(root, 'scripts/guard-dist-no-kv-admin-chunk.mjs'))).toBe(true);
    });
});
