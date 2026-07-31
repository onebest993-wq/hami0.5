import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7g seal batch honesty', () => {
    it('forum repos تستخدم loadForumSupabaseAdmin لا supabaseAdmin الثابت', () => {
        const files = [
            'src/app/services/forum/forumFollowRepository.ts',
            'src/app/services/forum/forumPostFollowRepository.ts',
            'src/app/services/forum/forumGroupRepository.ts',
            'src/app/services/forum/forumMuteRepository.ts',
            'src/app/services/forum/forumRepository.ts',
            'src/app/services/forum/forumRepositoryHydration.ts',
            'src/app/services/forum/forumRepositoryComments.ts',
            'src/app/services/forum/forumRepositoryModeration.ts',
            'src/app/services/notifications/notificationSupabaseInbox.ts',
        ];
        for (const rel of files) {
            const t = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(t, rel).toContain('loadForumSupabaseAdmin');
            expect(t, rel).not.toMatch(/from ['"].*supabaseAdmin['"]/);
            expect(t, rel).not.toContain('getForumSupabaseAdmin(');
        }
    });

    it('حارس forum-supabase-admin موجود', () => {
        expect(
            fs.existsSync(path.join(root, 'scripts/guard-dist-no-forum-supabase-admin-chunk.mjs')),
        ).toBe(true);
    });

    it('trial evidence مُستخرج من criminalStoreTrialActions', () => {
        const trial = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/criminal-system/criminalStoreTrialActions.ts'),
            'utf8',
        );
        const evidence = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/criminal-system/criminalStoreTrialEvidenceActions.ts',
            ),
            'utf8',
        );
        expect(trial).toContain('createCriminalTrialEvidenceActions');
        expect(trial).not.toContain('addTrialDeposition:');
        expect(evidence).toContain('addTrialDeposition:');
        expect(trial.split(/\r?\n/).length).toBeLessThan(750);
    });

    it('متابعة جديدة تحترم كتم المستلم', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/services/forum/forumNotificationDispatch.ts'),
            'utf8',
        );
        expect(t).toContain('ForumMuteRepository');
        expect(t).toContain('isMutedBy');
    });
});
