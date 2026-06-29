import { lazy } from 'react';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

const addQuestionImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/AddQuestionSheet').then((m) => ({
        default: m.AddQuestionSheet,
    }));

const commentSheetImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/CommentBottomSheet').then((m) => ({
        default: m.CommentBottomSheet,
    }));

const searchOverlayImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/SearchOverlay').then((m) => ({
        default: m.SearchOverlay,
    }));

const createGroupImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/CreateGroupModal').then((m) => ({
        default: m.CreateGroupModal,
    }));

const editPostImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/EditPostModal').then((m) => ({
        default: m.EditPostModal,
    }));

const deleteConfirmImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal').then((m) => ({
        default: m.ForumDeleteConfirmModal,
    }));

const memberProfileImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay').then((m) => ({
        default: m.ForumMemberProfileOverlay,
    }));

const fullscreenImageImport = () =>
    import('@/app/components/lawyer/CommunityScreen/components/FullscreenImageOverlay').then((m) => ({
        default: m.FullscreenImageOverlay,
    }));

export const LazyAddQuestionSheet = lazy(addQuestionImport);
export const LazyCommentBottomSheet = lazy(commentSheetImport);
export const LazySearchOverlay = lazy(searchOverlayImport);
export const LazyCreateGroupModal = lazy(createGroupImport);
export const LazyEditPostModal = lazy(editPostImport);
export const LazyForumDeleteConfirmModal = lazy(deleteConfirmImport);
export const LazyForumMemberProfileOverlay = lazy(memberProfileImport);
export const LazyFullscreenImageOverlay = lazy(fullscreenImageImport);

export function prefetchCommunityCommentOverlay(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void commentSheetImport().catch(() => undefined);
}

export function prefetchCommunityAddQuestionOverlay(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void addQuestionImport().catch(() => undefined);
}

export function prefetchCommunitySearchOverlay(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void searchOverlayImport().catch(() => undefined);
}

/** prefetch طبقات المنتدى الثقيلة — hover/idle فقط */
export function prefetchCommunityHeavyOverlays(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    void commentSheetImport().catch(() => undefined);
    void addQuestionImport().catch(() => undefined);
    void searchOverlayImport().catch(() => undefined);
    void createGroupImport().catch(() => undefined);
    void editPostImport().catch(() => undefined);
    void deleteConfirmImport().catch(() => undefined);
    void fullscreenImageImport().catch(() => undefined);
}

/** بعد فتح الشاشة — prefetch مؤجَّل للملف الشخصي (يُحمَّل RoyalLawyerProfile داخلياً) */
export function scheduleCommunityProfileOverlayPrefetch(): void {
    if (typeof window === 'undefined' || isLitePerformanceActive()) return;
    scheduleIdleWork(() => {
        void memberProfileImport().catch(() => undefined);
    }, 4_000);
}
