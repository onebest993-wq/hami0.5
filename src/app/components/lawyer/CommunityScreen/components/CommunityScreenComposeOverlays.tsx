import { Suspense } from 'react';

import {
    LazyAddQuestionSheet,
    LazyCreateGroupModal,
    LazyEditPostModal,
} from '@/app/components/lawyer/CommunityScreen/communityScreenLazyEntries';
import { ForumDeleteConfirmModal } from '@/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal';
import type { CommunityScreenOverlaysProps } from './CommunityScreenOverlays.types';

export function CommunityScreenComposeEarlyOverlays(props: CommunityScreenOverlaysProps) {
    const {
        isCreateGroupOpen,
        newGroupName,
        newGroupDesc,
        submittingGroup,
        onNewGroupNameChange,
        onNewGroupDescChange,
        onSubmitCreateGroup,
        onCloseCreateGroup,
        editingPostId,
        editingText,
        onEditingTextChange,
        onSaveEdit,
        onCancelEdit,
        savingEdit,
    } = props;

    return (
        <>
            {isCreateGroupOpen ? (
                <Suspense fallback={null}>
                    <LazyCreateGroupModal
                        isOpen={isCreateGroupOpen}
                        name={newGroupName}
                        description={newGroupDesc}
                        submitting={submittingGroup}
                        onNameChange={onNewGroupNameChange}
                        onDescriptionChange={onNewGroupDescChange}
                        onSubmit={onSubmitCreateGroup}
                        onClose={onCloseCreateGroup}
                    />
                </Suspense>
            ) : null}

            {editingPostId ? (
                <Suspense fallback={null}>
                    <LazyEditPostModal
                        editingPostId={editingPostId}
                        editingText={editingText}
                        onTextChange={onEditingTextChange}
                        onSave={onSaveEdit}
                        onCancel={onCancelEdit}
                        savingEdit={savingEdit}
                    />
                </Suspense>
            ) : null}
        </>
    );
}

export function CommunityScreenComposeLateOverlays(props: CommunityScreenOverlaysProps) {
    const {
        isAddQuestionOpen,
        newPostText,
        onNewPostTextChange,
        newTagText,
        onNewTagTextChange,
        newIsAnonymous,
        onNewIsAnonymousChange,
        newIsUrgent,
        onNewIsUrgentChange,
        newAttachment,
        onRemoveAttachment,
        submittingPost,
        isRecordingVoice,
        voiceRecordingSec,
        imageInputRef,
        docInputRef,
        onToggleVoiceRecording,
        onImageUpload,
        onDocUpload,
        onSubmitPost,
        onCloseAddQuestion,
        forumMentionCandidates,
        pendingDeletePostId,
        pendingDeletePost,
        deletingPost,
        onConfirmDeletePost,
        onCancelDeletePost,
    } = props;

    return (
        <>
            {isAddQuestionOpen ? (
                <Suspense fallback={null}>
                    <LazyAddQuestionSheet
                        isOpen={isAddQuestionOpen}
                        newPostText={newPostText}
                        onNewPostTextChange={onNewPostTextChange}
                        newTagText={newTagText}
                        onNewTagTextChange={onNewTagTextChange}
                        newIsAnonymous={newIsAnonymous}
                        onNewIsAnonymousChange={onNewIsAnonymousChange}
                        newIsUrgent={newIsUrgent}
                        onNewIsUrgentChange={onNewIsUrgentChange}
                        newAttachment={newAttachment}
                        onRemoveAttachment={onRemoveAttachment}
                        submittingPost={submittingPost}
                        isRecordingVoice={isRecordingVoice}
                        voiceRecordingSec={voiceRecordingSec}
                        imageInputRef={imageInputRef}
                        docInputRef={docInputRef}
                        onToggleVoiceRecording={onToggleVoiceRecording}
                        onImageUpload={onImageUpload}
                        onDocUpload={onDocUpload}
                        onSubmit={onSubmitPost}
                        onClose={onCloseAddQuestion}
                        mentionCandidates={forumMentionCandidates}
                    />
                </Suspense>
            ) : null}

            <ForumDeleteConfirmModal
                open={pendingDeletePostId !== null}
                title="تأكيد حذف المنشور"
                message={
                    pendingDeletePost
                        ? `هل أنت متأكد من حذف هذه الاستشارة؟ لا يمكن التراجع عن الحذف.\n\n«${pendingDeletePost.content.slice(0, 80)}${pendingDeletePost.content.length > 80 ? '…' : ''}»`
                        : 'هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن الحذف.'
                }
                loading={deletingPost}
                onConfirm={() => void onConfirmDeletePost()}
                onCancel={onCancelDeletePost}
            />
        </>
    );
}
