import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuth } from '@/app/context/AuthContext';
import { addCommunityPost, deleteCommunityPost, getCommunityPostsPaginated, reportCommunityPost, updateCommunityPost, togglePinCommunityPost, FollowDB, notifyFollowers, BanDB, getUserPostCount, type CommunityPost, type CommunityComment, LawyerStorage } from '@/app/services/lawyer-cloud';
import { hasOpenRouterKey, polishLegalTextAI, redactSensitiveDataAI, summarizeLegalFactsAI } from '@/app/services/ai-service';

import type { SpeechRecognitionInstance } from './CommunityScreen/types';
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

// --- MAIN SCREEN ---
export const CommunityScreen = ({ onBack }: { onBack?: () => void }) => {
    const DEV_MODE = import.meta.env.DEV;
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
    const [activeSection, setActiveSection] = useState<'forum' | 'repository'>('forum');
    const isAdmin = hasRole('admin');
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [userStats, setUserStats] = useState<Record<string, { followerCount: number; postCount: number }>>({});
    const userStatsCache = useRef<Record<string, { followerCount: number; postCount: number }>>({});
    
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

    useEffect(() => {
        if (authIsLoading) return;
        let cancelled = false;
        (async () => {
            setLoadingPosts(true);
            try {
                const { posts: page } = await getCommunityPostsPaginated(PAGE_SIZE, 0);
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
        setUserStats({ ...userStatsCache.current });
    }, []);

    useEffect(() => {
        if (!currentUserId) { setIsBanned(false); return; }
        BanDB.isBanned(currentUserId).then((record) => setIsBanned(!!record)).catch(() => setIsBanned(false));
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) { setFollowingIds(new Set()); return; }
        FollowDB.getFollowing(currentUserId).then((records) => {
            setFollowingIds(new Set(records.map((r) => r.followingId)));
        }).catch(() => {});
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
            const { posts: nextPage } = await getCommunityPostsPaginated(PAGE_SIZE, posts.length);
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
        rec.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; i += 1) {
                const r = event.results[i];
                const t = r?.[0]?.transcript;
                if (typeof t === 'string') fullText += t;
            }
            const next = fullText.trim();
            if (next) {
                setNewPostText(next);
                setShowPolishAction(true);
            }
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

    const removeAttachment = () => setNewAttachment(null);

    const filters = ['الأحدث', 'الأعلى تصويتاً', 'تنفيذ', 'مدني', 'جنائي', 'أحوال شخصية', 'شركات', 'عقاري'];
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);

    const activePostForComments = useMemo(() => {
        if (!commentingPostId) return null;
        return posts.find((p) => p.id === commentingPostId) || null;
    }, [posts, commentingPostId]);

    const allTags = useMemo(() => {
        return Array.from(new Set(posts.flatMap((p) => p.tags || [])));
    }, [posts]);

    const visiblePosts = useMemo(() => {
        const list = posts.slice();
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
    }, [posts, selectedFilterIndex, filters]);

    const filteredPosts = useMemo(() => {
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
    }, [posts, searchQuery, filterHasPdf, filterHasImage, selectedTag]);

    const persistPost = async (post: CommunityPost) => {
        try {
            await addCommunityPost(post);
            return true;
        } catch {
            return false;
        }
    };

    const handleToggleUpvote = async (postId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للتصويت');
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
        if (nextPost) void persistPost(nextPost);
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

    const handleAddComment = async (postId: string, content: string, parentId?: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول للتعليق');
            return;
        }
        if (isBanned) {
            SmartToast.warning('حسابك محظور من التعليق في المنتدى');
            return;
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
        if (nextPost) {
            const ok = await persistPost(nextPost);
            if (ok) {
                SmartToast.success('تم نشر التعليق');
            } else {
                SmartToast.warning('تم حفظ التعليق محلياً');
            }
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        if (!currentUserId) return;
        let nextPost: CommunityPost | null = null;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const comment = p.comments.find((c) => c.id === commentId);
                if (!comment || (comment.authorId !== currentUserId && p.authorId !== currentUserId)) return p;
                const filtered = p.comments.filter((c) => c.id !== commentId && c.parentId !== commentId);
                nextPost = { ...p, comments: filtered, updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        if (nextPost) {
            const ok = await persistPost(nextPost);
            if (ok) SmartToast.success('تم حذف التعليق');
            else SmartToast.warning('تم حذف التعليق محلياً');
        }
    };

    const handleEditComment = async (postId: string, commentId: string, newContent: string) => {
        if (!currentUserId) return;
        let nextPost: CommunityPost | null = null;
        setPosts((prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                const comment = p.comments.find((c) => c.id === commentId);
                if (!comment || comment.authorId !== currentUserId) return p;
                nextPost = {
                    ...p,
                    comments: p.comments.map((c) => (c.id === commentId ? { ...c, content: newContent } : c)),
                    updatedAt: new Date().toISOString(),
                };
                return nextPost;
            }),
        );
        if (nextPost) {
            const ok = await persistPost(nextPost);
            if (ok) SmartToast.success('تم تعديل التعليق');
            else SmartToast.warning('تم تعديل التعليق محلياً');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!currentUserId) return;
        const post = posts.find((p) => p.id === postId);
        if (!post || post.authorId !== currentUserId) return;
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        try {
            await deleteCommunityPost(postId, currentUserId ?? undefined);
            SmartToast.success('تم حذف المنشور');
        } catch {
            SmartToast.warning('تعذّر حذف المنشور سحابياً، قد يبقى في أجهزة أخرى');
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
        if (nextPost) await persistPost(nextPost);

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
        if (DEV_MODE && !authUser?.id) {
            setNewAttachment({
                type: kind,
                url: URL.createObjectURL(file),
                name: file.name,
                mimeType: file.type,
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
        setPosts((prev) => [post, ...prev]);
        setIsAddQuestionOpen(false);
        setNewPostText('');
        setNewTagText('');
        setNewIsAnonymous(false);
        setNewIsUrgent(false);
        setNewAttachment(null);
        const ok = await persistPost(post);
        setSubmittingPost(false);
        if (ok) {
            SmartToast.success('تم نشر الاستشارة');
            if (currentUserId) {
                notifyFollowers(currentUserId, 'new_post', 'منشور جديد من متابَع', `نشر ${post.authorName} استشارة جديدة`, post.id);
            }
        } else {
            SmartToast.warning('تم حفظ الاستشارة محلياً');
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
        if (!post) return;
        if (post.authorId !== currentUserId) return;
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
        setSavingEdit(true);
        try {
            const updated = await updateCommunityPost(editingPostId, nextText, currentUserId ?? undefined);
            setPosts((prev) => prev.map((p) => (p.id === editingPostId ? updated : p)));
            SmartToast.success('تم تحديث المنشور');
            setEditingPostId(null);
            setEditingText('');
        } catch {
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
        try {
            const result = await reportCommunityPost(postId, 'محتوى مخالف', currentUserId);
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
        const url = `${window.location.origin}/#community/post/${postId}`;
        try {
            await navigator.clipboard.writeText(url);
            SmartToast.success('تم نسخ الرابط');
        } catch {
            SmartToast.warning('تعذّر نسخ الرابط');
        }
    };

    const handleTogglePin = async (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const nextPinned = !post.isPinned;
        try {
            const updated = await togglePinCommunityPost(postId, nextPinned);
            setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
            SmartToast.success(nextPinned ? 'تم تثبيت المنشور' : 'تم إلغاء تثبيت المنشور');
        } catch {
            SmartToast.error('تعذّر تحديث حالة التثبيت');
        }
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
    if (!DEV_MODE && (!authUser || !hasRole('lawyer'))) {
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
