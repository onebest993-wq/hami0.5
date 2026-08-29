import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shouldIgnoreForumSectionSwipeTarget } from '../hooks/useForumSectionSwipe';

const root = path.join(process.cwd(), 'src/app/components/lawyer/CommunityScreen');

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('forum overlay FAB + portal stacking', () => {
    it('نوافذ الرفع/المجموعة تُرسم داخل طبقة المنتدى لا document.body', () => {
        for (const rel of [
            'components/UploadDocumentModal.tsx',
            'components/CreateGroupModal.tsx',
            'components/ForumDeleteConfirmModal.tsx',
            'components/CommentBottomSheet.tsx',
            'components/ForumFollowingPanel.tsx',
            'components/ForumCategoryPanel.tsx',
        ]) {
            const src = read(rel);
            expect(src, rel).toContain('getForumOverlayPortalRoot()');
            expect(src, rel).not.toContain('document.body');
            expect(src, rel).toContain('z-[120]');
        }
    });

    it('أزرار الرفع والإنشاء ثابتة فوق التمرير وليست absolute داخل overflow', () => {
        const theme = read('forumPlumTheme.ts');
        expect(theme).toContain("FORUM_PUBLISH_FAB_SLOT =");
        expect(theme).toContain('fixed inset-x-0 bottom-0');
        expect(theme).not.toMatch(/FORUM_PUBLISH_FAB_SLOT =\s*'pointer-events-none absolute/);
        expect(theme).toContain('FORUM_CONTENT_COLUMN');
        expect(theme).toContain('max-w-[min(100%,42rem)]');
        expect(theme).toContain('env(safe-area-inset-left)');
        expect(theme).toContain('env(safe-area-inset-right)');
        expect(theme).toContain('env(safe-area-inset-bottom)');
        expect(read('components/LegalRepository.tsx')).toContain('FORUM_CONTENT_COLUMN');
        expect(read('components/LegalRepository.tsx')).toContain('ForumPublishFab');
        expect(read('components/ForumGroupsDirectory.tsx')).toContain('FORUM_CONTENT_COLUMN');
        expect(read('components/ForumGroupsDirectory.tsx')).toContain('ForumPublishFab');
        expect(read('components/CommunityScreenBodyChrome.tsx')).toContain('ForumPublishFab');
        expect(read('components/CommunityScreenBody.tsx')).toContain('min-h-0');
        expect(read('components/CommunityScreenBody.tsx')).toContain('overscroll-contain');
    });
});

describe('shouldIgnoreForumSectionSwipeTarget', () => {
    it('يتجاهل الأزرار ولا يتجاهل سطح التمرير', () => {
        const button = document.createElement('button');
        const span = document.createElement('span');
        button.appendChild(span);
        document.body.append(button);
        const surface = document.createElement('div');
        document.body.append(surface);
        expect(shouldIgnoreForumSectionSwipeTarget(span)).toBe(true);
        expect(shouldIgnoreForumSectionSwipeTarget(button)).toBe(true);
        expect(shouldIgnoreForumSectionSwipeTarget(surface)).toBe(false);
        button.remove();
        surface.remove();
    });
});
