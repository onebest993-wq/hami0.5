import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { useAuthSafe, userHasRole } from '@/app/context/AuthContext';
import {
    getUserPostCount,
    type CommunityPost,
    type CommunityComment,
    LawyerStorage,
    RepositoryDB,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { mergeCommunityPostsById, sortCommunityPosts } from '@/app/services/lawyer-cloud';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { checkForumRateLimit } from './CommunityScreen/forumRateLimit';
import { buildCommunityPostShareUrl, setCommunityPostHash } from './CommunityScreen/communityDeepLink';
import {
    persistCommunitySection,
    readPersistedCommunitySection,
    type CommunitySection,
} from './CommunityScreen/communitySectionState';
import {
    saveForumAttachmentToVault,
    saveForumPostToNotepad,
} from '@/app/services/forum/forumPostPersistActions';
import { cacheForumAttachmentFile } from '@/app/services/forumAttachmentService';
import { buildForumEditPatch } from '@/app/services/forum/forumEditUtils';
import { repositoryDocMatchesTag, communityTagMatchesFilter, resolveCommunityPostTags, resolveRepositoryDocTags, repositoryDocMatchesSearch, formatRepositoryTag } from './CommunityScreen/repositoryTagUtils';
import type { RepositorySortKey } from './CommunityScreen/repositoryListFilters';
import { getRepositoryMediaKind } from './CommunityScreen/components/repositoryMedia';
import { applyAutoRedaction } from './CommunityScreen/utils';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';
import { collectForumParticipants } from '@/app/services/forum/forumMentionUtils';
import { useMutedUsers } from './CommunityScreen/useMutedUsers';
import { CommentBottomSheet } from './CommunityScreen/components/CommentBottomSheet';
import { LegalRepository } from './CommunityScreen/components/LegalRepository';
import { ForumAppBar } from './CommunityScreen/components/ForumAppBar';
import { FORUM_FILTER_LABELS } from './CommunityScreen/forumFilters';
import {
    compareCommunityPostsByUpvotes,
    compareCommunityPostsForFeed,
    hasAnyActiveUrgentConsultation,
} from '@/app/services/forum/forumUrgentConsultation';
import { ForumPostList } from './CommunityScreen/components/ForumPostList';
import { ForumFollowingPanel } from './CommunityScreen/components/ForumFollowingPanel';
import { EditPostModal } from './CommunityScreen/components/EditPostModal';
import { SearchOverlay } from './CommunityScreen/components/SearchOverlay';
import { AddQuestionSheet } from './CommunityScreen/components/AddQuestionSheet';
import { ForumGroupsDirectory } from './CommunityScreen/components/ForumGroupsDirectory';
import { ForumGroupFeedPanel } from './CommunityScreen/components/ForumGroupFeedPanel';
import { CreateGroupModal } from './CommunityScreen/components/CreateGroupModal';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { FullscreenImageOverlay } from './CommunityScreen/components/FullscreenImageOverlay';
import { ForumDeleteConfirmModal } from './CommunityScreen/components/ForumDeleteConfirmModal';
import {
    ForumPlumPage,
    FORUM_PLUM_DEEP,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_TEXT_APRICOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from './CommunityScreen/forumPlumTheme';
import {
    canDeletePost,
    canEditPost,
    canPinPost,
    canUpvotePost,
    canDeleteComment,
    canEditComment,
} from './CommunityScreen/communityPermissions';

/** تصنيفات الفلترة — خارج المكوّن لتفادي إعادة الإنشاء عند كل render */

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
    lawyerShellAccess = false,
    fallbackUserId = null,
}: {
    onBack?: () => void;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    /** فُتح من لوحة المحامي — لا نحجب المنتدى إذا كان الجلسة نشطة هناك */
    lawyerShellAccess?: boolean;
    fallbackUserId?: string | null;
}) => {
    const FORUM_DEV_OPEN = import.meta.env.DEV && import.meta.env.VITE_COMMUNITY_DEV_OPEN === 'true';
    const { user: authUser, isLoading: authIsLoading, hasRole } = useAuthSafe();
    const persistedAuth = readPersistedSupabaseAuth();
    const persistedUser = persistedAuth.user;
    const canAccessLawyerForum =
        FORUM_DEV_OPEN ||
        lawyerShellAccess ||
        (authUser != null && hasRole('lawyer')) ||
        (persistedUser != null && userHasRole(persistedUser, 'lawyer'));
    const currentUserId = authUser?.id ?? fallbackUserId ?? persistedUser?.id ?? null;
    const forumStreamConnected = useForumNotificationStream(currentUserId, Boolean(currentUserId));
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
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
        if (section !== 'groups') {
            setActiveGroupId(null);
        }
    }, []);
    const [groups, setGroups] = useState<ForumGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsSearchQuery, setGroupsSearchQuery] = useState('');
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [groupPosts, setGroupPosts] = useState<CommunityPost[]>([]);
    const [groupPostsLoading, setGroupPostsLoading] = useState(false);
    const [groupPostsHasMore, setGroupPostsHasMore] = useState(true);
    const [groupPostsLoadingMore, setGroupPostsLoadingMore] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [submittingGroup, setSubmittingGroup] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
    const [leavingGroup, setLeavingGroup] = useState(false);
    const isAdmin = hasRole('admin');
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [followingRecords, setFollowingRecords] = useState<ForumFollowRecord[]>([]);
    const [followerRecords, setFollowerRecords] = useState<Array<{ followerId: string; createdAt: string }>>([]);
    const [threadFollowingIds, setThreadFollowingIds] = useState<Set<string>>(new Set());
    const [showFollowingPanel, setShowFollowingPanel] = useState(false);
    const [forumFeedScope, setForumFeedScope] = useState<'all' | 'following'>('all');
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
    const groupPostsRef = useRef(groupPosts);
    groupPostsRef.current = groupPosts;

    const findPostById = useCallback((postId: string): CommunityPost | null => {
        return (
            postsRef.current.find((p) => p.id === postId) ??
            groupPostsRef.current.find((p) => p.id === postId) ??
            null
        );
    }, []);

    const updatePostList = useCallback((postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => {
        if (groupPostsRef.current.some((p) => p.id === postId)) {
            setGroupPosts(updater);
        } else {
            setPosts(updater);
        }
    }, []);

    const removePostFromList = useCallback((postId: string) => {
        if (groupPostsRef.current.some((p) => p.id === postId)) {
            setGroupPosts((prev) => prev.filter((p) => p.id !== postId));
        } else {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
    }, []);

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
        if (postsBootstrappedRef.current) return;
        let cancelled = false;

        const mergePage = (page: CommunityPost[]) =>
            page.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) }));

        const hydrateLocal = async () => {
            try {
                const { CommunityDB } = await import('@/app/services/lawyer-cloud');
                const local = sortCommunityPosts(await CommunityDB.listPosts()).filter((p) => !p.groupId);
                if (cancelled || local.length === 0) return;
                setPosts((prev) => sortCommunityPosts(mergeCommunityPostsById(prev, mergePage(local))));
            } catch {
                /* ignore local hydrate */
            }
        };

        const bootstrapRemote = async () => {
            const showBlockingLoad = postsRef.current.length === 0;
            if (showBlockingLoad) setLoadingPosts(true);
            try {
                const timeoutMs = 6_000;
                const fetchPromise = ForumApiService.listPostsPaginated(PAGE_SIZE, 0);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    window.setTimeout(() => reject(new Error('forum-bootstrap-timeout')), timeoutMs);
                });
                const { posts: page } = await Promise.race([fetchPromise, timeoutPromise]);
                if (cancelled) return;
                postsBootstrappedRef.current = true;
                setPosts((prev) =>
                    sortCommunityPosts(mergeCommunityPostsById(prev, mergePage(page))),
                );
                setHasMore(page.length === PAGE_SIZE);
            } catch {
                if (!cancelled && !postsBootstrappedRef.current) {
                    postsBootstrappedRef.current = true;
                    if (postsRef.current.length === 0) {
                        SmartToast.error('تعذّر جلب منشورات المنتدى');
                    }
                }
            } finally {
                if (!cancelled) setLoadingPosts(false);
            }
        };

        void hydrateLocal();
        void bootstrapRemote();
        return () => {
            cancelled = true;
        };
    }, []);

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

    const forumPollEnabled = !authIsLoading && activeSection === 'forum';
    useVisibilityAwareInterval(() => {
        void refreshPosts(true);
    }, 90_000, forumPollEnabled);

    useEffect(() => {
        if (authIsLoading || activeSection !== 'groups' || activeGroupId) return;
        let cancelled = false;
        setGroupsLoading(true);
        void ForumApiService.listGroups(groupsSearchQuery)
            .then((rows) => {
                if (!cancelled) setGroups(rows);
            })
            .catch(() => {
                if (!cancelled) SmartToast.error('تعذّر تحميل المجموعات');
            })
            .finally(() => {
                if (!cancelled) setGroupsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [authIsLoading, activeSection, activeGroupId, groupsSearchQuery]);

    useEffect(() => {
        if (!activeGroupId) {
            setGroupPosts([]);
            setGroupPostsHasMore(true);
            return;
        }
        let cancelled = false;
        setGroupPostsLoading(true);
        void ForumApiService.listPostsPaginated(PAGE_SIZE, 0, { groupId: activeGroupId })
            .then(({ posts: page }) => {
                if (cancelled) return;
                setGroupPosts(
                    sortCommunityPosts(
                        page.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) })),
                    ),
                );
                setGroupPostsHasMore(page.length === PAGE_SIZE);
            })
            .catch(() => {
                if (!cancelled) SmartToast.error('تعذّر تحميل منشورات المجموعة');
            })
            .finally(() => {
                if (!cancelled) setGroupPostsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeGroupId]);

    const activeGroup = useMemo(
        () => (activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null),
        [activeGroupId, groups],
    );

    const groupVisiblePosts = useMemo(() => {
        return groupPosts.filter(
            (p) => !mutedIds.has(p.authorId) || p.authorId === currentUserId,
        );
    }, [groupPosts, mutedIds, currentUserId]);

    const handleJoinGroup = useCallback(
        async (groupId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للانضمام');
                return;
            }
            setJoiningGroupId(groupId);
            try {
                const updated = await ForumApiService.joinGroup(groupId);
                setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
                SmartToast.success('انضممت للمجموعة');
            } catch (err) {
                const message =
                    err instanceof Error && err.message.trim()
                        ? err.message
                        : 'تعذّر الانضمام للمجموعة';
                SmartToast.error(message);
            } finally {
                setJoiningGroupId(null);
            }
        },
        [currentUserId],
    );

    const handleOpenGroup = useCallback(
        (groupId: string) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group?.isMember) return;
            setActiveGroupId(groupId);
        },
        [groups],
    );

    const handleLeaveGroup = useCallback(async () => {
        if (!activeGroupId) return;
        setLeavingGroup(true);
        try {
            await ForumApiService.leaveGroup(activeGroupId);
            setActiveGroupId(null);
            const rows = await ForumApiService.listGroups(groupsSearchQuery);
            setGroups(rows);
            SmartToast.success('غادرت المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر مغادرة المجموعة';
            SmartToast.error(message);
        } finally {
            setLeavingGroup(false);
        }
    }, [activeGroupId, groupsSearchQuery]);

    const handleCreateGroup = useCallback(async () => {
        const name = newGroupName.trim();
        const description = newGroupDesc.trim();
        if (name.length < 3) {
            SmartToast.warning('اسم المجموعة قصير جداً (3 أحرف على الأقل)');
            return;
        }
        if (description.length < 10) {
            SmartToast.warning('اكتب وصفاً أوضح للمجموعة (10 أحرف على الأقل)');
            return;
        }
        setSubmittingGroup(true);
        try {
            const group = await ForumApiService.createGroup({ name, description });
            setGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
            setIsCreateGroupOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
            SmartToast.success('تم إنشاء المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر إنشاء المجموعة';
            SmartToast.error(message);
        } finally {
            setSubmittingGroup(false);
        }
    }, [newGroupName, newGroupDesc]);

    const handleLoadMoreGroupPosts = async () => {
        if (!activeGroupId || groupPostsLoadingMore || !groupPostsHasMore) return;
        setGroupPostsLoadingMore(true);
        try {
            const { posts: nextPage } = await ForumApiService.listPostsPaginated(
                PAGE_SIZE,
                groupPosts.length,
                { groupId: activeGroupId },
            );
            setGroupPosts((prev) =>
                sortCommunityPosts(
                    mergeCommunityPostsById(
                        prev,
                        nextPage.map((p) => ({ ...p, tags: resolveCommunityPostTags(p.content, p.tags) })),
                    ),
                ),
            );
            setGroupPostsHasMore(nextPage.length === PAGE_SIZE);
        } catch {
            SmartToast.error('تعذّر تحميل المزيد');
        } finally {
            setGroupPostsLoadingMore(false);
        }
    };

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
                    ForumApiService.getFollowerCount(id),
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
        if (!currentUserId) {
            setFollowingIds(new Set());
            setFollowingRecords([]);
            return;
        }
        let cancelled = false;
        void ForumApiService.listFollowing(currentUserId)
            .then((records) => {
                if (cancelled) return;
                setFollowingRecords(records);
                setFollowingIds(new Set(records.map((r) => r.followingId)));
            })
            .catch(() => {
                if (!cancelled) {
                    setFollowingRecords([]);
                    setFollowingIds(new Set());
                }
            });
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setFollowerRecords([]);
            setThreadFollowingIds(new Set());
            return;
        }
        let cancelled = false;
        void ForumApiService.listFollowers(currentUserId, currentUserId).then((rows) => {
            if (!cancelled) {
                setFollowerRecords(rows.map((r) => ({ followerId: r.followerId, createdAt: r.createdAt })));
            }
        });
        void ForumApiService.listPostSubscriptions(currentUserId).then((ids) => {
            if (!cancelled) setThreadFollowingIds(new Set(ids));
        });
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!showFollowingPanel || !currentUserId) return;
        let cancelled = false;
        void ForumApiService.listFollowers(currentUserId, currentUserId).then((rows) => {
            if (!cancelled) {
                setFollowerRecords(rows.map((r) => ({ followerId: r.followerId, createdAt: r.createdAt })));
            }
        });
        void ForumApiService.listFollowing(currentUserId).then((rows) => {
            if (!cancelled) {
                setFollowingRecords(rows);
                setFollowingIds(new Set(rows.map((r) => r.followingId)));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [showFollowingPanel, currentUserId]);

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

    const filters = FORUM_FILTER_LABELS;
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
    const [urgentPriorityTick, setUrgentPriorityTick] = useState(0);

    useEffect(() => {
        if (!hasAnyActiveUrgentConsultation(posts)) return;
        const timerId = window.setInterval(() => {
            setUrgentPriorityTick((value) => value + 1);
        }, 60_000);
        return () => window.clearInterval(timerId);
    }, [posts]);

    const activePostForComments = useMemo(() => {
        if (!commentingPostId) return null;
        return findPostById(commentingPostId);
    }, [commentingPostId, posts, groupPosts, findPostById]);

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
        // تطبيق فلتر الكتم + الساحة العامة فقط (بدون منشورات المجموعات)
        const baseList = posts.filter(
            (p) =>
                !p.groupId &&
                (!mutedIds.has(p.authorId) || p.authorId === currentUserId) &&
                (forumFeedScope === 'all' || followingIds.has(p.authorId)),
        );
        const list = baseList.slice();
        if (selectedFilterIndex === 1) {
            list.sort((a, b) => compareCommunityPostsByUpvotes(a, b));
            return list;
        }
        if (selectedFilterIndex >= 2) {
            const topicLabel = filters[selectedFilterIndex];
            return list
                .filter((p) =>
                    communityTagMatchesFilter(resolveCommunityPostTags(p.content, p.tags), topicLabel),
                )
                .sort((a, b) => compareCommunityPostsForFeed(a, b));
        }
        return list.sort((a, b) => compareCommunityPostsForFeed(a, b));
    }, [posts, selectedFilterIndex, filters, mutedIds, currentUserId, urgentPriorityTick, forumFeedScope, followingIds]);

    // ⚡ لا نحسب نتائج البحث إلا عند فتح شاشة البحث فعلياً
    const filteredPosts = useMemo(() => {
        if (!isSearchOpen) return [];
        const q = searchQuery.trim().toLowerCase();
        return posts
            .filter((p) => {
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
        })
            .sort((a, b) => compareCommunityPostsForFeed(a, b));
    }, [isSearchOpen, posts, searchQuery, filterHasPdf, filterHasImage, selectedTag, urgentPriorityTick]);

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
        const target = findPostById(postId);
        if (target && !canUpvotePost(target, currentUserId)) {
            SmartToast.warning('لا يمكنك التصويت على منشورك');
            return;
        }
        let nextPost: CommunityPost | null = null;
        let wasUpvote = false;
        let targetUserId = '';
        updatePostList(postId, (prev) =>
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
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
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
        updatePostList(postId, (prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                nextPost = { ...p, comments: [...p.comments, newComment], updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        try {
            const saved = await ForumApiService.addComment(postId, newComment);
            updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
            setThreadFollowingIds((prev) => new Set(prev).add(postId));
            SmartToast.success('تم نشر التعليق');
            return true;
        } catch {
            updatePostList(postId, (prev) =>
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
        const post = findPostById(postId);
        const comment = post?.comments.find((c) => c.id === commentId);
        if (!post || !comment || !canDeleteComment(post, comment, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك حذف هذا التعليق');
            return;
        }
        const snapshot = findPostById(postId);
        updatePostList(postId, (prev) =>
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
            updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
            SmartToast.success('تم حذف التعليق');
        } catch {
            if (snapshot) {
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? snapshot : p)));
            }
            SmartToast.error('تعذّر حذف التعليق');
        }
    };

    const handleEditComment = async (postId: string, commentId: string, newContent: string) => {
        if (!currentUserId) return;
        const post = findPostById(postId);
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
        updatePostList(postId, (prev) =>
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
            updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
            SmartToast.success('تم تعديل التعليق');
        } catch {
            if (post) {
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? post : p)));
            }
            SmartToast.error('تعذّر تعديل التعليق');
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!currentUserId) return;
        const post = findPostById(postId);
        if (!post || !canDeletePost(post, currentUserId, isAdmin)) {
            SmartToast.warning('لا يمكنك حذف هذا المنشور');
            return;
        }
        const snapshotPosts = postsRef.current;
        const snapshotGroupPosts = groupPostsRef.current;
        setDeletingPost(true);
        try {
            await ForumApiService.deletePost(
                postId,
                post.author_id ?? post.authorId,
                isAdmin,
                currentUserId,
            );
            removePostFromList(postId);
            SmartToast.success('تم حذف المنشور');
        } catch (err) {
            setPosts(snapshotPosts);
            setGroupPosts(snapshotGroupPosts);
            const message =
                err instanceof Error && err.message.trim() ? err.message : 'تعذّر حذف المنشور';
            SmartToast.error(message);
        } finally {
            setDeletingPost(false);
        }
    };

    const requestDeletePost = (postId: string) => {
        if (!currentUserId) return;
        const post = findPostById(postId);
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
        ? findPostById(pendingDeletePostId)
        : null;

    const handleToggleBestAnswer = async (postId: string, commentId: string) => {
        if (!currentUserId) return;
        const post = findPostById(postId);
        if (!post) return;
        if (post.authorId !== currentUserId) {
            SmartToast.warning('فقط صاحب المنشور يمكنه تمييز أفضل إجابة');
            return;
        }
        const nextBest = (post.bestCommentId ?? null) === commentId ? null : commentId;
        let nextPost: CommunityPost | null = null;
        updatePostList(postId, (prev) =>
            prev.map((p) => {
                if (p.id !== postId) return p;
                nextPost = { ...p, bestCommentId: nextBest, updatedAt: new Date().toISOString() };
                return nextPost;
            }),
        );
        if (nextPost) {
            try {
                const saved = await ForumApiService.syncPost(nextPost);
                updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? saved : p)));
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
            ...(activeGroupId ? { groupId: activeGroupId } : {}),
        };
        setIsAddQuestionOpen(false);
        setNewPostText('');
        setNewTagText('');
        setNewIsAnonymous(false);
        setNewIsUrgent(false);
        removeAttachment(); // يُلغي blob URL إن وُجد
        try {
            const saved = await ForumApiService.createPost(post);
            const normalized = {
                ...saved,
                tags: resolveCommunityPostTags(saved.content, saved.tags),
            };
            if (saved.groupId ?? activeGroupId) {
                setGroupPosts((prev) =>
                    sortCommunityPosts(mergeCommunityPostsById(prev, [normalized])),
                );
            } else {
                setPosts((prev) =>
                    sortCommunityPosts(mergeCommunityPostsById(prev, [normalized])),
                );
            }
            SmartToast.success(activeGroupId ? 'تم نشر المنشور في المجموعة' : 'تم نشر الاستشارة');
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
        const post = findPostById(postId);
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
        const snapshot = findPostById(targetId);
        const editPatch = snapshot ? buildForumEditPatch(snapshot, nextText) : null;
        // تحديث متفائل: المستخدم يرى الإصدار المُعدَّل فوراً مع علامة «معدّل»
        updatePostList(targetId, (prev) =>
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
            updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? reconciled : p)));
            SmartToast.success('تم تحديث المنشور');
            setEditingPostId(null);
            setEditingText('');
        } catch (err) {
            // التراجع عن التحديث المتفائل عند الفشل
            if (snapshot) {
                updatePostList(targetId, (prev) => prev.map((p) => (p.id === targetId ? snapshot : p)));
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
        const post = findPostById(postId);
        if (!post) return;
        const nextPinned = !post.isPinned;
        try {
            const updated = await ForumApiService.togglePin(postId, nextPinned);
            updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
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

    const handleSavePostToNotes = async (postId: string) => {
        const post = findPostById(postId);
        if (!post) return;
        try {
            await saveForumPostToNotepad(post);
            SmartToast.success('تم حفظ المنشور في الملاحظات');
        } catch {
            SmartToast.error('تعذّر حفظ المنشور في الملاحظات');
        }
    };

    const handleSavePostToVault = async (postId: string) => {
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول لحفظ الملف في المخزن');
            return;
        }
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
            await saveForumAttachmentToVault(post, currentUserId, String(authorName));
            SmartToast.success('تم حفظ المرفق في المخزن');
        } catch {
            SmartToast.error('تعذّر حفظ المرفق في المخزن');
        }
    };

    const handleToggleCommentUpvote = async (commentId: string) => {
        if (!currentUserId || !commentingPostId) return;
        // تحديث متفائل: نُبدّل عضوية المستخدم في upvoterIds للتعليق
        let didOptimisticUpdate = false;
        updatePostList(commentingPostId, (prev) =>
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
            updatePostList(commentingPostId, (prev) =>
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
                updatePostList(commentingPostId, (prev) =>
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
        try {
            const updated = await ForumApiService.toggleLockDiscussion(
                postId,
                nextLocked,
                currentUserId,
                isAdmin,
                post.author_id ?? post.authorId,
            );
            updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updated : p)));
            SmartToast.success(nextLocked ? 'تم قفل النقاش' : 'تم فتح النقاش');
        } catch (err) {
            updatePostList(postId, (prev) =>
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
                await ForumApiService.unfollowUser(targetUserId, currentUserId);
                setFollowingIds((prev) => {
                    const n = new Set(prev);
                    n.delete(targetUserId);
                    return n;
                });
                setFollowingRecords((prev) => prev.filter((r) => r.followingId !== targetUserId));
                SmartToast.success('تم إلغاء المتابعة');
            } else {
                const followerName =
                    authUser?.user_metadata?.fullName || authUser?.email?.split('@')[0] || 'محامٍ';
                await ForumApiService.followUser(targetUserId, {
                    requesterId: currentUserId,
                    followerName,
                });
                const record: ForumFollowRecord = {
                    followerId: currentUserId,
                    followingId: targetUserId,
                    createdAt: new Date().toISOString(),
                    notifyPosts: true,
                    notifyComments: true,
                    notifyReplies: true,
                };
                setFollowingIds((prev) => new Set(prev).add(targetUserId));
                setFollowingRecords((prev) => [record, ...prev.filter((r) => r.followingId !== targetUserId)]);
                SmartToast.success('تمت المتابعة — ستصلك تنبيهات نشاطه');
            }
        } catch {
            SmartToast.error('تعذّر تحديث حالة المتابعة');
        }
    };

    const handleUpdateFollowPrefs = async (
        targetUserId: string,
        prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
    ) => {
        if (!currentUserId) return;
        try {
            await ForumApiService.updateFollowPreferences(targetUserId, prefs, currentUserId);
            setFollowingRecords((prev) =>
                prev.map((r) => (r.followingId === targetUserId ? { ...r, ...prefs } : r)),
            );
            SmartToast.success('تم حفظ تفضيلات التنبيه');
        } catch {
            SmartToast.error('تعذّر حفظ التفضيلات');
        }
    };

    const followingAuthorNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of posts) {
            if (p.authorId && p.authorName) map[p.authorId] = p.authorName;
        }
        for (const row of followerRecords) {
            if (!map[row.followerId]) map[row.followerId] = 'محامٍ';
        }
        return map;
    }, [posts, followerRecords]);

    const forumMentionCandidates = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of posts) {
            for (const part of collectForumParticipants(p)) {
                map.set(part.id, part.name);
            }
        }
        for (const row of followingRecords) {
            const id = row.followingId;
            if (!map.has(id)) map.set(id, followingAuthorNames[id] ?? 'محامٍ');
        }
        if (currentUserId) map.delete(currentUserId);
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }, [posts, followingRecords, followingAuthorNames, currentUserId]);

    const handleToggleThreadFollow = async (postId: string) => {
        if (!currentUserId) return;
        try {
            const next = await ForumApiService.togglePostSubscription(postId, currentUserId);
            setThreadFollowingIds((prev) => {
                const n = new Set(prev);
                if (next) n.add(postId);
                else n.delete(postId);
                return n;
            });
            SmartToast.success(next ? 'ستصلك تنبيهات هذا النقاش' : 'أُلغيت متابعة النقاش');
        } catch {
            SmartToast.error('تعذّر تحديث متابعة النقاش');
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

    const openFullscreenImage = useCallback((url: string) => setFullscreenImage(url), []);
    const openCommentSheet = useCallback((id: string) => setCommentingPostId(id), []);

    if (
        authIsLoading &&
        !authUser &&
        !persistedUser &&
        !FORUM_DEV_OPEN &&
        !hadAuthenticatedUserRef.current &&
        !lawyerShellAccess
    ) {
        return <div dir="rtl" className="w-full h-full" style={{ backgroundColor: FORUM_PLUM_DEEP }} />;
    }
    if (!canAccessLawyerForum) {
        return (
            <div dir="rtl" className="w-full h-full flex items-center justify-center p-6 text-center" style={{ backgroundColor: FORUM_PLUM_DEEP }}>
                <div className="bg-[#38303E] border border-[#4A3D52]/55 rounded-xl p-6 max-w-md w-full shadow-[inset_0_0_32px_rgba(240,184,150,0.05)]">
                    <div className="w-14 h-14 rounded-xl bg-[#F0B896]/10 border border-[#F0B896]/25 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={22} className="text-[#F0B896]" />
                    </div>
                    <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-1`}>هذا المنتدى مخصص للمحامين فقط</h2>
                    <p className={`${FORUM_TEXT_MUTED} text-sm`}>يرجى تسجيل الدخول بحساب محامٍ للوصول.</p>
                </div>
            </div>
        );
    }

    return (
        <ForumPlumPage>
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
                followingCount={followingRecords.length}
                onOpenFollowing={() => setShowFollowingPanel(true)}
                forumFeedScope={forumFeedScope}
                onForumFeedScopeChange={setForumFeedScope}
                notificationStreamActive={forumStreamConnected}
            />

            <ForumFollowingPanel
                open={showFollowingPanel}
                onClose={() => setShowFollowingPanel(false)}
                following={followingRecords}
                followers={followerRecords}
                authorNames={followingAuthorNames}
                onUnfollow={(id) => void handleFollow(id)}
                onFollowBack={(id) => void handleFollow(id)}
                onUpdatePrefs={(id, prefs) => void handleUpdateFollowPrefs(id, prefs)}
                onOpenFollowingFeed={() => setForumFeedScope('following')}
            />

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-36">
                <div className={activeSection === 'forum' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'forum'}>
                    {forumFeedScope === 'following' ? (
                        <div className="px-4 pt-2 pb-1 flex items-center justify-between gap-2">
                            <p className="text-[#F0B896]/80 text-[11px] font-bold">عرض منشورات المحامين الذين تتابعهم</p>
                            <button
                                type="button"
                                onClick={() => setForumFeedScope('all')}
                                className="text-[10px] text-white/45 hover:text-[#F0B896] font-bold"
                            >
                                الكل
                            </button>
                        </div>
                    ) : null}
                    <ForumPostList
                        loadingPosts={loadingPosts}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        visiblePosts={visiblePosts}
                        emptyHint={
                            forumFeedScope === 'following'
                                ? followingRecords.length === 0
                                    ? 'تابع محامياً لعرض منشوراته هنا'
                                    : 'لا منشورات جديدة من المحامين الذين تتابعهم'
                                : undefined
                        }
                        currentUserId={currentUserId}
                        onToggleUpvote={handleToggleUpvote}
                        onImageClick={openFullscreenImage}
                        onCommentClick={openCommentSheet}
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
                        onSaveToNotes={handleSavePostToNotes}
                        onSaveToVault={handleSavePostToVault}
                        onToggleLock={handleToggleLock}
                        onMuteUser={handleMuteUser}
                        userStats={userStats}
                        threadFollowingIds={threadFollowingIds}
                        onToggleThreadFollow={(id) => void handleToggleThreadFollow(id)}
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
                <div className={activeSection === 'groups' ? 'block' : 'hidden'} aria-hidden={activeSection !== 'groups'}>
                    {activeGroupId && activeGroup ? (
                        <ForumGroupFeedPanel
                            group={activeGroup}
                            onBack={() => setActiveGroupId(null)}
                            onLeave={() => void handleLeaveGroup()}
                            leaving={leavingGroup}
                            loadingPosts={groupPostsLoading}
                            hasMore={groupPostsHasMore}
                            loadingMore={groupPostsLoadingMore}
                            visiblePosts={groupVisiblePosts}
                            currentUserId={currentUserId}
                            onToggleUpvote={handleToggleUpvote}
                            onImageClick={openFullscreenImage}
                            onCommentClick={openCommentSheet}
                            onDelete={requestDeletePost}
                            onEdit={handleEditPost}
                            onReport={handleReportPost}
                            onShare={handleSharePost}
                            onLoadMore={() => void handleLoadMoreGroupPosts()}
                            isAdmin={isAdmin}
                            onTogglePin={handleTogglePin}
                            onFollow={handleFollow}
                            followingIds={followingIds}
                            bookmarkedIds={bookmarkedIds}
                            onToggleBookmark={handleToggleBookmark}
                        onSaveToNotes={handleSavePostToNotes}
                        onSaveToVault={handleSavePostToVault}
                            onToggleLock={handleToggleLock}
                            onMuteUser={handleMuteUser}
                            userStats={userStats}
                            threadFollowingIds={threadFollowingIds}
                            onToggleThreadFollow={(id) => void handleToggleThreadFollow(id)}
                        />
                    ) : (
                        <ForumGroupsDirectory
                            groups={groups}
                            loading={groupsLoading}
                            searchQuery={groupsSearchQuery}
                            onSearchQueryChange={setGroupsSearchQuery}
                            onJoin={(groupId) => void handleJoinGroup(groupId)}
                            onOpenGroup={handleOpenGroup}
                            onCreateClick={() => {
                                if (!currentUserId) {
                                    SmartToast.warning('سجّل الدخول لإنشاء مجموعة');
                                    return;
                                }
                                setIsCreateGroupOpen(true);
                            }}
                            joiningGroupId={joiningGroupId}
                        />
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#0E0812] via-[#140A18]/95 to-transparent pointer-events-none z-10" />

            {/* FAB — المنتدى العام أو جدار المجموعة */}
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
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-lg transition-transform ${
                            currentUserId
                                ? `${FORUM_PUBLISH_BTN} shadow-black/25`
                                : FORUM_PUBLISH_BTN_DISABLED
                        }`}
                    >
                        <Plus size={20} />
                        <span>طرح استشارة للزملاء</span>
                    </button>
                </div>
            ) : activeSection === 'groups' && activeGroupId ? (
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
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-lg transition-transform ${
                            currentUserId
                                ? `${FORUM_PUBLISH_BTN} shadow-black/25`
                                : FORUM_PUBLISH_BTN_DISABLED
                        }`}
                    >
                        <Plus size={20} />
                        <span>نشر في المجموعة</span>
                    </button>
                </div>
            ) : null}

            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                name={newGroupName}
                description={newGroupDesc}
                submitting={submittingGroup}
                onNameChange={setNewGroupName}
                onDescriptionChange={setNewGroupDesc}
                onSubmit={() => void handleCreateGroup()}
                onClose={() => {
                    if (submittingGroup) return;
                    setIsCreateGroupOpen(false);
                }}
            />

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
                    mentionCandidates={forumMentionCandidates}
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
                mentionCandidates={forumMentionCandidates}
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
        </ForumPlumPage>
    );
};
