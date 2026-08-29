import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminUser, AdminUserRole } from '@/app/domain/admin/AdminUser';
import type { HqAccountActivity } from '@/app/domain/admin/HqAccountActivity';
import {
    EMPTY_HQ_DIRECTORY_QUERY,
    HQ_DIRECTORY_PAGE_SIZE,
    type HqDirectoryListQuery,
} from '@/app/domain/admin/hqDirectoryQuery';
import { IAdminRepository } from '@/app/domain/admin/IAdminRepository';
import { supabaseAdminRepository } from '@/app/data/admin/SupabaseAdminRepository';
import { ensureCsrfSessionReady } from '@/app/security/ensureCsrfSessionReady';
import { dispatchHqStatusRefresh, HQ_VERIFICATION_CHANGED_EVENT } from '@/app/components/admin/hqStatusEvents';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { writePublicVerifiedBadge } from '@/app/services/auth/publicVerifiedBadgeStore';
import { parseAdminVerificationStatus } from '@/app/domain/admin/hqUserPresence';

export const HQ_DIRECTORY_LOAD_BUDGET_MS = 20_000;
export const HQ_DIRECTORY_QUERY_DEBOUNCE_MS = 280;

function directoryQueryKey(query: HqDirectoryListQuery): string {
    return [
        query.q,
        query.status,
        query.role,
        query.created,
        String(query.offset),
        String(query.limit),
        query.includeId,
    ].join('\u0001');
}

async function raceDirectoryFetch<T>(signal: AbortSignal, work: Promise<T>): Promise<T> {
    if (signal.aborted) {
        throw Object.assign(new Error('hq-directory-timeout'), { name: 'AbortError' });
    }
    return await new Promise<T>((resolve, reject) => {
        const onAbort = () =>
            reject(Object.assign(new Error('hq-directory-timeout'), { name: 'AbortError' }));
        signal.addEventListener('abort', onAbort, { once: true });
        work.then(
            (value) => {
                signal.removeEventListener('abort', onAbort);
                resolve(value);
            },
            (err) => {
                signal.removeEventListener('abort', onAbort);
                reject(err);
            },
        );
    });
}

type UseHeadquartersResult = {
    users: AdminUser[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    mutatingUserId: string | null;
    mutating: boolean;
    capped: boolean;
    matched: number;
    usersTotal: number;
    hasMore: boolean;
    matchedExact: boolean;
    refresh: () => Promise<void>;
    changeRole: (userId: string, role: AdminUserRole) => Promise<boolean>;
    freezeAccount: (userId: string, durationHours: 0 | 24 | 72 | 168) => Promise<boolean>;
    unfreezeAccount: (userId: string) => Promise<boolean>;
    revokeSessions: (userId: string) => Promise<boolean>;
    setPassword: (userId: string, password: string) => Promise<boolean>;
    sendSystemNotice: (input: {
        scope: 'all' | 'users';
        userIds?: string[];
        title: string;
        message: string;
    }) => Promise<{ sent: number; failed: number; capped: boolean } | null>;
    lockLogin: (userId: string, durationHours: 0 | 24 | 72 | 168) => Promise<boolean>;
    unlockLogin: (userId: string) => Promise<boolean>;
    softDeleteAccount: (userId: string) => Promise<boolean>;
    restoreAccount: (userId: string) => Promise<boolean>;
    banForum: (userId: string, reason: string, durationHours?: 0 | 24 | 72 | 168) => Promise<boolean>;
    unbanForum: (userId: string) => Promise<boolean>;
    setPublicVerifiedBadge: (userId: string, shown: boolean) => Promise<boolean>;
    fetchAccountActivity: (
        userId: string,
        signal?: AbortSignal,
    ) => Promise<{ user: AdminUser; activity: HqAccountActivity } | null>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) return error.message.trim();
    return fallback;
}

/**
 * يربط واجهة مقر القيادة بمستودع الإدارة دون تسريب تفاصيل الشبكة إلى المكوّنات.
 */
export function useHeadquarters(
    repository: IAdminRepository = supabaseAdminRepository,
    opts?: { skipFetch?: boolean; directoryQuery?: HqDirectoryListQuery },
): UseHeadquartersResult {
    const skipFetch = Boolean(opts?.skipFetch);
    const incomingQuery = opts?.directoryQuery ?? EMPTY_HQ_DIRECTORY_QUERY;
    const [debouncedQ, setDebouncedQ] = useState(incomingQuery.q);
    useEffect(() => {
        if (incomingQuery.q === debouncedQ) return;
        const timer = window.setTimeout(() => setDebouncedQ(incomingQuery.q), HQ_DIRECTORY_QUERY_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [incomingQuery.q, debouncedQ]);
    const directoryQuery: HqDirectoryListQuery = {
        ...incomingQuery,
        q: debouncedQ,
        limit: incomingQuery.limit || HQ_DIRECTORY_PAGE_SIZE,
    };
    const queryKey = directoryQueryKey(directoryQuery);
    const repoRef = useRef(repository);
    repoRef.current = repository;
    const queryRef = useRef(directoryQuery);
    queryRef.current = directoryQuery;

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
    const [mutating, setMutating] = useState(false);
    const [capped, setCapped] = useState(false);
    const [matched, setMatched] = useState(0);
    const [usersTotal, setUsersTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [matchedExact, setMatchedExact] = useState(true);
    const mountedRef = useRef(true);
    const genRef = useRef(0);
    const settledRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);
    const mutatingRef = useRef(false);
    const queuedLiveRef = useRef(false);
    const refreshRef = useRef<() => Promise<void>>(async () => {});

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            genRef.current += 1;
            abortRef.current?.abort();
        };
    }, []);

    const patchUser = useCallback((updated: AdminUser) => {
        setUsers((prev) => {
            const idx = prev.findIndex((u) => u.id === updated.id);
            if (idx < 0) return [updated, ...prev];
            const next = prev.slice();
            next[idx] = updated;
            return next;
        });
    }, []);

    const refresh = useCallback(async () => {
        if (skipFetch) {
            if (mountedRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
            return;
        }
        const firstPaintInFlight =
            !settledRef.current && Boolean(abortRef.current) && !abortRef.current!.signal.aborted;
        if (firstPaintInFlight) {
            queuedLiveRef.current = true;
            return;
        }
        const gen = (genRef.current += 1);
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const firstPaint = !settledRef.current;
        const timer = window.setTimeout(() => ac.abort(), HQ_DIRECTORY_LOAD_BUDGET_MS);
        if (mountedRef.current) {
            if (firstPaint) setLoading(true);
            else setRefreshing(true);
            setError(null);
        }
        try {
            await ensureCsrfSessionReady();
            if (ac.signal.aborted) throw Object.assign(new Error('hq-directory-timeout'), { name: 'AbortError' });
            const directory = await raceDirectoryFetch(
                ac.signal,
                repoRef.current.fetchDirectory(ac.signal, queryRef.current),
            );
            if (!mountedRef.current || gen !== genRef.current || ac.signal.aborted) return;
            settledRef.current = true;
            setUsers(directory.users);
            setCapped(directory.capped);
            setMatched(Number(directory.matched) || directory.users.length);
            setUsersTotal(Number(directory.usersTotal) || directory.users.length);
            setHasMore(directory.hasMore === true);
            setMatchedExact(directory.matchedExact !== false);
            setError(null);
        } catch (err) {
            if (!mountedRef.current || gen !== genRef.current) return;
            if (isHqAbortError(err, ac.signal)) {
                setError(
                    firstPaint
                        ? 'انتهت مهلة تحميل الدليل'
                        : 'انتهت مهلة التحديث — تُعرض القائمة السابقة',
                );
                if (!firstPaint) settledRef.current = true;
                return;
            }
            settledRef.current = true;
            if (firstPaint) {
                setUsers([]);
                setCapped(false);
                setMatched(0);
                setUsersTotal(0);
                setHasMore(false);
                setMatchedExact(true);
            }
            setError(toErrorMessage(err, 'تعذّر تحميل المستخدمين'));
        } finally {
            window.clearTimeout(timer);
            if (mountedRef.current && gen === genRef.current) {
                setLoading(false);
                setRefreshing(false);
                if (queuedLiveRef.current) {
                    queuedLiveRef.current = false;
                    void Promise.resolve().then(() => {
                        if (mountedRef.current) void refreshRef.current();
                    });
                }
            }
        }
    }, [skipFetch, queryKey]);
    refreshRef.current = refresh;

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useHqLiveReload(refresh);

    useEffect(() => {
        const onVerificationChanged = (event: Event) => {
            const detail = (event as CustomEvent<{ userId?: unknown; status?: unknown }>).detail;
            const userId = String(detail?.userId ?? '').trim();
            const status = parseAdminVerificationStatus(detail?.status);
            if (!userId || status === 'none') return;
            setUsers((prev) =>
                prev.map((user) => (user.id === userId ? { ...user, verificationStatus: status } : user)),
            );
        };
        window.addEventListener(HQ_VERIFICATION_CHANGED_EVENT, onVerificationChanged);
        return () => window.removeEventListener(HQ_VERIFICATION_CHANGED_EVENT, onVerificationChanged);
    }, []);

    const runMutation = useCallback(
        async (
            userId: string,
            work: () => Promise<AdminUser | null>,
            fallback: string,
            refreshPulse = true,
        ): Promise<boolean> => {
            const id = String(userId ?? '').trim();
            if (!id) return false;
            if (mutatingRef.current) return false;
            mutatingRef.current = true;
            setMutating(true);
            setMutatingUserId(id);
            setError(null);
            try {
                const updated = await work();
                if (!mountedRef.current) return true;
                if (updated) patchUser(updated);
                if (refreshPulse) dispatchHqStatusRefresh();
                return true;
            } catch (err) {
                if (mountedRef.current) {
                    setError(toErrorMessage(err, fallback));
                }
                return false;
            } finally {
                mutatingRef.current = false;
                if (mountedRef.current) {
                    setMutating(false);
                    setMutatingUserId(null);
                }
            }
        },
        [patchUser],
    );

    const changeRole = useCallback(
        (userId: string, role: AdminUserRole) =>
            runMutation(userId, () => repoRef.current.changeUserRole(userId, role), 'فشل تحديث صلاحية المستخدم'),
        [runMutation],
    );

    const freezeAccount = useCallback(
        (userId: string, durationHours: 0 | 24 | 72 | 168) =>
            runMutation(
                userId,
                () => repoRef.current.freezeAccount(userId, durationHours),
                'فشل تجميد الحساب',
            ),
        [runMutation],
    );

    const unfreezeAccount = useCallback(
        (userId: string) =>
            runMutation(userId, () => repoRef.current.unfreezeAccount(userId), 'فشل إلغاء التجميد'),
        [runMutation],
    );

    const revokeSessions = useCallback(
        (userId: string) =>
            runMutation(userId, () => repoRef.current.revokeUserSessions(userId), 'فشل إنهاء الجلسات'),
        [runMutation],
    );

    const setPassword = useCallback(
        (userId: string, password: string) =>
            runMutation(userId, () => repoRef.current.setUserPassword(userId, password), 'فشل تحديث كلمة المرور'),
        [runMutation],
    );

    const lockLogin = useCallback(
        (userId: string, durationHours: 0 | 24 | 72 | 168) =>
            runMutation(userId, () => repoRef.current.lockLogin(userId, durationHours), 'فشل قفل الدخول'),
        [runMutation],
    );

    const unlockLogin = useCallback(
        (userId: string) => runMutation(userId, () => repoRef.current.unlockLogin(userId), 'فشل فتح الدخول'),
        [runMutation],
    );

    const softDeleteAccount = useCallback(
        (userId: string) =>
            runMutation(userId, () => repoRef.current.softDeleteAccount(userId), 'فشل حذف الحساب'),
        [runMutation],
    );

    const restoreAccount = useCallback(
        (userId: string) =>
            runMutation(userId, () => repoRef.current.restoreAccount(userId), 'فشل استعادة الحساب'),
        [runMutation],
    );

    const banForum = useCallback(
        (userId: string, reason: string, durationHours?: 0 | 24 | 72 | 168) =>
            runMutation(
                userId,
                () => repoRef.current.banForum(userId, reason, durationHours),
                'فشل حظر المنتدى',
            ),
        [runMutation],
    );

    const unbanForum = useCallback(
        (userId: string) =>
            runMutation(userId, () => repoRef.current.unbanForum(userId), 'فشل رفع حظر المنتدى'),
        [runMutation],
    );

    const setPublicVerifiedBadge = useCallback(
        (userId: string, shown: boolean) =>
            runMutation(
                userId,
                async () => {
                    const updated = await repoRef.current.setPublicVerifiedBadge(userId, shown);
                    writePublicVerifiedBadge(userId, updated.publicVerifiedBadge === true);
                    return updated;
                },
                'فشل تحديث علامة التوثيق',
                false,
            ),
        [runMutation],
    );

    const fetchAccountActivity = useCallback(
        async (
            userId: string,
            signal?: AbortSignal,
        ): Promise<{ user: AdminUser; activity: HqAccountActivity } | null> => {
            const id = String(userId ?? '').trim();
            if (!id) return null;
            try {
                await ensureCsrfSessionReady();
                const result = await repoRef.current.fetchAccountActivity(id, signal);
                if (mountedRef.current && result.user) patchUser(result.user);
                return result;
            } catch (err) {
                if (signal?.aborted || isHqAbortError(err, signal)) return null;
                return null;
            }
        },
        [patchUser],
    );

    const sendSystemNotice = useCallback(
        async (input: {
            scope: 'all' | 'users';
            userIds?: string[];
            title: string;
            message: string;
        }): Promise<{ sent: number; failed: number; capped: boolean } | null> => {
            if (mutatingRef.current) return null;
            mutatingRef.current = true;
            setMutating(true);
            setError(null);
            try {
                await ensureCsrfSessionReady();
                const result = await repoRef.current.sendSystemNotice(input);
                if (result.sent > 0) dispatchHqStatusRefresh();
                return result;
            } catch (err) {
                if (mountedRef.current) {
                    setError(toErrorMessage(err, 'فشل إرسال إشعار النظام'));
                }
                return null;
            } finally {
                mutatingRef.current = false;
                if (mountedRef.current) setMutating(false);
            }
        },
        [],
    );

    return {
        users,
        loading,
        refreshing,
        error,
        mutatingUserId,
        mutating,
        capped,
        matched,
        usersTotal,
        hasMore,
        matchedExact,
        refresh,
        changeRole,
        freezeAccount,
        unfreezeAccount,
        revokeSessions,
        setPassword,
        sendSystemNotice,
        lockLogin,
        unlockLogin,
        softDeleteAccount,
        restoreAccount,
        banForum,
        unbanForum,
        setPublicVerifiedBadge,
        fetchAccountActivity,
    };
}
