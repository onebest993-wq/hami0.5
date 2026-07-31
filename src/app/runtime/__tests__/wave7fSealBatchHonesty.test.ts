import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7f seal batch honesty', () => {
    it('criminalStore root is composition-only (under 400 lines)', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/criminal-system/criminalStore.ts'),
            'utf8',
        );
        const lines = t.split(/\r?\n/).length;
        expect(lines).toBeLessThan(400);
        expect(t).toContain('createCriminalSessionDraftActions');
        expect(t).toContain('createCriminalLifecycleActions');
        expect(t).not.toContain('setBasicField: (key, value)');
    });

    it('forumNotificationDispatch لا يستورد forumModeratorIds', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/services/forum/forumNotificationDispatch.ts'),
            'utf8',
        );
        expect(t).not.toContain('forumModeratorIds');
        expect(t).not.toContain('dispatchForumReportSubmitted');
    });

    it('vite يفصل forumModeratorIds عن supabaseAdmin في manualChunks', () => {
        const t = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(t).toMatch(/forumModeratorIds[\s\S]{0,120}forum-moderator-ids/);
        expect(t).toMatch(/supabaseAdmin[\s\S]{0,120}forum-supabase-admin/);
        expect(t).not.toMatch(
            /forumModeratorIds[\s\S]{0,80}supabaseAdmin[\s\S]{0,80}forum-moderator-ids/,
        );
    });

    it('plaintext recovery افتراضياً معطّل', () => {
        const t = fs.readFileSync(path.join(root, 'src/app/services/secureStoreRecovery.ts'), 'utf8');
        expect(t).toContain("VITE_SECURE_STORE_PLAINTEXT_RECOVERY === 'true'");
        expect(t).toContain('isPlaintextRecoveryEnabled');
    });

    it('حراس ld-stem و forum-moderator موجودان', () => {
        expect(fs.existsSync(path.join(root, 'scripts/guard-ld-stem-deps.mjs'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'scripts/guard-dist-no-forum-moderator-chunk.mjs'))).toBe(
            true,
        );
    });
});
