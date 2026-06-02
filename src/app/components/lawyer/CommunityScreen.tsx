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
} from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { checkForumRateLimit } from './CommunityScreen/forumRateLimit';
import { buildCommunityPostShareUrl, setCommunityPostHash } from './CommunityScreen/communityDeepLink';
import { hasOpenRouterKey, polishLegalTextAI, redactSensitiveDataAI, summarizeLegalFactsAI } from '@/app/services/ai-service';
import { useMutedUsers } from './CommunityScreen/useMutedUsers';

import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from './CommunityScreen/types';
import { applyAutoRedaction, normalizeTagLabel, deriveTagsFromContent } from './CommunityScreen/utils';
import { CommentBottomSheet } from './CommunityScreen/components/CommentBottomSheet';
import { LegalRepository } from './CommunityScreen/components/LegalRepository';
import { ForumAppBar } from './CommunityScreen/components/ForumAppBar';
import { FilterBar } from './CommunityScreen/components/FilterBar';
import { ForumPostList } from './CommunityScreen/components/ForumPostList';
import { EditPostModal } from './CommunityScreen/components/EditPostModal';
import { SearchOverlay } from './CommunityScreen/components/SearchOverlay';
import { AddQuestionSheet } from './CommunityScreen/components/AddQuestionSheet';
import { FullscreenImageOverlay } from './CommunityScreen/components/FullscreenImageOverlay';
import {
    canDeletePost,
    canEditPost,
    canPinPost,
    canUpvotePost,
    canDeleteComment,
    canEditComment,
} from './CommunityScreen/communityPermissions';

/** تصنيفات الفلترة الثابتة — خارج المكوّن لتفادي إعادة الإنشاء عند كل render */
const FILTER_LABELS = ['الأحدث', 'الأعلى تصويتاً', 'تنفيذ', 'مدني', 'جنائي', 'أحوال شخصية', 'شركات', 'عقاري'] as const;

/** السقف الأعلى لـ userStatsCache (LRU). يَحُد ذاكرة الجلسات الطويلة */
const USER_STATS_CACHE_LIMIT = 500;

/** الحد الأعلى لطول محتوى المنشور — يجب أن يطابق حدّ السيرفر */
const POST_MAX_LENGTH = 10_000;

// --- MAIN SCREEN ---
export const CommunityScreen = ({
    onBack,
    initialPostId = null,
    initialOpenComments = false,
    initialSection = 'forum',
}: {
    onBack?: () => void;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    initialSection?: 'forum' | 'repository';
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
    const [isBanned, setIsBanned] = useState(false);
    const [activeSection, setActiveSection] = useState<'forum' | 'repository'>(initialSection);

    useEffect(() => {
        setActiveSection(initialSection);
    }, [initialSection]);
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
    const [isDictating, setIsDictating] = useState(false);
    const speechRecRef = useRef<SpeechRecognitionInstance | null>(null);
    /** نص المستخدم المكتوب قبل بدء الإملاء — نُضيف الإملاء إليه بدل استبداله */
    const speechBaseTextRef = useRef<string>('');
    const [showPolishAction, setShowPolishAction] = useState(false);
    const [polishingText, setPolishingText] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [aiAnalysisByPostId, setAiAnalysisByPostId] = useState<Record<string, { loading: boolean; text: string | null }>>({});
    const aiRunIdByPostIdRef = useRef<Record<string, string>>({});

    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
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
        let cancelled = false;
        (async () => {
            setLoadingPosts(true);
            try {
                const { posts: page } = await ForumApiService.listPostsPaginated(PAGE_SIZE, 0);
                if (cancelled) return;
                setPosts(page);
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
            setPosts(page);
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
                    setPosts((prev) => (prev.some((p) => p.id === target!.id) ? prev : [target!, ...prev]));
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
    }, [initialPostId, initialOpenComments, loadingPosts]);

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
        void ForumApiService.listBookmarks().then((ids) => {
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
            setPosts((prev) => [...prev, ...nextPage]);
            setHasMore(nextPage.length === PAGE_SIZE);
        } catch {
            SmartToast.error('تعذّر جلب المزيد من المنشورات');
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        const w = window as unknown as {
            SpeechRecognition?: new () => SpeechRecognitionInstance;
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        };
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) return;
        const rec = new Ctor();
        rec.lang = 'ar-IQ';
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (event: SpeechRecognitionEvent) => {
            // تجميع نص الإملاء كاملاً (نهائي + مؤقت)
            let dictated = '';
            const len = event.results.length;
            for (let i = 0; i < len; i += 1) {
                const r = event.results[i];
                const t = r?.[0]?.transcript;
                if (typeof t === 'string') dictated += t;
            }
            const trimmedDictation = dictated.trim();
            if (!trimmedDictation) return;
            // إضافة الإملاء للنص الموجود مسبقاً (يحافظ على كتابة المستخدم اليدوية)
            const base = speechBaseTextRef.current;
            const next = base ? `${base.replace(/\s+$/, '')} ${trimmedDictation}` : trimmedDictation;
            setNewPostText(next.slice(0, POST_MAX_LENGTH));
            setShowPolishAction(true);
        };
        rec.onerror = () => {
            setIsDictating(false);
            SmartToast.error('تعذّر تشغيل الإملاء الصوتي');
        };
        rec.onend = () => {
            setIsDictating(false);
        };
        speechRecRef.current = rec;
        return () => {
            try {
                rec.stop();
            } catch {
                /* ignore */
            }
            speechRecRef.current = null;
        };
    }, []);

    const toggleDictation = () => {
        const rec = speechRecRef.current;
        if (!rec) {
            SmartToast.warning('الإملاء الصوتي غير مدعوم في هذا المتصفح');
            return;
        }
        if (isDictating) {
            try {
                rec.stop();
            } catch {
                /* ignore */
            }
            setIsDictating(false);
            return;
        }
        try {
            // التقاط النص الموجود قبل البدء كي لا يُمسح بالإملاء
            speechBaseTextRef.current = newPostText;
            rec.start();
            setIsDictating(true);
        } catch {
            SmartToast.error('تعذّر بدء التسجيل');
        }
    };

    const handlePolishLegalText = async () => {
        const draft = newPostText.trim();
        if (!draft) return;
        if (!hasOpenRouterKey()) {
            SmartToast.warning('مفتاح OpenRouter غير متوفر');
            return;
        }
        setPolishingText(true);
        try {
            const polished = await polishLegalTextAI(draft);
            setNewPostText(polished);
            setShowPolishAction(false);
            SmartToast.success('تمت الصياغة القانونية');
        } catch {
            SmartToast.error('تعذّرت الصياغة القانونية');
        } finally {
            setPolishingText(false);
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

    const filters = FILTER_LABELS;
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);

    const activePostForComments = useMemo(() => {
        if (!commentingPostId) return null;
        return posts.find((p) => p.id === commentingPostId) || null;
    }, [posts, commentingPostId]);

    const allTags = useMemo(() => {
        return Array.from(new Set(posts.flatMap((p) => p.tags || [])));
    }, [posts]);

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
            const wanted = `#${normalizeTagLabel(filters[selectedFilterIndex])}`;
            return list
                .filter((p) => p.tags.includes(wanted))
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
            const matchesTag = !selectedTag || p.tags.includes(selectedTag);
            return matchesSearch && matchesPdf && matchesImage && matchesTag;
        });
    }, [isSearchOpen, posts, searchQuery, filterHasPdf, filterHasImage, selectedTag]);

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
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        try {
            await ForumApiService.deletePost(postId, post.authorId, isAdmin);
            SmartToast.success('تم حذف المنشور');
        } catch {
            setPosts(snapshot);
            SmartToast.error('تعذّر حذف المنشور');
        }
    };

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

    const handleUploadAttachment = async (file: File, kind: 'image' | 'document') => {
        if (FORUM_DEV_OPEN && !authUser?.id) {
            // إلغاء blob URL سابق إن وُجد لمنع التسريب
            setNewAttachment((prev) => {
                if (prev?.url && prev.url.startsWith('blob:')) {
                    try { URL.revokeObjectURL(prev.url); } catch { /* ignore */ }
                }
                return {
                    type: kind,
                    url: URL.createObjectURL(file),
                    name: file.name,
                    mimeType: file.type,
                };
            });
            SmartToast.warning('في وضع التطوير: تم إرفاق الملف محلياً (بدون رفع سحابي)');
            return;
        }
        if (!authUser?.id) {
            SmartToast.warning('سجّل الدخول لإرفاق ملف');
            return;
        }
        setUploadingAttachment(true);
        try {
            const uploaded = await LawyerStorage.uploadSmartFile(authUser.id, file, 'drafts');
            if (!uploaded?.downloadUrl) {
                SmartToast.error('تعذّر إنشاء رابط للملف');
                return;
            }
            setNewAttachment({
                type: kind,
                url: uploaded.downloadUrl,
                name: file.name,
                mimeType: file.type,
                storagePath: uploaded.fullPath,
            });
            SmartToast.success('تم إرفاق الملف');
        } catch {
            SmartToast.error('فشل رفع الملف');
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleAddPost = async () => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للنشر');
            return;
        }
        if (isBanned) {
            SmartToast.warning('حسابك محظور من النشر في المنتدى');
            return;
        }
        const postRate = checkForumRateLimit('post', currentUserId);
        if ('retryAfterSec' in postRate) {
            SmartToast.warning(`انتظر ${postRate.retryAfterSec} ثانية قبل نشر جديد`);
            return;
        }
        const rawContent = newPostText.trim();
        if (rawContent.length < 10) {
            SmartToast.warning('اكتب تفاصيل أوضح (10 أحرف على الأقل)');
            return;
        }
        setSubmittingPost(true);
        let finalContent = rawContent;
        try {
            if (hasOpenRouterKey()) {
                finalContent = (await redactSensitiveDataAI(rawContent)).trim();
                if (finalContent !== rawContent) {
                    SmartToast.show('درع الخصوصية فعّال', {
                        type: 'info',
                        description: 'تم تنقيح البيانات حفاظاً على سرية الموكل.',
                        duration: 3500,
                    });
                }
            } else {
                const redaction = applyAutoRedaction(rawContent);
                finalContent = redaction.redacted.trim();
                if (redaction.changed) {
                    SmartToast.show('درع الخصوصية فعّال', {
                        type: 'info',
                        description: 'تم تنقيح البيانات حفاظاً على سرية الموكل.',
                        duration: 3500,
                    });
                }
            }
        } catch {
            const redaction = applyAutoRedaction(rawContent);
            finalContent = redaction.redacted.trim();
            SmartToast.warning('تعذّر تنقيح الذكاء الاصطناعي، تم استخدام تنقيح سريع');
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
            .map((x) => (x.startsWith('#') ? x : `#${x}`))
            .map((x) => `#${normalizeTagLabel(x.replace(/^#/, ''))}`);
        const tags = Array.from(new Set([...deriveTagsFromContent(rawContent), ...manualTags]));
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
            setPosts((prev) => [saved, ...prev]);
            SmartToast.success('تم نشر الاستشارة');
            if (currentUserId) {
                notifyFollowers(currentUserId, 'new_post', 'منشور جديد من متابَع', `نشر ${post.authorName} استشارة جديدة`, saved.id);
            }
        } catch {
            SmartToast.error('تعذّر نشر الاستشارة');
        } finally {
            setSubmittingPost(false);
        }
    };

    const handleAnalyzeAI = async (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const runId =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        aiRunIdByPostIdRef.current[postId] = runId;
        setAiAnalysisByPostId((prev) => ({
            ...prev,
            [postId]: { loading: true, text: prev[postId]?.text ?? null },
        }));
        try {
            const text = await summarizeLegalFactsAI(post.content);
            if (aiRunIdByPostIdRef.current[postId] !== runId) return;
            setAiAnalysisByPostId((prev) => ({ ...prev, [postId]: { loading: false, text } }));
        } catch {
            if (aiRunIdByPostIdRef.current[postId] !== runId) return;
            setAiAnalysisByPostId((prev) => ({ ...prev, [postId]: { loading: false, text: prev[postId]?.text ?? null } }));
            SmartToast.error('تعذّر تلخيص الوقائع حالياً');
        }
    };

    const handleCloseSummary = (postId: string) => {
        delete aiRunIdByPostIdRef.current[postId];
        setAiAnalysisByPostId((prev) => {
            const next = { ...prev };
            delete next[postId];
            return next;
        });
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
        // تحديث متفائل: المستخدم يرى الإصدار المُعدَّل فوراً مع علامة «معدّل»
        setPosts((prev) =>
            prev.map((p) =>
                p.id === targetId
                    ? { ...p, content: nextText, isEdited: true, updatedAt: new Date().toISOString() }
                    : p,
            ),
        );
        setSavingEdit(true);
        try {
            const updated = await ForumApiService.updatePost(targetId, nextText);
            setPosts((prev) => prev.map((p) => (p.id === targetId ? updated : p)));
            SmartToast.success('تم تحديث المنشور');
            setEditingPostId(null);
            setEditingText('');
        } catch {
            // التراجع عن التحديث المتفائل عند الفشل
            if (snapshot) {
                setPosts((prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
            }
            SmartToast.error('تعذّر تحديث المنشور');
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
            const bookmarked = await ForumApiService.toggleBookmark(postId);
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
        try {
            const updated = await ForumApiService.toggleLockDiscussion(postId, nextLocked);
            setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
            SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
        } catch {
            SmartToast.error('تعذّر تحديث حالة القفل');
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

    if (authIsLoading) {
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
                userId={currentUserId}
            />

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-36">
                {activeSection === 'forum' ? (
                    <>
                        <FilterBar
                            filters={filters}
                            selectedFilterIndex={selectedFilterIndex}
                            onFilterSelect={setSelectedFilterIndex}
                        />

                        <ForumPostList
                            loadingPosts={loadingPosts}
                            hasMore={hasMore}
                            loadingMore={loadingMore}
                            visiblePosts={visiblePosts}
                            currentUserId={currentUserId}
                            onToggleUpvote={handleToggleUpvote}
                            onImageClick={(url) => setFullscreenImage(url)}
                            onCommentClick={(id) => setCommentingPostId(id)}
                            onDelete={handleDeletePost}
                            onEdit={handleEditPost}
                            onReport={handleReportPost}
                            onShare={handleSharePost}
                            aiAnalysisByPostId={aiAnalysisByPostId}
                            onAnalyzeAI={handleAnalyzeAI}
                            onCloseSummary={handleCloseSummary}
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
                    </>
                ) : (
                    <LegalRepository />
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#151822] via-[#151822]/95 to-transparent pointer-events-none z-10" />

            {/* FAB */}
            <div className="absolute bottom-6 left-6 z-20">
                <button type="button"
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
                allTags={allTags}
                filteredPosts={filteredPosts}
                onClose={() => setIsSearchOpen(false)}
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
                isDictating={isDictating}
                showPolishAction={showPolishAction}
                polishingText={polishingText}
                imageInputRef={imageInputRef}
                docInputRef={docInputRef}
                onPolishLegalText={handlePolishLegalText}
                onToggleDictation={toggleDictation}
                onImageUpload={(file) => handleUploadAttachment(file, 'image')}
                onDocUpload={(file) => handleUploadAttachment(file, 'document')}
                onSubmit={handleAddPost}
                onClose={() => setIsAddQuestionOpen(false)}
            />

            <FullscreenImageOverlay
                imageUrl={fullscreenImage}
                onClose={() => setFullscreenImage(null)}
            />
        </div>
    );
};
