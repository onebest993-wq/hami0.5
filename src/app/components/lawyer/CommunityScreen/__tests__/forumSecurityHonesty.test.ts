import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('أمان المنتدى — أقفال عدم التراجع', () => {
    it('يرفض الروابط النسبية للبروتوكول ويعقّم الغلاف', () => {
        const urlSafety = read('src/app/services/forum/forumUrlSafety.ts');
        expect(urlSafety).toContain("startsWith('//')");
        expect(urlSafety).toContain('sanitizeForumCoverImage');
        expect(urlSafety).toContain('image/svg+xml');
    });

    it('يفحص عضوية المجموعة قبل تصويت/بلاغ التعليق', () => {
        expect(read('src/app/api/forum/comment-upvote/route.ts')).toContain(
            'assertForumCommentGroupAccess',
        );
        expect(read('src/app/api/forum/comment-report/route.ts')).toContain(
            'assertForumCommentGroupAccess',
        );
        expect(existsSync(join(root, 'src/app/services/forum/forumCommentAccess.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/services/forum/forumCommentAddGuard.ts'))).toBe(true);
    });

    it('يقفل النقاش ويتحقق من أصل الرد في مسار التعليق', () => {
        const comment = read('src/app/api/forum/comment/route.ts');
        expect(comment).toContain('assertForumPostAcceptsComments');
        expect(comment).toContain('resolveForumReplyParentId');
        expect(read('src/app/services/forum/forumRepositoryComments.ts')).toContain(
            'assertForumPostAcceptsComments',
        );
    });

    it('يفعّل حد المعدّل للمتابعة وإنشاء المجموعة والتثبيت', () => {
        expect(read('src/app/api/forum/follow/route.ts')).toContain("checkForumActionRateLimit(auth.userId, 'follow')");
        expect(read('src/app/api/forum/groups/route.ts')).toContain("'group_create'");
        expect(read('src/app/api/forum/pin/route.ts')).toContain("checkForumActionRateLimit(auth.userId, 'pin')");
        expect(read('src/app/services/forum/forumRateLimitServer.ts')).toContain("'group_create'");
        expect(read('src/app/services/forum/forumRateLimitServer.ts')).toContain("'pin'");
    });

    it('يعقّم سبب البلاغ واسم المتابع وبصمة ملف المستودع', () => {
        expect(read('src/app/api/forum/report/route.ts')).toContain('sanitizeForumReportReason');
        expect(read('src/app/api/forum/follow/route.ts')).toContain('sanitizeForumActorLabel');
        expect(read('src/app/components/lawyer/CommunityScreen/hooks/runLegalRepositoryUploadSubmit.ts')).toContain(
            'validateRepositoryUploadFileContents',
        );
        expect(read('src/app/components/lawyer/CommunityScreen/repositoryUploadValidation.ts')).toContain(
            'repositoryUploadMagicLooksValid',
        );
    });

    it('blobs الجديدة تُشفَّر بمفتاح الجلسة والقديمة تُقرأ كما هي', () => {
        const atRest = read('src/app/services/forum/forumBlobAtRest.ts');
        expect(atRest).toContain('hasMasterKey');
        expect(atRest).toContain('encryptData');
        expect(atRest).toContain('if (!row.encrypted) return row.blob');
        expect(atRest).not.toContain('.initialize');
        const store = read('src/app/services/forumBlobStore.ts');
        expect(store).not.toContain('CryptoService');
        expect(store).toContain('wrapForumBlobForAtRest');
        expect(store).toContain('unwrapForumBlobFromAtRest');
        expect(store).toContain('if (!wrapped.encrypted) return');
        expect(read('src/app/services/settings/wipeIndexedDatabases.ts')).toContain("'hami-forum-blobs'");
        expect(
            read('src/app/components/lawyer/CommunityScreen/repositoryStorageService.ts'),
        ).not.toContain('CryptoService');
    });
});

describe('أمان البحث والمستودع — اختبارات سلوك لا أقفال نص', () => {
    it('الملفات السلوكية لهذا القسم موجودة بجانب أقفال المنتدى العامة', () => {
        for (const rel of [
            'src/app/services/forum/__tests__/forumRepositoryDocsSanitize.test.ts',
            'src/app/services/forum/__tests__/forumRepositoryOrphanSweep.test.ts',
            'src/app/services/forum/__tests__/forumRepositoryIndexRetryWorker.test.ts',
            'src/app/services/forum/__tests__/forumRepositoryDocsQuery.test.ts',
            'src/app/services/forum/__tests__/forumRepositoryIndexQueue.test.ts',
            'src/app/api/forum/search/route.test.ts',
            'src/app/api/forum/repository/route.test.ts',
            'src/app/api/forum/repository/signed-url/route.test.ts',
            'src/app/components/lawyer/CommunityScreen/hooks/__tests__/useLegalRepositoryUpload.test.ts',
            'src/app/components/lawyer/CommunityScreen/__tests__/legalRepositoryCloudSync.test.ts',
            'supabase/migrations/20260830150000_forum_repository_orphan_paths.sql',
        ]) {
            expect(existsSync(join(root, rel)), rel).toBe(true);
        }
    });
});


