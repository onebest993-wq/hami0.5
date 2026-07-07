import { lazy } from 'react';

export const addQuestionImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/AddQuestionSheet').then((m) => ({
        default: m.AddQuestionSheet,
    }));

export const commentSheetImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/CommentBottomSheet').then((m) => ({
        default: m.CommentBottomSheet,
    }));

export const searchOverlayImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/SearchOverlay').then((m) => ({
        default: m.SearchOverlay,
    }));

export const createGroupImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/CreateGroupModal').then((m) => ({
        default: m.CreateGroupModal,
    }));

export const editPostImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/EditPostModal').then((m) => ({
        default: m.EditPostModal,
    }));

export const memberProfileImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay').then((m) => ({
        default: m.ForumMemberProfileOverlay,
    }));

export const fullscreenImageImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/FullscreenImageOverlay').then((m) => ({
        default: m.FullscreenImageOverlay,
    }));

export const LazyCommentBottomSheet = lazy(commentSheetImport);
export const LazyEditPostModal = lazy(editPostImport);
export const LazyForumMemberProfileOverlay = lazy(memberProfileImport);
export const LazyFullscreenImageOverlay = lazy(fullscreenImageImport);
export const LazyAddQuestionSheet = lazy(addQuestionImport);
export const LazySearchOverlay = lazy(searchOverlayImport);
export const LazyCreateGroupModal = lazy(createGroupImport);
