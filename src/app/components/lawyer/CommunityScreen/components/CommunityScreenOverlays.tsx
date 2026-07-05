import type { RefObject } from 'react';
import { Suspense } from 'react';

import type { CommunityPost, RepositoryDocument } from '@/app/services/lawyer-cloud';
import { ForumDeleteConfirmModal } from '@/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal';
import {
    LazyAddQuestionSheet,
    LazyCommentBottomSheet,
    LazyCreateGroupModal,
    LazyEditPostModal,
    LazyForumMemberProfileOverlay,
    LazyFullscreenImageOverlay,
    LazySearchOverlay,
} from '@/app/components/lawyer/CommunityScreen/communityScreenLazyOverlays';
import type { ForumParticipant } from '@/app/services/forum/forumMentionUtils';

export type CommunityScreenOverlaysProps = {
    activePostForComments: CommunityPost | null;
    currentUserId: string | null;
    isAdmin: boolean;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    mutedIds: Set<string>;
    forumMentionCandidates: ForumParticipant[];
    onCloseComments: () => void;
    onAddComment: (postId: string, content: string, parentId?: string) => Promise<boolean>;
    onToggleBestAnswer: (postId: string, commentId: string) => void;
    onDeleteComment: (postId: string, commentId: string) => void;
    onEditComment: (postId: string, commentId: string, content: string) => void;
    onFollow: (userId: string) => void;
    onToggleCommentUpvote?: (commentId: string) => void;
    onReportComment?: (commentId: string) => void;
    onMuteUser: (userId: string) => void;
    onOpenProfile: (userId: string, displayName?: string) => void;
    isSearchOpen: boolean;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    filterHasPdf: boolean;
    onFilterHasPdfChange: (value: boolean) => void;
    filterHasImage: boolean;
    onFilterHasImageChange: (value: boolean) => void;
    selectedTag: string | null;
    onSelectedTagChange: (value: string | null) => void;
    allSearchTags: string[];
    filteredPosts: CommunityPost[];
    filteredRepositoryDocs: RepositoryDocument[];
    onCloseSearch: () => void;
    onOpenPost: (postId: string) => void;
    onOpenDocument: (doc: RepositoryDocument) => void;
    isAddQuestionOpen: boolean;
    newPostText: string;
    onNewPostTextChange: (value: string) => void;
    newTagText: string;
    onNewTagTextChange: (value: string) => void;
    newIsAnonymous: boolean;
    onNewIsAnonymousChange: (value: boolean) => void;
    newIsUrgent: boolean;
    onNewIsUrgentChange: (value: boolean) => void;
    newAttachment: CommunityPost['attachment'];
    onRemoveAttachment: () => void;
    submittingPost: boolean;
    isRecordingVoice: boolean;
    voiceRecordingSec: number;
    imageInputRef: RefObject<HTMLInputElement | null>;
    docInputRef: RefObject<HTMLInputElement | null>;
    onToggleVoiceRecording: () => void;
    onImageUpload: (file: File) => void;
    onDocUpload: (file: File) => void;
    onSubmitPost: () => void;
    onCloseAddQuestion: () => void;
    fullscreenImage: string | null;
    onCloseFullscreenImage: () => void;
    isCreateGroupOpen: boolean;
    newGroupName: string;
    newGroupDesc: string;
    submittingGroup: boolean;
    onNewGroupNameChange: (value: string) => void;
    onNewGroupDescChange: (value: string) => void;
    onSubmitCreateGroup: () => void;
    onCloseCreateGroup: () => void;
    editingPostId: string | null;
    editingText: string;
    onEditingTextChange: (value: string) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    savingEdit: boolean;
    pendingDeletePostId: string | null;
    pendingDeletePost: CommunityPost | null;
    deletingPost: boolean;
    onConfirmDeletePost: () => void;
    onCancelDeletePost: () => void;
    profileView: { userId: string; displayName?: string } | null;
    onCloseProfile: () => void;
    followBusyUserId: string | null;
};

/** طبقات المنتدى العائمة — منفصلة عن جسم الشاشة لتسهيل التقسيم والتحميل التدريجي */
export function CommunityScreenOverlays(props: CommunityScreenOverlaysProps) {
    const {
        activePostForComments,
        currentUserId,
        isAdmin,
        followingIds,
        userStats,
        mutedIds,
        forumMentionCandidates,
        onCloseComments,
        onAddComment,
        onToggleBestAnswer,
        onDeleteComment,
        onEditComment,
        onFollow,
        onToggleCommentUpvote,
        onReportComment,
        onMuteUser,
        onOpenProfile,
        isSearchOpen,
        searchQuery,
        onSearchQueryChange,
        filterHasPdf,
        onFilterHasPdfChange,
        filterHasImage,
        onFilterHasImageChange,
        selectedTag,
        onSelectedTagChange,
        allSearchTags,
        filteredPosts,
        filteredRepositoryDocs,
        onCloseSearch,
        onOpenPost,
        onOpenDocument,
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
        fullscreenImage,
        onCloseFullscreenImage,
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
        pendingDeletePostId,
        pendingDeletePost,
        deletingPost,
        onConfirmDeletePost,
        onCancelDeletePost,
        profileView,
        onCloseProfile,
        followBusyUserId,
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

            {activePostForComments ? (
                <Suspense fallback={null}>
                    <LazyCommentBottomSheet
                        post={activePostForComments}
                        onClose={onCloseComments}
                        onAddComment={onAddComment}
                        currentUserId={currentUserId ?? ''}
                        onToggleBestAnswer={onToggleBestAnswer}
                        onDeleteComment={onDeleteComment}
                        onEditComment={onEditComment}
                        onFollow={onFollow}
                        followingIds={followingIds}
                        userStats={userStats}
                        isAdmin={isAdmin}
                        onToggleCommentUpvote={onToggleCommentUpvote}
                        onReportComment={onReportComment}
                        onMuteUser={onMuteUser}
                        mutedUserIds={mutedIds}
                        mentionCandidates={forumMentionCandidates}
                        onOpenProfile={onOpenProfile}
                    />
                </Suspense>
            ) : null}

            {isSearchOpen ? (
                <Suspense fallback={null}>
                    <LazySearchOverlay
                        isOpen={isSearchOpen}
                        searchQuery={searchQuery}
                        onSearchQueryChange={onSearchQueryChange}
                        filterHasPdf={filterHasPdf}
                        onFilterHasPdfChange={onFilterHasPdfChange}
                        filterHasImage={filterHasImage}
                        onFilterHasImageChange={onFilterHasImageChange}
                        selectedTag={selectedTag}
                        onSelectedTagChange={onSelectedTagChange}
                        allTags={allSearchTags}
                        filteredPosts={filteredPosts}
                        filteredDocuments={filteredRepositoryDocs}
                        onClose={onCloseSearch}
                        onOpenPost={onOpenPost}
                        onOpenDocument={onOpenDocument}
                    />
                </Suspense>
            ) : null}

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

            {fullscreenImage ? (
                <Suspense fallback={null}>
                    <LazyFullscreenImageOverlay imageUrl={fullscreenImage} onClose={onCloseFullscreenImage} />
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

            {profileView ? (
                <Suspense fallback={null}>
                    <LazyForumMemberProfileOverlay
                        userId={profileView.userId}
                        displayName={profileView.displayName}
                        onBack={onCloseProfile}
                        forumFollow={
                            currentUserId && profileView.userId !== currentUserId
                                ? {
                                      isFollowing: followingIds.has(profileView.userId),
                                      followerCount: userStats[profileView.userId]?.followerCount,
                                      postCount: userStats[profileView.userId]?.postCount,
                                      onToggle: () => onFollow(profileView.userId),
                                      busy: followBusyUserId === profileView.userId,
                                  }
                                : undefined
                        }
                    />
                </Suspense>
            ) : null}
        </>
    );
}
