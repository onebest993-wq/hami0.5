import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forumUi = path.join(root, 'src/app/components/lawyer/CommunityScreen');
const forumSvc = path.join(root, 'src/app/services/forum');

function readRel(...parts: string[]): string {
    return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

describe('نظافة قسم المنتدى — بلا ميت ولا تكرار براميل', () => {
    it('لا غلاف supabaseAdmin ولا برميل الاستشارة العاجلة في الواجهة', () => {
        expect(fs.existsSync(path.join(forumSvc, 'supabaseAdmin.ts'))).toBe(false);
        expect(fs.existsSync(path.join(forumUi, 'forumUrgentConsultation.ts'))).toBe(false);
        expect(fs.existsSync(path.join(forumUi, 'assets/forum-cuneiform-tile-dark.svg'))).toBe(false);
        expect(fs.existsSync(path.join(forumUi, 'assets/forum-cuneiform-tile-gold.svg'))).toBe(false);
    });

    it('persist بلا تصحيح محلي ولا حفظ مفكرة ميت', () => {
        const persist = readRel('src/app/services/forum/forumPostPersistActions.ts');
        expect(persist).not.toContain('127.0.0.1:7777');
        expect(persist).not.toContain('debug-point');
        expect(persist).not.toContain('saveForumPostToNotepad');
        expect(persist).toContain('saveForumAttachmentToVault');
    });

    it('لا دوال كاش محلي مهجورة ولا تصدير مجموعة كسول بلا مستهلك', () => {
        const attach = readRel('src/app/services/forumAttachmentService.ts');
        expect(attach).not.toContain('cacheForumAttachmentFile');
        expect(attach).not.toContain('placeholder to keep line');
        expect(attach).not.toMatch(/^export async function finalizeForumAttachmentForPersist/m);

        const repo = readRel(
            'src/app/components/lawyer/CommunityScreen/repositoryStorageService.ts',
        );
        expect(repo).not.toContain('cacheRepositoryFileLocally');

        const lazy = readRel(
            'src/app/components/lawyer/CommunityScreen/communityScreenLazyEntries.tsx',
        );
        expect(lazy).not.toContain('export const createGroupImport');
        expect(lazy).toContain('const createGroupImport');
    });

    it('لا دوال reset*ForTests بلا اختبارات', () => {
        const files = [
            'src/app/components/lawyer/CommunityScreen/repositoryBlobRegistry.ts',
            'src/app/services/forum/forumAuthorResolver.ts',
            'src/app/services/forum/forumSentryReporting.ts',
            'src/app/services/forum/forumNotificationsWarmCache.ts',
            'src/app/services/forum/forumSocialWarmCache.ts',
        ];
        for (const rel of files) {
            const src = readRel(rel);
            expect(src, rel).not.toMatch(/export function reset\w+ForTests/);
        }
    });

    it('قائمة المزيد تستخدم سياسة canFollowThread / canMutePostAuthor', () => {
        const menu = readRel(
            'src/app/components/lawyer/CommunityScreen/questionCardMoreMenuItems.ts',
        );
        expect(menu).toContain('canFollowThread(post, currentUserId)');
        expect(menu).toContain('canMutePostAuthor(post, currentUserId)');
        expect(menu).not.toContain('onToggleThreadFollow && currentUserId');
        expect(menu).not.toContain('!isOwner && !isAnonymous && onMuteUser');
    });

    it('Chrome بلا هيكل تغذية ميت وبلا دوال أداء/بوابة بلا مستهلك', () => {
        const css = readRel('src/app/components/lawyer/CommunityScreen/forumPlumChrome.css');
        expect(css).not.toContain('hami-forum-feed-skeleton');
        expect(css).not.toContain('hami-forum-skel-');
        expect(css).not.toContain('cuneiform');

        const gate = readRel('src/app/services/forum/forumGroupMutationGate.ts');
        expect(gate).toContain('assertForumPostGroupAccess');
        expect(gate).not.toContain('loadPostWithGroupAccess');

        const perf = readRel('src/app/services/forum/forumPerfMetrics.ts');
        expect(perf).not.toContain('reportForumPerfIfDev');

        const hub = readRel('src/app/runtime/communityHubLoader.ts');
        expect(hub).not.toContain('getCachedCommunityScreen');
    });
});
