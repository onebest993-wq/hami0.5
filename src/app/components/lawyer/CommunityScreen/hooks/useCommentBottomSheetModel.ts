import { useMemo, useState } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import { useCommentThreadTree, type CommentSortMode } from './useCommentThreadTree';
import { useCommentThreadWindow } from './useCommentThreadWindow';

export function useCommentBottomSheetModel(
    post: CommunityPost,
    mentionCandidates: MentionCandidate[],
) {
    const [comment, setComment] = useState('');
    const mention = useForumMentionAutocomplete(comment, setComment, mentionCandidates);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [sortMode, setSortMode] = useState<CommentSortMode>('oldest');
    const bestCommentId = post.bestCommentId ?? null;
    const isLocked = post.isLocked === true;
    const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { commentById, childrenByParentId, bestComment, bestSubtreeIds } = useCommentThreadTree(
        post.comments,
        bestCommentId,
        sortMode,
    );

    const replyingTo = replyingToCommentId ? commentById.get(replyingToCommentId) ?? null : null;

    const excludedTopIds = useMemo(
        () => (bestComment ? new Set<string>(bestSubtreeIds) : new Set<string>()),
        [bestComment, bestSubtreeIds],
    );
    const topLevelThreads = useMemo(
        () => (childrenByParentId.get(null) ?? []).filter((c) => !excludedTopIds.has(c.id)),
        [childrenByParentId, excludedTopIds],
    );
    const { windowedTopThreads, hiddenThreadCount, commentSentinelRef } = useCommentThreadWindow(
        post.id,
        sortMode,
        topLevelThreads,
    );

    return {
        comment,
        setComment,
        mention,
        submittingComment,
        setSubmittingComment,
        sortMode,
        setSortMode,
        bestCommentId,
        isLocked,
        replyingToCommentId,
        setReplyingToCommentId,
        editingCommentId,
        setEditingCommentId,
        editContent,
        setEditContent,
        confirmDeleteId,
        setConfirmDeleteId,
        childrenByParentId,
        bestComment,
        excludedTopIds,
        windowedTopThreads,
        hiddenThreadCount,
        commentSentinelRef,
        replyingTo,
    };
}
