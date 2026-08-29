import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { prefetchCommunityAddQuestionOverlay } from '../communityOverlayPrefetch';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import { useCommunityAddQuestionAttachment } from './useCommunityAddQuestionAttachment';
import { useCommunityAddQuestionVoice } from './useCommunityAddQuestionVoice';
import { useCommunityAddQuestionPublish } from './useCommunityAddQuestionPublish';

export type UseCommunityAddQuestionParams = {
    lists: Pick<CommunityDualPostLists, 'setPosts' | 'removePostFromList'>;
    currentUserId: string | null;
    persistedUserId?: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string } | null;
    isBanned: boolean;
    activeGroupId: string | null;
    appendPublishedGroupPost: (saved: CommunityPost) => void;
    onForumPostPublished?: () => void;
};

export function useCommunityAddQuestion({
    lists,
    currentUserId,
    persistedUserId = null,
    authUser,
    isBanned,
    activeGroupId,
    appendPublishedGroupPost,
    onForumPostPublished,
}: UseCommunityAddQuestionParams) {
    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newTagText, setNewTagText] = useState('');
    const [newIsAnonymous, setNewIsAnonymous] = useState(false);
    const [newIsUrgent, setNewIsUrgent] = useState(false);
    const isAddQuestionOpenRef = useRef(false);
    isAddQuestionOpenRef.current = isAddQuestionOpen;

    const attachment = useCommunityAddQuestionAttachment(currentUserId, persistedUserId);
    const voice = useCommunityAddQuestionVoice({
        isAddQuestionOpen,
        handleUploadAttachment: attachment.handleUploadAttachment,
    });
    const { submittingPost, handleAddPost } = useCommunityAddQuestionPublish({
        lists,
        currentUserId,
        authUser,
        isBanned,
        activeGroupId,
        appendPublishedGroupPost,
        onForumPostPublished,
        newPostText,
        setNewPostText,
        newTagText,
        setNewTagText,
        newIsAnonymous,
        setNewIsAnonymous,
        newIsUrgent,
        setNewIsUrgent,
        newAttachment: attachment.newAttachment,
        setNewAttachment: attachment.setNewAttachment,
        setIsAddQuestionOpen,
        pendingAttachmentFileRef: attachment.pendingAttachmentFileRef,
    });

    const openAddQuestion = useCallback(() => {
        prefetchCommunityAddQuestionOverlay();
        isAddQuestionOpenRef.current = true;
        flushSync(() => setIsAddQuestionOpen(true));
    }, []);
    const closeAddQuestion = useCallback((options?: { soft?: boolean }) => {
        if (!isAddQuestionOpenRef.current) {
            setIsAddQuestionOpen(false);
            return;
        }
        isAddQuestionOpenRef.current = false;
        if (options?.soft) {
            setIsAddQuestionOpen(false);
            return;
        }
        flushSync(() => setIsAddQuestionOpen(false));
    }, []);

    return {
        isAddQuestionOpen,
        openAddQuestion,
        closeAddQuestion,
        newPostText,
        setNewPostText,
        newTagText,
        setNewTagText,
        newIsAnonymous,
        setNewIsAnonymous,
        newIsUrgent,
        setNewIsUrgent,
        newAttachment: attachment.newAttachment,
        removeAttachment: attachment.removeAttachment,
        submittingPost,
        isRecordingVoice: voice.isRecordingVoice,
        voiceRecordingSec: voice.voiceRecordingSec,
        imageInputRef: attachment.imageInputRef,
        docInputRef: attachment.docInputRef,
        toggleVoiceRecording: voice.toggleVoiceRecording,
        handleUploadAttachment: attachment.handleUploadAttachment,
        handleAddPost,
    };
}
