import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import {
    FollowDB,
    notifyFollowers,
    getUserPostCount,
    type CommunityPost,
    type CommunityComment,
    LawyerStorage,
    RepositoryDB,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { mergeCommunityPostsById, sortCommunityPosts } from '@/app/services/lawyer-cloud';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { checkForumRateLimit } from './CommunityScreen/forumRateLimit';
import { buildCommunityPostShareUrl, setCommunityPostHash } from './CommunityScreen/communityDeepLink';
import {
    persistCommunitySection,
    readPersistedCommunitySection,
    type CommunitySection,
} from './CommunityScreen/communitySectionState';
import { cacheForumAttachmentFile } from '@/app/services/forumAttachmentService';
import { buildForumEditPatch } from '@/app/services/forum/forumEditUtils';
import { repositoryDocMatchesTag, communityTagMatchesFilter, resolveCommunityPostTags, resolveRepositoryDocTags, repositoryDocMatchesSearch, formatRepositoryTag } from './CommunityScreen/repositoryTagUtils';
import type { RepositorySortKey } from './CommunityScreen/repositoryListFilters';
import { getRepositoryMediaKind } from './CommunityScreen/components/repositoryMedia';
import { applyAutoRedaction } from './CommunityScreen/utils';
import { useMutedUsers } from './CommunityScreen/useMutedUsers';
import { CommentBottomSheet } from './CommunityScreen/components/CommentBottomSheet';
import { LegalRepository } from './CommunityScreen/components/LegalRepository';
import { ForumAppBar } from './CommunityScreen/components/ForumAppBar';
import { FORUM_FILTER_LABELS } from './CommunityScreen/forumFilters';
import { ForumPostList } from './CommunityScreen/components/ForumPostList';
import { EditPostModal } from './CommunityScreen/components/EditPostModal';
import { SearchOverlay } from './CommunityScreen/components/SearchOverlay';
import { AddQuestionSheet } from './CommunityScreen/components/AddQuestionSheet';
import { FullscreenImageOverlay } from './CommunityScreen/components/FullscreenImageOverlay';
import { ForumDeleteConfirmModal } from './CommunityScreen/components/ForumDeleteConfirmModal';
import {
    canDeletePost,
    canEditPost,
    canPinPost,
    canUpvotePost,
    canDeleteComment,
    canEditComment,
} from './CommunityScreen/communityPermissions';

/** تصنيفات الفلترة — خارج المكوّن لتفادي إعادة الإنشاء عند كل render */
const FILTER_LABELS = FORUM_FILTER_LABELS;

/** السقف الأعلى لـ userStatsCache (LRU). يَحُد ذاكرة الجلسات الطويلة */
const USER_STATS_CACHE_LIMIT = 500;

/** الحد الأعلى لمرفقات المنشور (25MB — يطابق التخزين) */
const FORUM_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
/** نص افتراضي لمنشور صوتي فقط (يجب ≥10 أحرف لتحقق السيرفر) */
const VOICE_POST_DEFAULT_CONTENT = 'استشارة صوتية — استمع للمقطع المرفق.';
/** أقصى مدة للتسجيل الصوتي (3 دقائق) */
const VOICE_RECORD_MAX_SEC = 180;

// --- MAIN SCREEN ---
export const CommunityScreen = ({
    onBack,
    initialPostId = null,
    initialOpenComments = false,
}: {
    onBack?: () => void;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
}) => {
    const FORUM_DEV_OPEN = import.meta.env.DEV && import.meta.env.VITE_COMMUNITY_DEV_OPEN === 'true';
    const { user: authUser, isLoading: authIsLoading, hasRole } = useAuth();
    const currentUserId = authUser?.id ?? null;
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [repositoryDocs, setRepositoryDocs] = useState<RepositoryDocument[]>([]);
    const [repositorySearchTerm, setRepositorySearchTerm] = useState('');
    const [repositorySortBy, setRepositorySortBy] = useState<RepositorySortKey>('newest');
    const [repositorySelectedType, setRepositorySelectedType] = useState('الكل');
    const [repositorySelectedTag, setRepositorySelectedTag] = useState<string | null>(null);
    const [isBanned, setIsBanned] = useState(false);
    const [activeSection, setActiveSectionState] = useState<CommunitySection>(() => readPersistedCommunitySection());
    const postsBootstrappedRef = useRef(false);
    const hadAuthenticatedUserRef = useRef(false);
    if (authUser) hadAuthenticatedUserRef.current = true;

    const setActiveSection = useCallback((section: CommunitySection) => {
        setActiveSectionState(section);
        persistCommunitySection(section);
    }, []);
    const isAdmin = hasRole('admin');
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [userStats, setUserStats] = useState<Record<string, { followerCount: number; postCount: number }>>({});
    const userStatsCache = useRef<Record<string, { followerCount: number; postCount: number }>>({});
    // Bookmarks (server-backed) + Muted users (local-only)
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    const { mutedIds, isMuted, toggleMute } = useMutedUsers(currentUserId);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterHasPdf, setFilterHasPdf] = useState(false);
    const [filterHasImage, setFilterHasImage] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [commentingPostId, setCommentingPostId] = useState<string | null>(null);

    const [newPostText, setNewPostText] = useState('');
    const [newTagText, setNewTagText] = useState('');
    const [newIsAnonymous, setNewIsAnonymous] = useState(false);
    const [newIsUrgent, setNewIsUrgent] = useState(false);
    const [newAttachment, setNewAttachment] = useState<CommunityPost['attachment']>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [submittingPost, setSubmittingPost] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
    const [deletingPost, setDeletingPost] = useState(false);
    const deepLinkHandledRef = useRef(false);
    const postsRef = useRef(posts);
    postsRef.current = posts;

    // تنظيف blob URL المتبقي عند فك تركيب المكوّن (يلتقط حالة الإغلاق المفاجئ)
    const newAttachmentRef = useRef(newAttachment);
    newAttachmentRef.current = newAttachment;
    useEffect(() => {
        return () => {
            const att = newAttachmentRef.current;
            if (att?.url && att.url.startsWith('blob:')) {
                try { URL.revokeObjectURL(att.url); } catch { /* ignore */ }
            }
        };
    }, []);

    useEffect(() => {
        if (authIsLoading) return;
        if (postsBootstrappedRef.current) return;
        let cancelled = false;
        (async () => {
            setLoadingPosts(true);
            try {
                const { posts: page } = await ForumApiService.listPostsPaginated(PAGE_SIZE, 0);
                if (cancelled) return;
                postsBootstrappedRef.current = true;
                setPosts((prev) =>
                    sortCommunityPosts(
                        mergeCommunityPostsById(
                            prev,
                            page.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) })),
                        ),
                    ),
                );
                setHasMore(page.length === PAGE_SIZE);
            } catch {
                if (!cancelled) {
                    SmartToast.error('تعذّر جلب منشورات المنتدى');
                }
            } finally {
                if (!cancelled) setLoadingPosts(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authIsLoading]);

    const refreshPosts = useCallback(async (silent = false) => {
        try {
            // مسار موحّد مع التحميل الأول: ForumApiService (لا KV قديم)
            // وإلا فإن البولينج كل 90s يرى صورة منفصلة عن مزامنة الخادم
            const limit = Math.max(PAGE_SIZE, postsRef.current.length || PAGE_SIZE);
            const { posts: page } = await ForumApiService.listPostsPaginated(limit, 0);
            setPosts((prev) =>
                sortCommunityPosts(
                    mergeCommunityPostsById(
                        prev,
                        page.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) })),
                    ),
                ),
            );
            setHasMore(page.length >= limit);
        } catch {
            if (!silent) SmartToast.error('تعذّر تحديث المنشورات');
        }
    }, []);

    useEffect(() => {
        if (authIsLoading || activeSection !== 'forum') return;
        const interval = window.setInterval(() => {
            void refreshPosts(true);
        }, 90_000);
        return () => window.clearInterval(interval);
    }, [authIsLoading, activeSection, refreshPosts]);

    useEffect(() => {
        if (!initialPostId || loadingPosts || deepLinkHandledRef.current) return;
        let cancelled = false;
        (async () => {
            let target = postsRef.current.find((p) => p.id === initialPostId) ?? null;
            if (!target) {
                target = await ForumApiService.getPostById(initialPostId);
                if (target && !cancelled) {
                    const resolved = { ...target, tags: resolveCommunityPostTags(target.content, target.tags) };
                    setPosts((prev) => (prev.some((p) => p.id === resolved.id) ? prev : [resolved, ...prev]));
                }
            }
            if (cancelled || !target) return;
            setActiveSection('forum');
            if (initialOpenComments) {
                setCommentingPostId(initialPostId);
            }
            deepLinkHandledRef.current = true;
            requestAnimationFrame(() => {
                document.getElementById(`forum-post-${initialPostId}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [initialPostId, initialOpenComments, loadingPosts, setActiveSection]);

    const loadUserStats = useCallback(async (userIds: string[]) => {
        const uniqueIds = [...new Set(userIds.filter(Boolean))];
        const uncached = uniqueIds.filter((id) => !userStatsCache.current[id]);
        if (uncached.length === 0) return;
        const results = await Promise.allSettled(
            uncached.map(async (id) => {
                const [followerCount, postCount] = await Promise.all([
                    FollowDB.getFollowerCount(id),
                    getUserPostCount(id),
                ]);
                userStatsCache.current[id] = { followerCount, postCount };
            }),
        );
        results.forEach((r) => { if (r.status === 'rejected') { /* silent */ } });

        // LRU cap: عند تجاوز السقف، نُسقط أقدم المداخل من الكاش
        const cacheKeys = Object.keys(userStatsCache.current);
        if (cacheKeys.length > USER_STATS_CACHE_LIMIT) {
            const excess = cacheKeys.length - USER_STATS_CACHE_LIMIT;
            // نحتفظ بإحصاءات المستخدمين الظاهرين حالياً
            const visibleIds = new Set(uniqueIds);
            const droppable = cacheKeys.filter((k) => !visibleIds.has(k)).slice(0, excess);
            for (const k of droppable) delete userStatsCache.current[k];
        }
        setUserStats({ ...userStatsCache.current });
    }, []);

    useEffect(() => {
        if (!currentUserId) { setIsBanned(false); return; }
        ForumApiService.isUserBanned(currentUserId)
            .then((banned) => setIsBanned(banned))
            .catch(() => setIsBanned(false));
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) { setFollowingIds(new Set()); return; }
        FollowDB.getFollowing(currentUserId).then((records) => {
            setFollowingIds(new Set(records.map((r) => r.followingId)));
        }).catch(() => {});
    }, [currentUserId]);

    // تحميل قائمة المنشورات المحفوظة (Bookmarks) للمستخدم الحالي
    useEffect(() => {
        if (!currentUserId) {
            setBookmarkedIds(new Set());
            return;
        }
        let cancelled = false;
        void ForumApiService.listBookmarks(currentUserId).then((ids) => {
            if (!cancelled) setBookmarkedIds(new Set(ids));
        });
        return () => { cancelled = true; };
    }, [currentUserId]);

    useEffect(() => {
        const authorIds = posts.map((p) => p.authorId).filter(Boolean);
        const commentIds = posts.flatMap((p) => p.comments.map((c) => c.authorId).filter(Boolean));
        loadUserStats([...authorIds, ...commentIds]);
    }, [posts, loadUserStats]);

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const { posts: nextPage } = await ForumApiService.listPostsPaginated(PAGE_SIZE, posts.length);
            setPosts((prev) => [
                ...prev,
                ...nextPage.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) })),
            ]);
            setHasMore(nextPage.length === PAGE_SIZE);
        } catch {
            SmartToast.error('تعذّر جلب المزيد من المنشورات');
        } finally {
            setLoadingMore(false);
        }
    };

    const removeAttachment = useCallback(() => {
        setNewAttachment((prev) => {
            // إلغاء blob URL لمنع تسريب الذاكرة في وضع التطوير (URL.createObjectURL)
            if (prev?.url && prev.url.startsWith('blob:')) {
                try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
            }
            return null;
        });
    }, []);

    useEffect(() => {
        return () => {
            if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
            if (mediaRecorderRef.current?.state !== 'inactive') {
                try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
            }
            voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (isAddQuestionOpen || !isRecordingVoice) return;
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try { rec.stop(); } catch { /* ignore */ }
        }
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
        }
        setIsRecordingVoice(false);
    }, [isAddQuestionOpen, isRecordingVoice]);

    const filters = FILTER_LABELS;
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);

    const activePostForComments = useMemo(() => {
        if (!commentingPostId) return null;
        return posts.find((p) => p.id === commentingPostId) || null;
    }, [posts, commentingPostId]);

    const allTags = useMemo(() => {
        return Array.from(new Set(posts.flatMap((p) => p.tags || [])));
    }, [posts]);

    useEffect(() => {
        if (!isSearchOpen) return;
        let cancelled = false;
        void RepositoryDB.listDocuments().then((docs) => {
            if (!cancelled) {
                setRepositoryDocs(
                    docs.map((doc) => ({
                        ...doc,
                        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
                    })),
                );
            }
        });
        return () => { cancelled = true; };
    }, [isSearchOpen]);

    const allSearchTags = useMemo(() => {
        const fromRepo = repositoryDocs.flatMap((d) => d.tags ?? []);
        return Array.from(new Set([...allTags, ...fromRepo])).slice(0, 40);
    }, [allTags, repositoryDocs]);

    const visiblePosts = useMemo(() => {
        // تطبيق فلتر الكتم: استبعاد منشورات المستخدمين المكتومين (مع استثناء المنشور لمالكه)
        const baseList = posts.filter((p) => !mutedIds.has(p.authorId) || p.authorId === currentUserId);
        const list = baseList.slice();
        if (selectedFilterIndex === 1) {
            list.sort((a, b) => {
                const aUrg = a.isUrgent === true ? 1 : 0;
                const bUrg = b.isUrgent === true ? 1 : 0;
                if (aUrg !== bUrg) return bUrg - aUrg;
                return b.upvoterIds.length - a.upvoterIds.length || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
            return list;
        }
        if (selectedFilterIndex >= 2) {
            const topicLabel = filters[selectedFilterIndex];
            return list
                .filter((p) =>
                    communityTagMatchesFilter(resolveCommunityPostTags(p.content, p.tags), topicLabel),
                )
                .sort((a, b) => {
                    const aUrg = a.isUrgent === true ? 1 : 0;
                    const bUrg = b.isUrgent === true ? 1 : 0;
                    if (aUrg !== bUrg) return bUrg - aUrg;
                    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
                });
        }
        return list.sort((a, b) => {
            const aUrg = a.isUrgent === true ? 1 : 0;
            const bUrg = b.isUrgent === true ? 1 : 0;
            if (aUrg !== bUrg) return bUrg - aUrg;
            return Date.parse(b.createdAt) - Date.parse(a.createdAt);
        });
    }, [posts, selectedFilterIndex, filters, mutedIds, currentUserId]);

    // ⚡ لا نحسب نتائج البحث إلا عند فتح شاشة البحث فعلياً
    const filteredPosts = useMemo(() => {
        if (!isSearchOpen) return [];
        const q = searchQuery.trim().toLowerCase();
        return posts.filter((p) => {
            const matchesSearch =
                q === '' ||
                p.content.toLowerCase().includes(q) ||
                p.authorName.toLowerCase().includes(q) ||
                p.tags.some((t) => t.toLowerCase().includes(q));
            const matchesPdf = !filterHasPdf || (p.attachment?.type === 'document');
            const matchesImage = !filterHasImage || (p.attachment?.type === 'image');
            const matchesTag = communityTagMatchesFilter(
                resolveCommunityPostTags(p.content, p.tags),
                selectedTag,
            );
            return matchesSearch && matchesPdf && matchesImage && matchesTag;
        });
    }, [isSearchOpen, posts, searchQuery, filterHasPdf, filterHasImage, selectedTag]);

    const filteredRepositoryDocs = useMemo(() => {
        if (!isSearchOpen) return [];
        return repositoryDocs.filter((doc) => {
            const matchesSearch = repositoryDocMatchesSearch(doc, searchQuery);
            const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
            const matchesTag = repositoryDocMatchesTag(docTags, selectedTag);
            const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
            const matchesPdf = !filterHasPdf || mediaKind === 'pdf';
            const matchesImage = !filterHasImage || mediaKind === 'image';
            return matchesSearch && matchesTag && matchesPdf && matchesImage;
        });
    }, [isSearchOpen, repositoryDocs, searchQuery, selectedTag, filterHasPdf, filterHasImage]);

    const handleToggleUpvote = async (postId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للتصويت');
            return;
        }
        const target = posts.find((p) => p.id === postId);
        if (target && !canUpvotePost(target, currentUserId)) {
            SmartToast.warning('لا يمكنك التصويت على منشورك');
            return;
        }
        let nextPost: CommunityPost | null = null;
        let wasUpvote = false;
        let targetUserId = '';
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const has = p.upvoterIds.includes(currentUserId);
                const upvoterIds = has ? p.upvoterIds.filter((x) => x !== currentUserId) : [...p.upvoterIds, currentUserId];
                wasUpvote = !has;
                targetUserId = p.authorId;
                nextPost = { ...p, upvoterIds, updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        if (nextPost) {
            try {
                const saved = await ForumApiService.syncPost(nextPost);
                setPosts((prev) => prev.map((p) => (p.id === postId ? saved : p)));
            } catch {
                SmartToast.warning('تعذّر حفظ التصويت');
            }
        }
        if (wasUpvote && targetUserId && targetUserId !== currentUserId && authUser) {
            import('@/app/services/lawyer-cloud').then(({ NotificationDB }) => {
                NotificationDB.addNotification({
                    id: crypto.randomUUID(),
                    userId: targetUserId,
                    type: 'upvote',
                    title: 'إعجاب بمنشورك',
                    message: `أعجب ${authUser?.user_metadata?.fullName || 'أحد المستخدمين'} بمنشورك`,
                    postId,
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }).catch(() => {});
        }
    };

    const handleAddComment = async (postId: string, content: string, parentId?: string): Promise<boolean> => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للتعليق');
            return false;
        }
        if (isBanned) {
            SmartToast.warning('حسابك محظور من التعليق في المنتدى');
            return false;
        }
        const rate = checkForumRateLimit('comment', currentUserId);
        if ('retryAfterSec' in rate) {
            SmartToast.warning(`انتظر ${rate.retryAfterSec} ثانية قبل تعليق جديد`);
            return false;
        }
        const commentId =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const newComment: CommunityComment = {
            id: commentId,
            postId,
            authorId: currentUserId,
            authorName: authUser?.user_metadata?.fullName || authUser?.email || 'محامي',
            content,
            createdAt: new Date().toISOString(),
            parentId,
        };
        let nextPost: CommunityPost | null = null;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                nextPost = { ...p, comments: [...p.comments, newComment], updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        try {
            const saved = await ForumApiService.addComment(postId, newComment);
            setPosts((prev) => prev.map((p) => (p.id === postId ? saved : p)));
            SmartToast.success('تم نشر التعليق');
            return true;
        } catch {
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== postId) return p;
                    return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
                }),
            );
            SmartToast.error('تعذّر نشر التعليق');
            return false;
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        const comment = post?.comments.find((c) => c.id === commentId);
        if (!post || !comment || !canDeleteComment(post, comment, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك حذف هذا التعليق');
            return;
        }
        const snapshot = posts.find((p) => p.id === postId);
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const c = p.comments.find((x) => x.id === commentId);
                if (!c || !canDeleteComment(p, c, currentUserId, isAdmin)) return p;
                return {
                    ...p,
                    comments: p.comments.filter((c) => c.id !== commentId && c.parentId !== commentId),
                    updatedAt: new Date().toISOString(),
                };
            }),
        );
        try {
            const saved = await ForumApiService.deleteComment(postId, commentId, isAdmin);
            setPosts((prev) => prev.map((p) => (p.id === postId ? saved : p)));
            SmartToast.success('تم حذف التعليق');
        } catch {
            if (snapshot) {
                setPosts((prev) => prev.map((p) => (p.id === postId ? snapshot : p)));
            }
            SmartToast.error('تعذّر حذف التعليق');
        }
    };

    const handleEditComment = async (postId: string, commentId: string, newContent: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        const comment = post?.comments.find((c) => c.id === commentId);
        // تمرير post ليتم احترام قفل «أفضل إجابة» في الواجهة (وليس فقط على السيرفر)
        if (!comment || !post || !canEditComment(comment, currentUserId, post)) {
            const lockedBest = post && post.bestCommentId === commentId;
            SmartToast.warning(
                lockedBest
                    ? 'لا يمكن تعديل تعليق مميّز كأفضل إجابة'
                    : 'لا يمكنك تعديل هذا التعليق',
            );
            return;
        }
        let nextPost: CommunityPost | null = null;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const c = p.comments.find((x) => x.id === commentId);
                if (!c || !canEditComment(c, currentUserId, p)) return p;
                nextPost = {
                    ...p,
                    comments: p.comments.map((c) => (c.id === commentId ? { ...c, content: newContent } : c)),
                    updatedAt: new Date().toISOString(),
                };
                return nextPost;
            }),
        );
        try {
            const saved = await ForumApiService.editComment(postId, commentId, newContent);
            setPosts((prev) => prev.map((p) => (p.id === postId ? saved : p)));
            SmartToast.success('تم تعديل التعليق');
        } catch {
            if (post) {
                setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
            }
            SmartToast.error('تعذّر تعديل التعليق');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        if (!post || !canDeletePost(post, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك حذف هذا المنشور');
            return;
        }
        const snapshot = posts;
        setDeletingPost(true);
        try {
            await ForumApiService.deletePost(
                postId,
                post.author_id ?? post.authorId,
                isAdmin,
                currentUserId,
            );
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            SmartToast.success('تم حذف المنشور');
        } catch (err) {
            setPosts(snapshot);
            const message =
                err instanceof Error && err.message.trim() ? err.message : 'تعذّر حذف المنشور';
            SmartToast.error(message);
        } finally {
            setDeletingPost(false);
        }
    };

    const requestDeletePost = (postId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        if (!post || !canDeletePost(post, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك حذف هذا المنشور');
            return;
        }
        setPendingDeletePostId(postId);
    };

    const confirmDeletePost = async () => {
        if (!pendingDeletePostId) return;
        const postId = pendingDeletePostId;
        setPendingDeletePostId(null);
        await handleDeletePost(postId);
    };

    const pendingDeletePost = pendingDeletePostId
        ? posts.find((p) => p.id === pendingDeletePostId) ?? null
        : null;

    const handleToggleBestAnswer = async (postId: string, commentId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        if (post.authorId !== currentUserId) {
            SmartToast.warning('فقط صاحب المنشور يمكنه تمييز أفضل إجابة');
            return;
        }
        const nextBest = (post.bestCommentId ?? null) === commentId ? null : commentId;
        let nextPost: CommunityPost | null = null;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                nextPost = { ...p, bestCommentId: nextBest, updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        if (nextPost) {
            try {
                const saved = await ForumApiService.syncPost(nextPost);
                setPosts((prev) => prev.map((p) => (p.id === postId ? saved : p)));
            } catch {
                SmartToast.error('تعذّر تحديث أفضل إجابة');
            }
        }

        if (nextBest && post.authorId !== currentUserId) {
            const bestComment = post.comments.find((c) => c.id === commentId);
            if (bestComment) {
                import('@/app/services/lawyer-cloud').then(({ NotificationDB }) => {
                    NotificationDB.addNotification({
                        id: crypto.randomUUID(),
                        userId: bestComment.authorId,
                        type: 'best_answer',
                        title: 'تم تمييز إجابتك كأفضل إجابة',
                        message: `اختار ${post.authorName} إجابتك كأفضل إجابة على منشور "${post.content.slice(0, 50)}..."`,
                        postId,
                        read: false,
                        createdAt: new Date().toISOString(),
                    });
                }).catch(() => {});
            }
        }
    };

    const attachForumFileLocally = useCallback(async (file: File, kind: 'image' | 'document' | 'audio') => {
        const fallbackMime =
            kind === 'image' ? 'image/jpeg' : kind === 'audio' ? 'audio/webm' : 'application/octet-stream';
        const cached = await cacheForumAttachmentFile(file);
        setNewAttachment((prev) => {
            if (prev?.url?.startsWith('blob:')) {
                try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
            }
            return {
                type: kind,
                url: cached.url,
                name: file.name,
                mimeType: file.type || fallbackMime,
                storagePath: cached.storagePath,
            };
        });
    }, []);

    const handleUploadAttachment = useCallback(async (file: File, kind: 'image' | 'document' | 'audio') => {
        if (file.size > FORUM_ATTACHMENT_MAX_BYTES) {
            SmartToast.warning('حجم الملف كبير جداً (الحد 25MB)');
            return;
        }
        if (
            kind === 'image' &&
            !file.type.startsWith('image/') &&
            !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
        ) {
            SmartToast.warning('يرجى اختيار صورة صالحة');
            return;
        }
        if (
            kind === 'audio' &&
            !file.type.startsWith('audio/') &&
            !/\.(webm|ogg|mp3|m4a|wav)$/i.test(file.name)
        ) {
            SmartToast.warning('يرجى تسجيل مقطع صوتي صالح');
            return;
        }

        const userId = currentUserId ?? readPersistedSupabaseAuth().user?.id ?? null;

        // بدون جلسة: إرفاق محلي فقط (كافٍ للمعاينة والنشر المحلي)
        if (!userId) {
            await attachForumFileLocally(file, kind);
            SmartToast.success(kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف');
            return;
        }

        setUploadingAttachment(true);
        try {
            const storageCategory = kind === 'audio' ? 'audio' : 'drafts';
            const uploaded = await LawyerStorage.uploadSmartFile(userId, file, storageCategory);
            if (!uploaded?.downloadUrl) {
                throw new Error('missing download url');
            }
            setNewAttachment((prev) => {
                if (prev?.url?.startsWith('blob:')) {
                    try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
                }
                return {
                    type: kind,
                    url: uploaded.downloadUrl,
                    name: file.name,
                    mimeType: file.type,
                    storagePath: uploaded.path ?? uploaded.fullPath,
                };
            });
            SmartToast.success(kind === 'audio' ? 'تم إرفاق المقطع الصوتي' : 'تم إرفاق الملف');
        } catch {
            // Supabase/RLS/JWT غالباً يفشل في التطوير — نُبقي تجربة الإرفاق تعمل محلياً
            await attachForumFileLocally(file, kind);
            SmartToast.success(
                import.meta.env.DEV
                    ? kind === 'audio'
                        ? 'تم إرفاق المقطع الصوتي (معاينة محلية)'
                        : 'تم إرفاق الملف (معاينة محلية)'
                    : kind === 'audio'
                      ? 'تم إرفاق المقطع الصوتي على هذا الجهاز'
                      : 'تم إرفاق الملف على هذا الجهاز',
            );
        } finally {
            setUploadingAttachment(false);
        }
    }, [attachForumFileLocally, currentUserId]);

    const stopVoiceRecording = useCallback(() => {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try { rec.stop(); } catch { /* ignore */ }
        }
        if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
        }
        setIsRecordingVoice(false);
    }, []);

    const toggleVoiceRecording = useCallback(async () => {
        if (uploadingAttachment) return;

        if (isRecordingVoice) {
            stopVoiceRecording();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceStreamRef.current = stream;
            voiceChunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) voiceChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                voiceStreamRef.current = null;

                const blob = new Blob(voiceChunksRef.current, { type: mimeType });
                if (blob.size === 0) {
                    SmartToast.warning('لم يُسجَّل أي صوت');
                    return;
                }
                const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
                const fileName = `forum-voice-${Date.now()}.${ext}`;
                const file = new File([blob], fileName, { type: mimeType.split(';')[0] ?? 'audio/webm' });
                await handleUploadAttachment(file, 'audio');
            };

            recorder.onerror = () => {
                SmartToast.error('تعذّر التسجيل الصوتي');
                stopVoiceRecording();
            };

            recorder.start(250);
            setIsRecordingVoice(true);
            setVoiceRecordingSec(0);
            voiceTimerRef.current = setInterval(() => {
                setVoiceRecordingSec((prev) => {
                    const next = prev + 1;
                    if (next >= VOICE_RECORD_MAX_SEC) {
                        const activeRec = mediaRecorderRef.current;
                        if (activeRec && activeRec.state !== 'inactive') {
                            try { activeRec.stop(); } catch { /* ignore */ }
                        }
                        if (voiceTimerRef.current) {
                            clearInterval(voiceTimerRef.current);
                            voiceTimerRef.current = null;
                        }
                        setIsRecordingVoice(false);
                        SmartToast.info('تم الوصول للحد الأقصى للتسجيل (3 دقائق)');
                    }
                    return next;
                });
            }, 1000);
        } catch {
            SmartToast.warning('لم نتمكن من الوصول إلى المايكروفون. تأكد من الإذن.');
        }
    }, [handleUploadAttachment, isRecordingVoice, stopVoiceRecording, uploadingAttachment]);

    const handleAddPost = async () => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للنشر');
            return;
        }
        if (isBanned) {
            SmartToast.warning('حسابك محظور من النشر في المنتدى');
            return;
        }
        const hasVoiceAttachment = newAttachment?.type === 'audio';
        const rawContent = newPostText.trim();
        const contentForPublish =
            rawContent.length >= 10
                ? rawContent
                : hasVoiceAttachment
                  ? VOICE_POST_DEFAULT_CONTENT
                  : '';
        if (contentForPublish.length < 10) {
            SmartToast.warning('اكتب تفاصيل أوضح (10 أحرف على الأقل) أو سجّل مقطعاً صوتياً');
            return;
        }
        setSubmittingPost(true);
        let finalContent = contentForPublish;
        const redaction = applyAutoRedaction(contentForPublish);
        finalContent = redaction.redacted.trim();
        if (redaction.changed) {
            SmartToast.show('درع الخصوصية فعّال', {
                type: 'info',
                description: 'تم تنقيح البيانات حفاظاً على سرية الموكل.',
                duration: 3500,
            });
        }
        if (!finalContent) {
            SmartToast.warning('لا يمكن نشر محتوى فارغ');
            setSubmittingPost(false);
            return;
        }
        const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const manualTags = newTagText
            .split(/[,|\s]+/g)
            .map((x) => x.trim())
            .filter(Boolean)
            .map((x) => formatRepositoryTag(x))
            .filter(Boolean);
        const tags = resolveCommunityPostTags(contentForPublish, manualTags);
        const now = new Date().toISOString();
        const post: CommunityPost = {
            id,
            authorId: currentUserId!,
            authorName: authUser?.user_metadata?.fullName || authUser?.email || 'محامي',
            content: finalContent,
            tags,
            createdAt: now,
            updatedAt: now,
            attachment: newAttachment,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
            isAnonymous: newIsAnonymous || undefined,
            isUrgent: newIsUrgent || undefined,
        };
        setIsAddQuestionOpen(false);
        setNewPostText('');
        setNewTagText('');
        setNewIsAnonymous(false);
        setNewIsUrgent(false);
        removeAttachment(); // يُلغي blob URL إن وُجد
        try {
            const saved = await ForumApiService.createPost(post);
            setPosts((prev) => [
                { ...saved, tags: resolveCommunityPostTags(saved.content, saved.tags) },
                ...prev,
            ]);
            SmartToast.success('تم نشر الاستشارة');
            if (currentUserId) {
                notifyFollowers(currentUserId, 'new_post', 'منشور جديد من متابَع', `نشر ${post.authorName} استشارة جديدة`, saved.id);
            }
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر نشر الاستشارة';
            SmartToast.error(message);
        } finally {
            setSubmittingPost(false);
        }
    };

    const handleEditPost = (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post || !canEditPost(post, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك تعديل هذا المنشور');
            return;
        }
        setEditingPostId(postId);
        setEditingText(post.content);
    };

    const handleSaveEdit = async () => {
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
        const snapshot = posts.find((p) => p.id === targetId);
        const editPatch = snapshot ? buildForumEditPatch(snapshot, nextText) : null;
        // تحديث متفائل: المستخدم يرى الإصدار المُعدَّل فوراً مع علامة «معدّل»
        setPosts((prev) =>
            prev.map((p) =>
                p.id === targetId && editPatch
                    ? { ...p, ...editPatch }
                    : p,
            ),
        );
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
            setPosts((prev) => prev.map((p) => (p.id === targetId ? reconciled : p)));
            SmartToast.success('تم تحديث المنشور');
            setEditingPostId(null);
            setEditingText('');
        } catch (err) {
            // التراجع عن التحديث المتفائل عند الفشل
            if (snapshot) {
                setPosts((prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
            }
            const message = err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث المنشور';
            SmartToast.error(message);
        } finally {
            setSavingEdit(false);
        }
    };

    const handleReportPost = async (postId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للإبلاغ');
            return;
        }
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
    };

    const handleSharePost = async (postId: string) => {
        const url = buildCommunityPostShareUrl(postId);
        setCommunityPostHash(postId);
        try {
            await navigator.clipboard.writeText(url);
            SmartToast.success('تم نسخ الرابط');
        } catch {
            SmartToast.warning('تعذّر نسخ الرابط');
        }
    };

    const handleTogglePin = async (postId: string) => {
        if (!canPinPost(isAdmin)) {
            SmartToast.warning('التثبيت متاح للإدارة فقط');
            return;
        }
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const nextPinned = !post.isPinned;
        try {
            const updated = await ForumApiService.togglePin(postId, nextPinned);
            setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
            SmartToast.success(nextPinned ? 'تم تثبيت المنشور' : 'تم إلغاء تثبيت المنشور');
        } catch {
            SmartToast.error('تعذّر تحديث حالة التثبيت');
        }
    };

    const handleToggleBookmark = async (postId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول لحفظ المنشور');
            return;
        }
        const wasBookmarked = bookmarkedIds.has(postId);
        // تحديث متفائل
        setBookmarkedIds((prev) => {
            const next = new Set(prev);
            if (wasBookmarked) next.delete(postId);
            else next.add(postId);
            return next;
        });
        try {
            const bookmarked = await ForumApiService.toggleBookmark(postId, currentUserId);
            setBookmarkedIds((prev) => {
                const next = new Set(prev);
                if (bookmarked) next.add(postId);
                else next.delete(postId);
                return next;
            });
            SmartToast.success(bookmarked ? 'تم حفظ المنشور' : 'تم إلغاء الحفظ');
        } catch {
            // التراجع
            setBookmarkedIds((prev) => {
                const next = new Set(prev);
                if (wasBookmarked) next.add(postId);
                else next.delete(postId);
                return next;
            });
            SmartToast.error('تعذّر تحديث حالة الحفظ');
        }
    };

    const handleToggleCommentUpvote = async (commentId: string) => {
        if (!currentUserId || !commentingPostId) return;
        // تحديث متفائل: نُبدّل عضوية المستخدم في upvoterIds للتعليق
        let didOptimisticUpdate = false;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== commentingPostId) return p;
                return {
                    ...p,
                    comments: p.comments.map((c) => {
                        if (c.id !== commentId) return c;
                        const set = new Set(c.upvoterIds ?? []);
                        if (set.has(currentUserId)) set.delete(currentUserId);
                        else set.add(currentUserId);
                        didOptimisticUpdate = true;
                        return { ...c, upvoterIds: [...set] };
                    }),
                };
            }),
        );
        try {
            const { upvoterIds } = await ForumApiService.toggleCommentUpvote(commentId);
            // مطابقة الحالة من السيرفر (مصدر الحقيقة)
            setPosts((prev) =>
                prev.map((p) => {
                    if (p.id !== commentingPostId) return p;
                    return {
                        ...p,
                        comments: p.comments.map((c) =>
                            c.id === commentId ? { ...c, upvoterIds } : c,
                        ),
                    };
                }),
            );
        } catch {
            if (didOptimisticUpdate) {
                // تراجع — نعكس العملية
                setPosts((prev) =>
                    prev.map((p) => {
                        if (p.id !== commentingPostId) return p;
                        return {
                            ...p,
                            comments: p.comments.map((c) => {
                                if (c.id !== commentId) return c;
                                const set = new Set(c.upvoterIds ?? []);
                                if (set.has(currentUserId)) set.delete(currentUserId);
                                else set.add(currentUserId);
                                return { ...c, upvoterIds: [...set] };
                            }),
                        };
                    }),
                );
            }
            SmartToast.warning('تعذّر تسجيل الإعجاب');
        }
    };

    const handleToggleLock = async (postId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        if (post.authorId !== currentUserId && !isAdmin) {
            SmartToast.warning('قفل النقاش متاح لصاحب المنشور أو الإدارة');
            return;
        }
        const nextLocked = !post.isLocked;
        const snapshot = post.isLocked;
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, isLocked: nextLocked || undefined, updatedAt: new Date().toISOString() }
                    : p,
            ),
        );
        try {
            const updated = await ForumApiService.toggleLockDiscussion(
                postId,
                nextLocked,
                currentUserId,
                isAdmin,
                post.author_id ?? post.authorId,
            );
            setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
            SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
        } catch (err) {
            setPosts((prev) =>
                prev.map((p) =>
                    p.id === postId ? { ...p, isLocked: snapshot || undefined } : p,
                ),
            );
            const message =
                err instanceof Error && err.message.trim() ? err.message : 'تعذّر تحديث حالة القفل';
            SmartToast.error(message);
        }
    };

    const handleReportComment = async (commentId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للإبلاغ');
            return;
        }
        try {
            const r = await ForumApiService.reportComment(commentId, 'محتوى مخالف');
            if (r.duplicate) SmartToast.info('أبلغت عن هذا التعليق مسبقاً');
            else if (r.ok) SmartToast.success('تم رفع البلاغ');
            else SmartToast.error('تعذّر إرسال البلاغ');
        } catch {
            SmartToast.error('تعذّر إرسال البلاغ');
        }
    };

    const handleMuteUser = (targetUserId: string) => {
        if (!currentUserId || targetUserId === currentUserId) return;
        toggleMute(targetUserId);
        SmartToast.info(isMuted(targetUserId) ? 'تم إلغاء الكتم' : 'تم كتم المستخدم');
    };

    const handleFollow = async (targetUserId: string) => {
        if (!currentUserId || targetUserId === currentUserId) return;
        const isFollowed = followingIds.has(targetUserId);
        try {
            if (isFollowed) {
                await FollowDB.unfollow(currentUserId, targetUserId);
                setFollowingIds((prev) => { const n = new Set(prev); n.delete(targetUserId); return n; });
                SmartToast.success('تم إلغاء المتابعة');
            } else {
                await FollowDB.follow(currentUserId, targetUserId);
                setFollowingIds((prev) => { const n = new Set(prev); n.add(targetUserId); return n; });
                SmartToast.success('تمت المتابعة');
            }
        } catch {
            SmartToast.error('تعذّر تحديث حالة المتابعة');
        }
    };

    const handleNavigateToPost = useCallback((postId: string) => {
        setActiveSection('forum');
        window.setTimeout(() => {
            document.getElementById(`forum-post-${postId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 120);
    }, [setActiveSection]);

    const handleSearchOpenPost = useCallback((postId: string) => {
        setIsSearchOpen(false);
        handleNavigateToPost(postId);
    }, [handleNavigateToPost]);

    const handleSearchOpenDocument = useCallback((doc: RepositoryDocument) => {
        setActiveSection('repository');
        setRepositorySearchTerm(doc.title);
        setIsSearchOpen(false);
    }, [setActiveSection]);

    if (authIsLoading && !authUser && !FORUM_DEV_OPEN && !hadAuthenticatedUserRef.current) {
        return <div dir="rtl" className="w-full h-full bg-[#151822]" />;
    }
    if (!FORUM_DEV_OPEN && (!authUser || !hasRole('lawyer'))) {
        return (
            <div dir="rtl" className="w-full h-full bg-[#151822] flex items-center justify-center p-6 text-center">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 max-w-md w-full">
                    <div className="w-14 h-14 rounded-2xl bg-[#E6C673]/10 border border-[#E6C673]/20 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={22} className="text-[#E6C673]" />
                    </div>
                    <h2 className="text-white font-bold text-lg mb-1">هذا المنتدى مخصص للمحامين فقط</h2>
                    <p className="text-white/40 text-sm">يرجى تسجيل الدخول بحساب محامٍ للوصول.</p>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="w-full h-full bg-[#151822] flex flex-col relative overflow-hidden z-0">
            <ForumAppBar
                onBack={onBack}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onSearchOpen={() => setIsSearchOpen(true)}
                onNavigateToPost={handleNavigateToPost}
                userId={currentUserId}
                selectedFilterIndex={selectedFilterIndex}
                onFilterSelect={setSelectedFilterIndex}
                repositorySearchTerm={repositorySearchTerm}
                onRepositorySearchTermChange={setRepositorySearchTerm}
                repositorySortBy={repositorySortBy}
                onRepositorySortChange={setRepositorySortBy}
                repositorySelectedType={repositorySelectedType}
                onRepositoryTypeChange={setRepositorySelectedType}
                repositorySelectedTag={repositorySelectedTag}
                onRepositoryTagChange={setRepositorySelectedTag}
            />

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-36">
                <div className={activeSection === 'forum' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'forum'}>
                    <ForumPostList
                        loadingPosts={loadingPosts}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        visiblePosts={visiblePosts}
                        currentUserId={currentUserId}
                        onToggleUpvote={handleToggleUpvote}
                        onImageClick={(url) => setFullscreenImage(url)}
                        onCommentClick={(id) => setCommentingPostId(id)}
                        onDelete={requestDeletePost}
                        onEdit={handleEditPost}
                        onReport={handleReportPost}
                        onShare={handleSharePost}
                        onLoadMore={handleLoadMore}
                        isAdmin={isAdmin}
                        onTogglePin={handleTogglePin}
                        onFollow={handleFollow}
                        followingIds={followingIds}
                        bookmarkedIds={bookmarkedIds}
                        onToggleBookmark={handleToggleBookmark}
                        onToggleLock={handleToggleLock}
                        onMuteUser={handleMuteUser}
                        userStats={userStats}
                    />
                </div>
                <div className={activeSection === 'repository' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'repository'}>
                    <LegalRepository
                        searchTerm={repositorySearchTerm}
                        selectedType={repositorySelectedType}
                        sortBy={repositorySortBy}
                        selectedTag={repositorySelectedTag}
                    />
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#151822] via-[#151822]/95 to-transparent pointer-events-none z-10" />

            {/* FAB — المنتدى فقط */}
            {activeSection === 'forum' ? (
                <div className="absolute bottom-6 left-6 z-20">
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentUserId) {
                                SmartToast.warning('سجّل الدخول أولاً');
                                return;
                            }
                            setIsAddQuestionOpen(true);
                        }}
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-xl shadow-black/30 transition-transform active:scale-95 ${
                            currentUserId
                                ? 'bg-[#E6C673] hover:bg-[#d4b560] text-black'
                                : 'bg-white/10 text-white/40 cursor-not-allowed'
                        }`}
                    >
                        <Plus size={20} />
                        <span>طرح استشارة للزملاء</span>
                    </button>
                </div>
            ) : null}

            <EditPostModal
                editingPostId={editingPostId}
                editingText={editingText}
                onTextChange={setEditingText}
                onSave={handleSaveEdit}
                onCancel={() => { setEditingPostId(null); setEditingText(''); }}
                savingEdit={savingEdit}
            />

            {/* =======================
                COMMENT BOTTOM SHEET 
               ======================= */}
            {activePostForComments && (
                <CommentBottomSheet
                    post={activePostForComments}
                    onClose={() => setCommentingPostId(null)}
                    onAddComment={handleAddComment}
                    currentUserId={currentUserId ?? ''}
                    onToggleBestAnswer={handleToggleBestAnswer}
                    onDeleteComment={handleDeleteComment}
                    onEditComment={handleEditComment}
                    onFollow={handleFollow}
                    followingIds={followingIds}
                    userStats={userStats}
                    isAdmin={isAdmin}
                    onToggleCommentUpvote={handleToggleCommentUpvote}
                    onReportComment={handleReportComment}
                    onMuteUser={handleMuteUser}
                    mutedUserIds={mutedIds}
                />
            )}

            <SearchOverlay
                isOpen={isSearchOpen}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filterHasPdf={filterHasPdf}
                onFilterHasPdfChange={setFilterHasPdf}
                filterHasImage={filterHasImage}
                onFilterHasImageChange={setFilterHasImage}
                selectedTag={selectedTag}
                onSelectedTagChange={setSelectedTag}
                allTags={allSearchTags}
                filteredPosts={filteredPosts}
                filteredDocuments={filteredRepositoryDocs}
                onClose={() => setIsSearchOpen(false)}
                onOpenPost={handleSearchOpenPost}
                onOpenDocument={handleSearchOpenDocument}
            />

            <AddQuestionSheet
                isOpen={isAddQuestionOpen}
                newPostText={newPostText}
                onNewPostTextChange={setNewPostText}
                newTagText={newTagText}
                onNewTagTextChange={setNewTagText}
                newIsAnonymous={newIsAnonymous}
                onNewIsAnonymousChange={(v) => setNewIsAnonymous(v)}
                newIsUrgent={newIsUrgent}
                onNewIsUrgentChange={(v) => setNewIsUrgent(v)}
                newAttachment={newAttachment}
                onRemoveAttachment={removeAttachment}
                submittingPost={submittingPost}
                uploadingAttachment={uploadingAttachment}
                isRecordingVoice={isRecordingVoice}
                voiceRecordingSec={voiceRecordingSec}
                imageInputRef={imageInputRef}
                docInputRef={docInputRef}
                onToggleVoiceRecording={() => void toggleVoiceRecording()}
                onImageUpload={(file) => handleUploadAttachment(file, 'image')}
                onDocUpload={(file) => handleUploadAttachment(file, 'document')}
                onSubmit={handleAddPost}
                onClose={() => setIsAddQuestionOpen(false)}
            />

            <FullscreenImageOverlay
                imageUrl={fullscreenImage}
                onClose={() => setFullscreenImage(null)}
            />

            <ForumDeleteConfirmModal
                open={pendingDeletePostId !== null}
                title="تأكيد حذف المنشور"
                message={
                    pendingDeletePost
                        ? `هل أنت متأكد من حذف هذه الاستشارة؟ لا يمكن التراجع عن الحذف.\n\n«${pendingDeletePost.content.slice(0, 80)}${pendingDeletePost.content.length > 80 ? '…' : ''}»`
                        : 'هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن الحذف.'
                }
                loading={deletingPost}
                onConfirm={() => void confirmDeletePost()}
                onCancel={() => {
                    if (!deletingPost) setPendingDeletePostId(null);
                }}
            />
        </div>
    );
};
