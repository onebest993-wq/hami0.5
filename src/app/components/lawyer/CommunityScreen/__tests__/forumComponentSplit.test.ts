import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readRel(...parts: string[]): string {
    return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

function lineCount(rel: string): number {
    return readRel(rel).split(/\r?\n/).length;
}

describe('تقسيم مكوّنات وملفات المنتدى', () => {
    it('ForumApiService واجهة رفيعة؛ المجالات في forum/forumApi', () => {
        expect(lineCount('src/app/services/forumApiService.ts')).toBeLessThan(220);
        expect(readRel('src/app/services/forumApiService.ts')).toContain('SecureAPIClient');
        expect(readRel('src/app/services/forumApiService.ts')).toContain('/api/forum/');
        expect(readRel('src/app/services/forum/forumApi/forumApiServiceLazy.ts')).toContain(
            "import('@/app/services/forum/forumApi/forumApiSearch')",
        );
        expect(readRel('src/app/services/forum/forumApi/forumApiServiceLazy.ts')).toContain(
            "import('@/app/services/forum/forumApi/forumApiNotifications')",
        );
        for (const rel of [
            'src/app/services/forum/forumApi/forumApiPosts.ts',
            'src/app/services/forum/forumApi/forumApiComments.ts',
            'src/app/services/forum/forumApi/forumApiGroups.ts',
            'src/app/services/forum/forumApi/forumApiSocial.ts',
            'src/app/services/forum/forumApi/forumApiNotifications.ts',
            'src/app/services/forum/forumApi/forumApiSearch.ts',
            'src/app/services/forum/forumApi/forumApiRepository.ts',
        ]) {
            expect(fs.existsSync(path.join(root, rel)), rel).toBe(true);
            expect(lineCount(rel), rel).toBeLessThan(280);
        }
    });

    it('قائمة المزيد والبوابة والتعليق والمستودع مقسّمة مع بقاء النصوص المحمية', () => {
        const moreMenu = readRel(
            'src/app/components/lawyer/CommunityScreen/components/QuestionCardMoreMenu.tsx',
        );
        expect(moreMenu.split(/\r?\n/).length).toBeLessThan(140);
        expect(moreMenu).toContain('buildQuestionCardMoreMenuItems');
        expect(moreMenu).toContain('خيارات المنشور');
        expect(moreMenu).toContain('QuestionCardMoreMenuPanel');

        const commentRow = readRel(
            'src/app/components/lawyer/CommunityScreen/components/ForumCommentRow.tsx',
        );
        expect(commentRow.split(/\r?\n/).length).toBeLessThan(140);
        expect(commentRow).toContain('ForumCommentRowEdit');
        expect(commentRow).toContain('ForumCommentRowHeader');
        expect(commentRow).toContain('ForumCommentRowFooter');
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/CommunityScreen/components/ForumCommentRow.types.ts',
                ),
            ),
        ).toBe(true);

        const accessGate = readRel(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenAccessGate.tsx',
        );
        expect(accessGate).toContain('forum-access-pending');
        expect(accessGate).toContain('forum-access-rejected');
        expect(accessGate).toContain('CommunityScreenAccessGatePanel');

        const legalRepo = readRel(
            'src/app/components/lawyer/CommunityScreen/components/LegalRepository.tsx',
        );
        expect(legalRepo).toContain('useExpandingVisibleCount');
        expect(legalRepo).toContain('REPO_LIST_INITIAL');
        expect(legalRepo).toContain('LegalRepositoryModals');
    });

    it('إشعارات النقاش منفصلة عن متابعة المؤلف', () => {
        const social = readRel('src/app/services/forum/forumNotificationDispatch.ts');
        expect(social).toContain('ForumMuteRepository');
        expect(social).toContain('isMutedBy');
        expect(social).not.toContain('forumModeratorIds');
        expect(social).not.toContain('dispatchForumReportSubmitted');
        expect(social).toContain('forumNotificationDispatchThread');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/services/forum/forumNotificationDispatchThread.ts'),
            ),
        ).toBe(true);
    });

    it('تشفير مرفقات IndexedDB منفصل عن مخزن الصفوف', () => {
        expect(lineCount('src/app/services/forum/forumBlobAtRest.ts')).toBeLessThan(90);
        expect(lineCount('src/app/services/forumBlobStore.ts')).toBeLessThan(190);
        expect(readRel('src/app/services/forum/forumBlobAtRest.ts')).not.toContain('.initialize');
    });

    it('بحث المنتدى والمستودع على الخادم لا على الذاكرة فقط', () => {
        expect(lineCount('src/app/services/forum/forumRepositorySearch.ts')).toBeLessThan(120);
        expect(lineCount('src/app/services/forum/forumRepositoryDocs.ts')).toBeLessThan(220);
        expect(readRel('src/app/api/forum/search/route.ts')).toContain('searchForumPostsOnServer');
        expect(readRel('src/app/api/forum/search/route.ts')).toContain('searchForumRepositoryDocsOnServer');
        expect(readRel('src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenSearchOverlay.ts')).toContain(
            'ForumApiService.searchCommunity',
        );
    });
});
