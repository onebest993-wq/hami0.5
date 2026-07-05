import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { checkForumRateLimit } from '../forumRateLimit';
import {
    saveForumAttachmentToVault,
} from '@/app/services/forum/forumPostPersistActions';
import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { buildForumEditPatch } from '@/app/services/forum/forumEditUtils';
import { canEditPost, canPinPost } from '../communityPermissions';
import { prefetchCommunityEditPostOverlay } from '../communityScreenLazyOverlays';
import { withAllowedClipboardAction } from '@/app/runtime/screenshotDeterrentRuntime';
import { downloadRepositoryFile } from '../repositoryStorageService';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { getForumSessionUserId } from '@/app/services/forum/forumApi/forumApiClientCore';

async function copyTextWithFallback(text: string): Promise<boolean> {
    const value = text.trim();
    if (!value) return false;

    try {
        if (navigator.clipboard?.writeText) {
            await withAllowedClipboardAction(() => navigator.clipboard.writeText(value));
            return true;
        }
    } catch {
        /* fall back below */
    }

    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.inset = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    try {
        return await withAllowedClipboardAction(() => document.execCommand('copy'));
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

export type UseCommunityScreenPostModerationParams = {
    currentUserId: string | null;
    isAdmin: boolean;
    authUser: { user_metadata?: { fullName?: string }; email?: string | null } | null;
    persistedUser: { id?: string | null; email?: string | null } | null;
    findPostById: (postId: string) => CommunityPost | undefined;
    updatePostList: (postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    bookmarkedIds: Set<string>;
    setBookmarkedIds: Dispatch<SetStateAction<Set<string>>>;
};

export function useCommunityScreenPostModeration({
    currentUserId,
    isAdmin,
    authUser,
    persistedUser,
    findPostById,
    updatePostList,
    bookmarkedIds,
    setBookmarkedIds,
}: UseCommunityScreenPostModerationParams) {
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const actionInflightRef = useRef(new Set<string>());

    const runInflight = useCallback(async (key: string, action: () => Promise<void>) => {
        if (actionInflightRef.current.has(key)) return;
        actionInflightRef.current.add(key);
        try {
            await action();
        } finally {
            actionInflightRef.current.delete(key);
        }
    }, []);

    const handleTogglePin = useCallback(
        async (postId: string) => {
            if (!canPinPost(isAdmin)) {
                SmartToast.warning('التثبيت متاح للإدارة فقط');
                return;
            }
            await runInflight(`pin:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post) return;
                const nextPinned = !post.isPinned;
                updatePostList(postId, (prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? {
                                  ...p,
                                  isPinned: nextPinned || undefined,
                                  updatedAt: new Date().toISOString(),
                              }
                            : p,
                    ),
                );
                SmartToast.success(nextPinned ? 'تم تثبيت المنشور' : 'تم إلغاء تثبيت المنشور');
                try {
                    const updated = await ForumApiService.togglePin(postId, nextPinned);
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                } catch {
                    updatePostList(postId, (prev) =>
                        prev.map((p) =>
                            p.id === postId
                                ? { ...p, isPinned: post.isPinned || undefined, updatedAt: post.updatedAt }
                                : p,
                        ),
                    );
                    SmartToast.error('تعذّر تحديث حالة التثبيت');
                }
            });
        },
        [findPostById, isAdmin, runInflight, updatePostList],
    );

    const handleToggleBookmark = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول لحفظ المنشور');
                return;
            }
            await runInflight(`bookmark:${postId}`, async () => {
                const wasBookmarked = bookmarkedIds.has(postId);
                setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (wasBookmarked) next.delete(postId);
                    else next.add(postId);
                    return next;
                });
                SmartToast.success(wasBookmarked ? 'تم إلغاء الحفظ' : 'تم حفظ المنشور');
                try {
                    const bookmarked = await ForumApiService.toggleBookmark(postId, currentUserId);
                    setBookmarkedIds((prev) => {
                        const next = new Set(prev);
                        if (bookmarked) next.add(postId);
                        else next.delete(postId);
                        return next;
                    });
                } catch {
                    setBookmarkedIds((prev) => {
                        const next = new Set(prev);
                        if (wasBookmarked) next.add(postId);
                        else next.delete(postId);
                        return next;
                    });
                    SmartToast.error('تعذّر تحديث حالة الحفظ');
                }
            });
        },
        [bookmarkedIds, currentUserId, runInflight, setBookmarkedIds],
    );

    const handleCopyPostText = useCallback(
        async (postId: string) => {
            const post = findPostById(postId);
            if (!post) return;
            const text = post.content;
            try {
                const copied = await copyTextWithFallback(text);
                if (!copied) {
                    throw new Error('copy-failed');
                }
                SmartToast.success('تم نسخ نص المنشور');
            } catch {
                SmartToast.error('تعذّر نسخ النص');
            }
        },
        [findPostById],
    );

    const handleSavePostToVault = useCallback(
        async (postId: string) => {
            const sessionUserId = await getForumSessionUserId();
            const targetUserId =
                sessionUserId?.trim() ||
                (authUser && 'id' in authUser && typeof authUser.id === 'string' && authUser.id.trim()
                    ? authUser.id.trim()
                    : persistedUser?.id?.trim() ||
                      (currentUserId && isRealSignedIn(currentUserId) ? currentUserId : null));
            if (!targetUserId) {
                SmartToast.warning('سجّل الدخول للحفظ في المستودع الذكي');
                return;
            }
            await runInflight(`vault:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post?.attachment) {
                    SmartToast.info('لا يوجد مرفق لحفظه');
                    return;
                }
                const authorName =
                    authUser?.user_metadata?.fullName ||
                    authUser?.email ||
                    persistedUser?.email ||
                    'محامي';
                try {
                    //#region debug-point save-to-vault-click
                    fetch('http://127.0.0.1:7777/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: 'save-to-vault',
                            runId: 'post-fix',
                            hypothesisId: 'A',
                            location: 'useCommunityScreenPostModeration.ts:handleSavePostToVault:start',
                            msg: '[DEBUG] save-to-vault clicked',
                            data: {
                                postId,
                                currentUserId,
                                targetUserId,
                                attachmentType: post.attachment.type,
                                attachmentName: post.attachment.name ?? null,
                                storagePath: post.attachment.storagePath ?? null,
                                attachmentUrl: post.attachment.url ?? null,
                            },
                            ts: Date.now(),
                        }),
                    }).catch(() => undefined);
                    //#endregion debug-point save-to-vault-click
                    await saveForumAttachmentToVault(
                        post,
                        targetUserId,
                        String(authorName),
                    );
                    //#region debug-point save-to-vault-success
                    fetch('http://127.0.0.1:7777/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: 'save-to-vault',
                            runId: 'post-fix',
                            hypothesisId: 'D',
                            location: 'useCommunityScreenPostModeration.ts:handleSavePostToVault:success',
                            msg: '[DEBUG] save-to-vault completed without throwing',
                            data: { postId, currentUserId, targetUserId },
                            ts: Date.now(),
                        }),
                    }).catch(() => undefined);
                    //#endregion debug-point save-to-vault-success
                    SmartToast.success('تم حفظ المرفق في المستودع الذكي');
                } catch (error) {
                    //#region debug-point save-to-vault-failed
                    fetch('http://127.0.0.1:7777/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId: 'save-to-vault',
                            runId: 'post-fix',
                            hypothesisId: 'D',
                            location: 'useCommunityScreenPostModeration.ts:handleSavePostToVault:failed',
                            msg: '[DEBUG] save-to-vault failed in UI handler',
                            data: {
                                postId,
                                currentUserId,
                                targetUserId,
                                errorMessage: error instanceof Error ? error.message : null,
                            },
                            ts: Date.now(),
                        }),
                    }).catch(() => undefined);
                    //#endregion debug-point save-to-vault-failed
                    SmartToast.error('تعذّر حفظ المرفق في المستودع الذكي');
                }
            });
        },
        [authUser, currentUserId, findPostById, persistedUser?.email, persistedUser?.id, runInflight],
    );

    const handleSavePostToDevice = useCallback(
        async (postId: string) => {
            await runInflight(`save-device:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post?.attachment) {
                    SmartToast.info('لا يوجد مرفق لحفظه');
                    return;
                }
                try {
                    const url = await resolveCommunityAttachmentUrl(post.attachment);
                    if (!url) {
                        SmartToast.warning('الملف غير متاح للحفظ حالياً');
                        return;
                    }
                    const fileName = post.attachment.name?.trim() || `forum-${post.id}`;
                    await downloadRepositoryFile(url, fileName);
                    SmartToast.success('تم حفظ الملف في الجهاز');
                } catch {
                    SmartToast.error('تعذّر حفظ الملف في الجهاز');
                }
            });
        },
        [findPostById, runInflight],
    );

    const handleToggleLock = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
            await runInflight(`lock:${postId}`, async () => {
                const post = findPostById(postId);
                if (!post) return;
                if (post.authorId !== currentUserId && !isAdmin) {
                    SmartToast.warning('قفل النقاش متاح لصاحب المنشور أو الإدارة');
                    return;
                }
                const nextLocked = !post.isLocked;
                const snapshot = post.isLocked;
                updatePostList(postId, (prev) =>
                    prev.map((p) =>
                        p.id === postId
                            ? { ...p, isLocked: nextLocked || undefined, updatedAt: new Date().toISOString() }
                            : p,
                    ),
                );
                SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
                try {
                    const updated = await ForumApiService.toggleLockDiscussion(
                        postId,
                        nextLocked,
                        currentUserId,
                        isAdmin,
                        post.author_id ?? post.authorId,
                    );
                    updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
                } catch (err) {
                    updatePostList(postId, (prev) =>
                        prev.map((p) => (p.id === postId ? { ...p, isLocked: snapshot || undefined } : p)),
                    );
                    const message =
                        err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث حالة القفل';
                    SmartToast.error(message);
                }
            });
        },
        [currentUserId, findPostById, isAdmin, runInflight, updatePostList],
    );

    const handleEditPost = useCallback(
        (postId: string) => {
            const post = findPostById(postId);
            if (!post || !canEditPost(post, currentUserId, isAdmin)) {
                SmartToast.warning('لا يمكنك تعديل هذا المنشور');
                return;
            }
            setEditingPostId(postId);
            setEditingText(post.content);
            prefetchCommunityEditPostOverlay();
        },
        [currentUserId, findPostById, isAdmin],
    );

    const handleSaveEdit = useCallback(async () => {
        if (!editingPostId) return;
        const nextText = editingText.trim();
        if (nextText.length < 5) {
            SmartToast.warning('النص قصير جداً');
            return;
        }
        if (nextText.length > 10_000) {
            SmartToast.warning('النص طويل جداً (الحد 10000 حرف)');
            return;
        }
        const targetId = editingPostId;
        const snapshot = findPostById(targetId);
        const editPatch = snapshot ? buildForumEditPatch(snapshot, nextText) : null;
        updatePostList(targetId, (prev) =>
            prev.map((p) => (p.id === targetId && editPatch ? { ...p, ...editPatch } : p)),
        );
        setEditingPostId(null);
        setEditingText('');
        setSavingEdit(true);
        try {
            const updated = await ForumApiService.updatePost(targetId, nextText, currentUserId);
            const reconciled =
                updated.content.trim() === nextText
                    ? updated
                    : editPatch
                      ? { ...updated, ...editPatch }
                      : {
                            ...updated,
                            content: nextText,
                            isEdited: true,
                            updatedAt: new Date().toISOString(),
                        };
            updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? reconciled : p)));
            SmartToast.success('تم تحديث المنشور');
        } catch (err) {
            if (snapshot) {
                updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
            }
            const message = err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث المنشور';
            SmartToast.error(message);
        } finally {
            setSavingEdit(false);
        }
    }, [currentUserId, editingPostId, editingText, findPostById, updatePostList]);

    const handleReportPost = useCallback(
        async (postId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للإبلاغ');
                return;
            }
            await runInflight(`report:${postId}`, async () => {
                const reportRate = checkForumRateLimit('report', currentUserId, { postId });
                if (!reportRate.allowed) {
                    SmartToast.warning('لقد أبلغت عن هذا المنشور مسبقاً أو انتظر قليلاً');
                    return;
                }
                try {
                    const result = await ForumApiService.reportPost(postId, 'محتوى مخالف');
                    if (result.duplicate) {
                        SmartToast.info('لقد أبلغت عن هذا المنشور مسبقاً');
                        return;
                    }
                    if (result.ok) {
                        SmartToast.success('تم رفع البلاغ للإدارة');
                    } else {
                        SmartToast.error('تعذّر إرسال البلاغ');
                    }
                } catch {
                    SmartToast.error('تعذّر إرسال البلاغ');
                }
            });
        },
        [currentUserId, runInflight],
    );

    return {
        editingPostId,
        setEditingPostId,
        editingText,
        setEditingText,
        savingEdit,
        handleTogglePin,
        handleToggleBookmark,
        handleCopyPostText,
        handleSavePostToVault,
        handleSavePostToDevice,
        handleToggleLock,
        handleEditPost,
        handleSaveEdit,
        handleReportPost,
    };
}
