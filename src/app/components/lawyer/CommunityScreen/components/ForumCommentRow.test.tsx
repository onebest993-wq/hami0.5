import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumCommentRow } from './ForumCommentRow';

const baseComment: CommunityComment = {
    id: 'c1',
    postId: 'p1',
    authorId: 'u1',
    authorName: 'محامي',
    content: 'تعليق تجريبي',
    createdAt: new Date().toISOString(),
};

const basePost: CommunityPost = {
    id: 'p1',
    authorId: 'u2',
    authorName: 'مالك المنشور',
    content: 'منشور تجريبي',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachment: null,
    upvoterIds: [],
    comments: [baseComment],
    bestCommentId: null,
};

function renderRow(overrides: Partial<ComponentProps<typeof ForumCommentRow>> = {}) {
    return render(
        <ForumCommentRow
            comment={baseComment}
            post={basePost}
            depth={0}
            forceBestStyle={false}
            bestCommentId={null}
            currentUserId="u1"
            isAdmin={false}
            isLocked={false}
            canSelectBest={false}
            followingIds={new Set()}
            userStats={{}}
            editingCommentId={null}
            editContent=""
            confirmDeleteId={null}
            onSetEditingCommentId={vi.fn()}
            onSetEditContent={vi.fn()}
            onSetConfirmDeleteId={vi.fn()}
            onSetReplyingToCommentId={vi.fn()}
            onFollow={vi.fn()}
            onToggleBestAnswer={vi.fn()}
            onEditComment={vi.fn()}
            onDeleteComment={vi.fn()}
            {...overrides}
        />,
    );
}

describe('ForumCommentRow', () => {
    it('يفتح تحرير التعليق عند الضغط على زر التعديل', () => {
        const onSetEditingCommentId = vi.fn();
        const onSetEditContent = vi.fn();
        renderRow({ onSetEditingCommentId, onSetEditContent });

        fireEvent.click(screen.getByTitle('تعديل التعليق'));

        expect(onSetEditingCommentId).toHaveBeenCalledWith('c1');
        expect(onSetEditContent).toHaveBeenCalledWith('تعليق تجريبي');
    });

    it('يحذف التعليق مباشرة عند الضغط على زر الحذف', async () => {
        const onDeleteComment = vi.fn(async () => {});
        const onSetConfirmDeleteId = vi.fn();
        renderRow({ onDeleteComment, onSetConfirmDeleteId });

        fireEvent.click(screen.getByTitle('حذف التعليق'));

        await waitFor(() => {
            expect(onDeleteComment).toHaveBeenCalledWith('p1', 'c1');
        });
        expect(onSetConfirmDeleteId).toHaveBeenCalledWith(null);
    });
});
