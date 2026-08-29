import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HqChip, HqChipRow, HqGhostButton, HqMetric, HqSectionHeader, HqStateBlock } from '@/app/components/admin/hqChrome';
import { HqConsultationsPanel } from '@/app/components/admin/HqConsultationsPanel';
import type { HqForumPostKind, HqForumTab } from '@/app/components/admin/hqJump';
import { formatHqDate } from '@/app/components/admin/hqFormat';
import { hqActionErrorMessage } from '@/app/components/admin/hqActionError';
import {
    sanitizeHqBannedUserRows,
    sanitizeHqForumDirectoryUsers,
    sanitizeHqForumStats,
    type HqBannedUserRow,
    type HqForumDirectoryUser,
    type HqForumStats,
} from '@/app/components/admin/hqForumBanRows';
import { dispatchHqStatusRefresh } from '@/app/components/admin/hqStatusEvents';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { useHqPanelLoad, hqPanelFailDetail } from '@/app/components/admin/useHqPanelLoad';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { SmartToast } from '@/app/components/ui/SmartToast';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function HqForumAdminPanel({
    onJumpReports,
    initialForumTab = 'stats',
    initialPostKind = 'all',
    gated = false,
}: {
    onJumpReports?: () => void;
    initialForumTab?: HqForumTab;
    initialPostKind?: HqForumPostKind;
    gated?: boolean;
}) {
    const [stats, setStats] = useState<HqForumStats | null>(null);
    const [bannedUsers, setBannedUsers] = useState<HqBannedUserRow[]>([]);
    const [bansCapped, setBansCapped] = useState(false);
    const [forumTab, setForumTab] = useState<HqForumTab>(initialForumTab);
    const [loadError, setLoadError] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [banUserId, setBanUserId] = useState('');
    const [banUserName, setBanUserName] = useState('');
    const [banHours, setBanHours] = useState<0 | 24 | 168>(0);
    const [directory, setDirectory] = useState<HqForumDirectoryUser[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [postsEpoch, setPostsEpoch] = useState(0);
    const busyRef = useRef<string | null>(null);

    const work = useCallback(
        async (signal: AbortSignal) => {
            if (gated || forumTab === 'posts') return;
            setLoadError(false);
            try {
                if (forumTab === 'stats') {
                    const statsData = await SecureAPIClient.fetchSecure<{ ok?: boolean; stats?: unknown }>(
                        '/api/forum/stats',
                        { method: 'GET', signal },
                    );
                    if (signal.aborted) return;
                    const next = statsData?.ok ? sanitizeHqForumStats(statsData.stats) : null;
                    if (next) setStats(next);
                    else setLoadError(true);
                    return;
                }

                const [bansData, usersData] = await Promise.all([
                    SecureAPIClient.fetchSecure<{ ok?: boolean; bannedUsers?: unknown; capped?: boolean }>(
                        '/api/forum/ban',
                        {
                            method: 'GET',
                            signal,
                        },
                    ),
                    SecureAPIClient.fetchSecure<{ ok?: boolean; users?: unknown }>('/api/admin/users', {
                        method: 'GET',
                        signal,
                    }).catch(() => null),
                ]);
                if (signal.aborted) return;
                if (bansData?.ok) {
                    setBannedUsers(sanitizeHqBannedUserRows(bansData.bannedUsers));
                    setBansCapped(Boolean(bansData.capped));
                } else setLoadError(true);
                if (usersData?.ok) setDirectory(sanitizeHqForumDirectoryUsers(usersData.users));
            } catch (error) {
                if (signal.aborted || isHqAbortError(error, signal)) return;
                setLoadError(true);
            }
        },
        [forumTab, gated],
    );

    const { loading, failed, failKind, reload } = useHqPanelLoad(work, {
        skipFirstWork: gated,
        alreadySettled: gated,
    });
    useHqLiveReload(reload);

    useEffect(() => {
        setForumTab(initialForumTab);
    }, [initialForumTab]);

    const runBanAction = async (
        busyKey: string,
        fallback: string,
        request: () => Promise<{ ok?: boolean }>,
        success: string,
    ): Promise<boolean> => {
        if (busyRef.current) return false;
        busyRef.current = busyKey;
        setActionLoading(busyKey);
        try {
            await request();
            SmartToast.success(success);
            await reload();
            dispatchHqStatusRefresh();
            return true;
        } catch (error) {
            SmartToast.error(hqActionErrorMessage(error, fallback));
            return false;
        } finally {
            busyRef.current = null;
            setActionLoading(null);
        }
    };

    const handleBan = async () => {
        const userId = banUserId.trim();
        const userName = banUserName.trim();
        const reason = banReason.trim();
        if (!userId || !userName || !reason) {
            SmartToast.warning('يرجى ملء جميع الحقول');
            return;
        }
        if (!UUID_RE.test(userId)) {
            SmartToast.warning('معرف المستخدم غير صالح');
            return;
        }
        const ok = await runBanAction(
            'ban',
            'فشل الحظر',
            () =>
                hqMutatingFetch('/api/forum/ban', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'ban',
                        userId,
                        userName,
                        reason,
                        durationHours: banHours,
                    }),
                }),
            'تم حظر المستخدم',
        );
        if (ok) {
            setBanUserId('');
            setBanUserName('');
            setBanReason('');
            setBanHours(0);
        }
    };

    const handleUnban = async (userId: string) => {
        if (!UUID_RE.test(userId)) return;
        await runBanAction(
            userId,
            'تعذّر رفع الحظر',
            () =>
                hqMutatingFetch('/api/forum/ban', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'unban', userId }),
                }),
            'تم رفع الحظر',
        );
    };

    return (
        <div className="space-y-6">
            <HqSectionHeader
                kicker="المحتوى"
                title="إدارة المنتدى القانوني"
                action={
                    <HqGhostButton
                        onClick={() => {
                            if (forumTab === 'posts') {
                                setPostsEpoch((n) => n + 1);
                                return;
                            }
                            void reload();
                        }}
                    >
                        تحديث
                    </HqGhostButton>
                }
            />

            <HqChipRow>
                <HqChip active={forumTab === 'stats'} onClick={() => setForumTab('stats')}>
                    الإحصائيات
                </HqChip>
                <HqChip active={forumTab === 'posts'} onClick={() => setForumTab('posts')}>
                    المنشورات
                </HqChip>
                <HqChip active={forumTab === 'bans'} onClick={() => setForumTab('bans')}>
                    الحظر
                </HqChip>
            </HqChipRow>

            {forumTab === 'posts' ? (
                <HqConsultationsPanel key={postsEpoch} embedded initialPostKind={initialPostKind} />
            ) : loading ? (
                <HqStateBlock kind="loading" title="جاري التحميل..." />
            ) : (loadError || failed) && !(forumTab === 'stats' && stats) && !(forumTab === 'bans' && bannedUsers.length > 0) ? (
                <HqStateBlock
                    kind="error"
                    title={forumTab === 'bans' ? 'تعذّر تحميل قائمة الحظر' : 'تعذّر تحميل إحصائيات المنتدى'}
                    detail={hqPanelFailDetail(failKind)}
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void reload()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : forumTab === 'stats' && stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <HqMetric
                        label="إجمالي المنشورات"
                        value={stats.totalPosts}
                        onClick={() => setForumTab('posts')}
                    />
                    <HqMetric
                        label="إجمالي التعليقات"
                        value={stats.totalComments}
                        tone="ok"
                        onClick={() => setForumTab('posts')}
                    />
                    <HqMetric label="إجمالي الإعجابات" value={stats.totalUpvotes} tone="warn" />
                    <HqMetric
                        label="بلاغات معلقة"
                        value={stats.pendingReports}
                        tone="danger"
                        onClick={onJumpReports}
                    />
                    <HqMetric
                        label="مستندات قانونية"
                        value={stats.totalDocuments}
                        onClick={() => setForumTab('posts')}
                    />
                    <HqMetric
                        label="مستخدمين محظورين"
                        value={stats.totalBannedUsers}
                        tone="danger"
                        onClick={() => setForumTab('bans')}
                    />
                    <div className="hq-panel col-span-2 p-4">
                        <p className="mb-2 text-xs text-white/45">الوسوم الأكثر شيوعاً</p>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.topTags.slice(0, 8).map((t) => (
                                <span key={t.tag} className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                                    {t.tag} ({t.count})
                                </span>
                            ))}
                            {stats.topTags.length === 0 && <span className="text-xs text-white/40">لا توجد وسوم</span>}
                        </div>
                    </div>
                    <div className="hq-panel col-span-2 p-4">
                        <p className="text-xs text-white/45">إجمالي التقارير</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-white">{stats.totalReports}</p>
                        <p className="mt-1 text-xs text-white/40">منذ بداية المنتدى</p>
                    </div>
                </div>
            ) : forumTab === 'bans' ? (
                <div className="space-y-4">
                    {bansCapped ? (
                        <p className="hq-ops-stamp">قائمة الحظر مقصوصة عند سقف المقر — الأقدم قد لا يظهر.</p>
                    ) : null}
                    <div className="hq-panel p-4">
                        <h3 className="mb-3 text-sm font-bold text-white">حظر مستخدم من المنتدى</h3>
                        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <input
                                value={banUserId}
                                list="hq-forum-ban-directory"
                                onChange={(e) => {
                                    const nextId = e.target.value;
                                    setBanUserId(nextId);
                                    const match = directory.find((u) => u.id === nextId.trim());
                                    if (match) setBanUserName(match.fullName);
                                }}
                                placeholder="معرف المستخدم (User ID)"
                                className="h-11 rounded-xl border border-white/10 bg-[#0A0F1C] px-4 text-sm text-white placeholder-white/35 outline-none focus:border-[#E6C673]/50"
                            />
                            <datalist id="hq-forum-ban-directory">
                                {directory.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.fullName}
                                        {u.email ? ` — ${u.email}` : ''}
                                    </option>
                                ))}
                            </datalist>
                            <input
                                value={banUserName}
                                onChange={(e) => setBanUserName(e.target.value)}
                                placeholder="اسم المستخدم"
                                className="h-11 rounded-xl border border-white/10 bg-[#0A0F1C] px-4 text-sm text-white placeholder-white/35 outline-none focus:border-[#E6C673]/50"
                            />
                            <input
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="سبب الحظر"
                                className="h-11 rounded-xl border border-white/10 bg-[#0A0F1C] px-4 text-sm text-white placeholder-white/35 outline-none focus:border-[#E6C673]/50"
                            />
                        </div>
                        <HqChipRow>
                            <HqChip active={banHours === 0} onClick={() => setBanHours(0)}>
                                دائم
                            </HqChip>
                            <HqChip active={banHours === 24} onClick={() => setBanHours(24)}>
                                ٢٤ ساعة
                            </HqChip>
                            <HqChip active={banHours === 168} onClick={() => setBanHours(168)}>
                                ٧ أيام
                            </HqChip>
                        </HqChipRow>
                        <button
                            type="button"
                            onClick={() => void handleBan()}
                            disabled={actionLoading !== null}
                            className="mt-3 min-h-11 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                        >
                            حظر
                        </button>
                    </div>

                    <h3 className="text-sm font-bold text-white">المستخدمون المحظورون ({bannedUsers.length})</h3>
                    {bannedUsers.length === 0 ? (
                        <p className="text-xs text-white/40">لا يوجد مستخدمون محظورون</p>
                    ) : (
                        bannedUsers.map((b) => (
                            <div key={b.userId} className="hq-panel flex items-center justify-between gap-3 p-4">
                                <div>
                                    <p className="text-sm font-bold text-white">{b.userName}</p>
                                    <p className="text-xs text-white/50">سبب الحظر: {b.reason}</p>
                                    <p className="text-[10px] text-white/35">
                                        {formatHqDate(b.bannedAt)}
                                        {b.expiresAt ? ` · حتى ${formatHqDate(b.expiresAt)}` : ' · دائم'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleUnban(b.userId)}
                                    disabled={actionLoading !== null}
                                    className="min-h-11 rounded-lg border border-green-600/50 bg-green-600/20 px-4 py-2 text-xs font-bold text-green-500 transition hover:bg-green-600 hover:text-white"
                                >
                                    رفع الحظر
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}
