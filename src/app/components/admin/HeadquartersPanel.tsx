import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { Search } from '@/app/components/ui/icons/Search';
import { HqChip, HqChipRow, HqGhostButton, HqMetric, HqPulseCell, HqStateBlock } from '@/app/components/admin/hqChrome';
import { HqFold } from '@/app/components/admin/HqFold';
import { formatHqFreezeUntil } from '@/app/components/admin/hqFormat';
import { type HqFreezeHours } from '@/app/components/admin/hqFreeze';
import { HQ_DIRECTORY_PAGE_SIZE } from '@/app/domain/admin/hqDirectoryQuery';
import {
    HQ_DIRECTORY_RENDER_CAP,
    HQ_USER_QUERY_MAX,
    matchesHqUserCreatedFilter,
    matchesHqUserQuery,
    matchesHqUserStatusFilter,
    type HqUserCreatedFilter,
    type HqUserRoleFilter,
    type HqUserStatusFilter,
} from '@/app/components/admin/hqUserFilters';
import { HeadquartersUserRow, headquartersRoleLabel } from '@/app/components/admin/HeadquartersUserRow';
import { cn } from '@/app/components/ui/utils';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { type AdminUser, type AdminUserRole } from '@/app/domain/admin/AdminUser';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';
import { resolveHqUserPresence, type HqUserPresence } from '@/app/domain/admin/hqUserPresence';
import { isHqUserMutationLocked } from '@/app/domain/admin/hqUserActions';
import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import { useHeadquarters } from '@/app/components/admin/useHeadquarters';
import { HeadquartersUserDossier } from '@/app/components/admin/HeadquartersUserDossier';
import { HqSystemNotifyComposer } from '@/app/components/admin/HqSystemNotifyComposer';

export type HeadquartersPanelProps = {
    className?: string;
    focusUserId?: string | null;
    onFocusConsumed?: () => void;
    initialStatusFilter?: HqUserStatusFilter;
    initialRoleFilter?: HqUserRoleFilter;
    initialCreatedFilter?: HqUserCreatedFilter;
    skipFetch?: boolean;
};

/**
 * شاشة مقر القيادة — إدارة المستخدمين (RTL) مرتبطة بـ Supabase عبر Clean Architecture.
 */
export function HeadquartersPanel({
    className,
    focusUserId = null,
    onFocusConsumed,
    initialStatusFilter = 'all',
    initialRoleFilter = 'all',
    initialCreatedFilter = 'all',
    skipFetch = false,
}: HeadquartersPanelProps) {
    const [query, setQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<HqUserStatusFilter>(initialStatusFilter);
    const [roleFilter, setRoleFilter] = useState<HqUserRoleFilter>(initialRoleFilter);
    const [createdFilter, setCreatedFilter] = useState<HqUserCreatedFilter>(initialCreatedFilter);
    const [freezePickerUserId, setFreezePickerUserId] = useState<string | null>(null);
    const [dirPage, setDirPage] = useState(0);
    const directoryQuery = useMemo(
        () => ({
            q: query,
            status: statusFilter,
            role: roleFilter,
            created: createdFilter,
            offset: dirPage * HQ_DIRECTORY_PAGE_SIZE,
            limit: HQ_DIRECTORY_PAGE_SIZE,
            includeId: stripHqControlChars(focusUserId, 36),
        }),
        [query, statusFilter, roleFilter, createdFilter, dirPage, focusUserId],
    );
    const {
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
    } = useHeadquarters(undefined, { skipFetch, directoryQuery });

    useEffect(() => {
        setStatusFilter(initialStatusFilter);
    }, [initialStatusFilter]);

    useEffect(() => {
        setRoleFilter(initialRoleFilter);
    }, [initialRoleFilter]);

    useEffect(() => {
        setCreatedFilter(initialCreatedFilter);
    }, [initialCreatedFilter]);

    useEffect(() => {
        if (!focusUserId) return;
        const id = stripHqControlChars(focusUserId, 36);
        if (!id) return;
        setSelectedUserId(id);
        setQuery('');
        setStatusFilter('all');
        setRoleFilter('all');
        setCreatedFilter('all');
        onFocusConsumed?.();
    }, [focusUserId, onFocusConsumed]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            if (selectedUserId) {
                event.preventDefault();
                setSelectedUserId(null);
                return;
            }
            if (freezePickerUserId) {
                event.preventDefault();
                setFreezePickerUserId(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedUserId, freezePickerUserId]);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            if (!matchesHqUserQuery(u, query)) return false;
            if (!matchesHqUserStatusFilter(u, statusFilter)) return false;
            if (roleFilter !== 'all' && u.role !== roleFilter) return false;
            if (!matchesHqUserCreatedFilter(u.createdAt, createdFilter)) return false;
            return true;
        });
    }, [users, query, statusFilter, roleFilter, createdFilter]);

    const serverPaged = typeof matched === 'number';
    const pageCount = Math.max(
        1,
        Math.ceil((serverPaged ? Math.max(matched, filtered.length) : filtered.length) / HQ_DIRECTORY_PAGE_SIZE),
    );
    const safePage = serverPaged ? dirPage : Math.min(dirPage, pageCount - 1);
    const visible = useMemo(
        () =>
            serverPaged
                ? filtered
                : filtered.slice(
                      safePage * HQ_DIRECTORY_PAGE_SIZE,
                      safePage * HQ_DIRECTORY_PAGE_SIZE + HQ_DIRECTORY_PAGE_SIZE,
                  ),
        [filtered, safePage, serverPaged],
    );
    const renderCapped = !serverPaged && filtered.length > HQ_DIRECTORY_RENDER_CAP;

    useEffect(() => {
        setDirPage(0);
    }, [query, statusFilter, roleFilter, createdFilter]);

    useEffect(() => {
        if (serverPaged) return;
        if (!selectedUserId) return;
        const idx = filtered.findIndex((u) => u.id === selectedUserId);
        if (idx < 0) return;
        setDirPage(Math.floor(idx / HQ_DIRECTORY_PAGE_SIZE));
    }, [selectedUserId, filtered, serverPaged]);

    const presenceCounts = useMemo(() => {
        const counts: Record<HqUserPresence, number> = {
            active: 0,
            frozen: 0,
            locked: 0,
            pending: 0,
            unsubmitted: 0,
            rejected: 0,
            deleted: 0,
        };
        for (const user of users) {
            counts[resolveHqUserPresence(user)] += 1;
        }
        return counts;
    }, [users]);

    const nameMismatchCount = useMemo(
        () => users.filter((user) => hqLiveNameDivergesFromKyc(user.fullName, user.kycSubmittedName)).length,
        [users],
    );

    const directoryStamp = serverPaged
        ? `${matchedExact ? matched : `${matched}+`} مطابق · ${usersTotal} حساب`
        : filtered.length === users.length
          ? `${users.length} حساب محمّل`
          : `${filtered.length} مطابق من ${users.length}`;

    const selectedUser = useMemo(
        () => users.find((u) => u.id === selectedUserId) ?? null,
        [users, selectedUserId],
    );

    const loadSelectedActivity = useCallback(
        async (signal: AbortSignal) => {
            if (!selectedUserId) return null;
            const result = await fetchAccountActivity(selectedUserId, signal);
            return result?.activity ?? null;
        },
        [selectedUserId, fetchAccountActivity],
    );

    const onFreeze = async (user: AdminUser, hours: HqFreezeHours) => {
        if (isHqUserMutationLocked(user)) return;
        const ok = await freezeAccount(user.id, hours);
        if (!ok) return;
        setFreezePickerUserId(null);
        if (hours > 0) {
            const until = formatHqFreezeUntil(new Date(Date.now() + hours * 3_600_000).toISOString());
            SmartToast.success(
                until
                    ? `تم تجميد الحساب حتى ${until}، وأُرسل إشعار للمستخدم.`
                    : 'تم تجميد الحساب، وأُرسل إشعار للمستخدم.',
            );
            return;
        }
        SmartToast.success('تم تجميد الحساب بشكل دائم، وأُرسل إشعار للمستخدم.');
    };

    const onUnfreeze = async (user: AdminUser) => {
        if (isHqUserMutationLocked(user)) return;
        const ok = await unfreezeAccount(user.id);
        if (ok) {
            setFreezePickerUserId(null);
            SmartToast.success('تم إعادة تفعيل الحساب، وأُرسل إشعار للمستخدم.');
        }
    };

    const onRoleChange = async (user: AdminUser, next: AdminUserRole) => {
        if (next === user.role || isHqUserMutationLocked(user)) return;
        const ok = await changeRole(user.id, next);
        if (ok) {
            SmartToast.success(`تم تحديث الصلاحية إلى «${headquartersRoleLabel(next)}»`);
        }
    };

    const onTogglePublicBadge = async (user: AdminUser, shown: boolean) => {
        if (isHqUserMutationLocked(user) || user.isDeleted) return;
        const ok = await setPublicVerifiedBadge(user.id, shown);
        if (ok) {
            SmartToast.success(shown ? 'وُضعت علامة التوثيق — تظهر لصاحب الحساب ولمن يرى صورته.' : 'أُزيلت علامة التوثيق من الصورة.');
        }
    };

    const renderDossier = (user: AdminUser) => (
        <HeadquartersUserDossier
            user={user}
            busy={mutating || mutatingUserId === user.id}
            onClose={() => setSelectedUserId(null)}
            onFreeze={(hours) => freezeAccount(user.id, hours)}
            onUnfreeze={() => unfreezeAccount(user.id)}
            onRevokeSessions={() => revokeSessions(user.id)}
            onSetPassword={(next) => setPassword(user.id, next)}
            onLockLogin={(hours) => lockLogin(user.id, hours)}
            onUnlockLogin={() => unlockLogin(user.id)}
            onSoftDelete={() => softDeleteAccount(user.id)}
            onRestore={() => restoreAccount(user.id)}
            onBanForum={(reason, hours) => banForum(user.id, reason, hours)}
            onUnbanForum={() => unbanForum(user.id)}
            onTogglePublicBadge={(shown) => setPublicVerifiedBadge(user.id, shown)}
            onLoadActivity={loadSelectedActivity}
        />
    );

    return (
        <div dir="rtl" className={cn('hq-ops', className)} data-testid="hq-directory">
            <div className="hq-ops-head">
                <div className="min-w-0">
                    <p className="hq-kicker">الحسابات</p>
                    <h2 className="hq-title">إدارة المستخدمين</h2>
                </div>
                <div className="hq-ops-meta">
                    {presenceCounts.pending > 0 ? (
                        <button
                            type="button"
                            className="hq-ops-pill hq-ops-pill-warn"
                            onClick={() => setStatusFilter('pending')}
                        >
                            {presenceCounts.pending} قيد التدقيق
                        </button>
                    ) : null}
                    {presenceCounts.unsubmitted > 0 ? (
                        <button
                            type="button"
                            className="hq-ops-pill"
                            onClick={() => setStatusFilter('unsubmitted')}
                        >
                            {presenceCounts.unsubmitted} بلا طلب
                        </button>
                    ) : null}
                    {nameMismatchCount > 0 ? (
                        <button
                            type="button"
                            className="hq-ops-pill hq-ops-pill-warn"
                            onClick={() => setStatusFilter('name_mismatch')}
                        >
                            {nameMismatchCount} اختلاف الاسم
                        </button>
                    ) : null}
                    <p className="hq-ops-stamp">{directoryStamp}</p>
                    <HqGhostButton
                        onClick={() => void refresh()}
                        disabled={loading || refreshing}
                        aria-busy={loading || refreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', (loading || refreshing) && 'animate-spin')} aria-hidden />
                        تحديث
                    </HqGhostButton>
                </div>
            </div>

            <div className="hq-ops-pulse hq-dir-layers">
                <HqPulseCell
                    label="تجميد الشبكة"
                    value="الدخول يبقى"
                    detail="منتدى وخدمات — الجلسة لا تُقطع"
                    tone="warn"
                />
                <HqPulseCell
                    label="قفل الدخول"
                    value="يمنع الجلسة"
                    detail="GoTrue والدليل — الشبكة لا تُمسّ وحدها"
                    tone="danger"
                />
                <HqPulseCell
                    label="حظر المنتدى"
                    value="الكتابة فقط"
                    detail="الدخول والخدمات يبقيان"
                />
            </div>

            {capped ? (
                <p className="hq-ops-note" role="status">
                    وصلت التصفية سقف المسح — الأرقام أدناه لهذه الدفعة. ضيّق البحث لرؤية البقية.
                </p>
            ) : null}

            <div className="hq-ops-grid hq-ops-grid-4">
                <HqMetric
                    label="إجمالي الحسابات"
                    value={serverPaged ? usersTotal : users.length}
                    hint={serverPaged ? 'في القاعدة' : 'المحمّلة في هذه الجلسة'}
                    onClick={() => setStatusFilter('all')}
                />
                <HqMetric
                    label="حسابات نشطة"
                    value={presenceCounts.active}
                    hint="غير موقوف — المحامي المعتمد شارتُه «معتمد»"
                    tone="ok"
                    onClick={() => setStatusFilter('active')}
                />
                <HqMetric
                    label="موقوف"
                    value={presenceCounts.frozen}
                    hint="تجميد شبكة سارٍ"
                    tone="danger"
                    onClick={() => setStatusFilter('frozen')}
                />
                <HqMetric
                    label="مقفل الدخول"
                    value={presenceCounts.locked}
                    hint="لا يمكن تسجيل الدخول"
                    tone="warn"
                    onClick={() => setStatusFilter('locked')}
                />
            </div>

            <div className="hq-panel hq-dir-board" data-testid="hq-dir-filters">
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الوضع</p>
                    <HqChipRow>
                        <HqChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                            الكل
                        </HqChip>
                        <HqChip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                            نشط
                        </HqChip>
                        <HqChip active={statusFilter === 'frozen'} onClick={() => setStatusFilter('frozen')}>
                            موقوف
                        </HqChip>
                        <HqChip active={statusFilter === 'locked'} onClick={() => setStatusFilter('locked')}>
                            مقفل الدخول
                        </HqChip>
                        <HqChip active={statusFilter === 'deleted'} onClick={() => setStatusFilter('deleted')}>
                            محذوف
                        </HqChip>
                        <HqChip active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
                            قيد التدقيق
                        </HqChip>
                        <HqChip active={statusFilter === 'unsubmitted'} onClick={() => setStatusFilter('unsubmitted')}>
                            بلا طلب
                        </HqChip>
                        <HqChip active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')}>
                            مرفوض
                        </HqChip>
                        <HqChip
                            active={statusFilter === 'name_mismatch'}
                            onClick={() => setStatusFilter('name_mismatch')}
                        >
                            اختلاف الاسم
                        </HqChip>
                    </HqChipRow>
                </div>
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الدور</p>
                    <HqChipRow>
                        <HqChip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                            كل الأدوار
                        </HqChip>
                        <HqChip active={roleFilter === 'lawyer'} onClick={() => setRoleFilter('lawyer')}>
                            محامي
                        </HqChip>
                        <HqChip active={roleFilter === 'moderator'} onClick={() => setRoleFilter('moderator')}>
                            مشرف
                        </HqChip>
                        <HqChip active={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')}>
                            إدارة
                        </HqChip>
                    </HqChipRow>
                </div>
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">تاريخ الإنشاء</p>
                    <HqChipRow>
                        <HqChip active={createdFilter === 'all'} onClick={() => setCreatedFilter('all')}>
                            كل التواريخ
                        </HqChip>
                        <HqChip active={createdFilter === '24h'} onClick={() => setCreatedFilter('24h')}>
                            آخر 24 ساعة
                        </HqChip>
                        <HqChip active={createdFilter === '7d'} onClick={() => setCreatedFilter('7d')}>
                            آخر 7 أيام
                        </HqChip>
                    </HqChipRow>
                </div>
                <div className="hq-dir-search">
                    <div className="hq-dir-search-field">
                        <Search className="hq-dir-search-icon" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value.slice(0, HQ_USER_QUERY_MAX))}
                            placeholder="ابحث عن اسم، بريد، هاتف، محافظة، أو دور..."
                            className="hq-dir-search-input"
                            aria-label="بحث في المستخدمين"
                            enterKeyHint="search"
                            autoComplete="off"
                        />
                    </div>
                    <p className="hq-ops-stamp">
                        {visible.length} ظاهر
                        {filtered.length !== users.length ? ` · ${filtered.length} مطابق` : ''}
                        {pageCount > 1 || hasMore || dirPage > 0
                            ? ` · صفحة ${safePage + 1}${serverPaged && !matchedExact ? '' : ` من ${pageCount}`}`
                            : ''}
                    </p>
                </div>
            </div>

            {renderCapped ? (
                <p className="hq-ops-note" role="status">
                    أكثر من {HQ_DIRECTORY_RENDER_CAP} مطابقاً — تنقّل بالصفحات أو ضيّق البحث.
                </p>
            ) : null}

            <HqFold
                id="notify"
                kicker="البث"
                title="إشعار النظام"
                summary="للكل أو لمحددين — لا يزاحم الدليل"
                hint="يظهر في تبويب «النظام» لدى المستلم. التجميد والحظر يرسلان إشعاراً تلقائياً."
                defaultOpen={false}
                testId="hq-system-notify-fold"
            >
                <HqSystemNotifyComposer
                    users={users}
                    query={query}
                    busy={mutating || Boolean(mutatingUserId)}
                    onSend={async (input) => {
                        const result = await sendSystemNotice(input);
                        if (!result || result.sent <= 0) {
                            SmartToast.error('تعذّر إرسال إشعار النظام');
                            return false;
                        }
                        const failedNote = result.failed > 0 ? ` تعذّر ${result.failed}.` : '';
                        const capNote = result.capped ? ' القائمة كانت مقطوعة عند الحد.' : '';
                        SmartToast.success(`أُرسل إشعار النظام إلى ${result.sent} حساب.${failedNote}${capNote}`);
                        return true;
                    }}
                />
            </HqFold>

            {error ? (
                <HqStateBlock
                    kind="error"
                    title={error}
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void refresh()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : null}

            {skipFetch && users.length === 0 ? (
                <HqStateBlock kind="loading" title="جاري تحميل المقر…" />
            ) : loading && users.length === 0 ? (
                <HqStateBlock kind="loading" title="جاري تحميل المقر…" />
            ) : !loading && filtered.length === 0 ? (
                <HqStateBlock
                    kind="empty"
                    title={users.length === 0 ? 'لا يوجد مستخدمون في الدليل' : 'لا يوجد مستخدمون مطابقون'}
                    action={
                        users.length > 0 ? (
                            <HqGhostButton
                                className="mt-3"
                                data-testid="hq-dir-clear-filters"
                                onClick={() => {
                                    setQuery('');
                                    setStatusFilter('all');
                                    setRoleFilter('all');
                                    setCreatedFilter('all');
                                }}
                            >
                                إظهار كل الحسابات
                            </HqGhostButton>
                        ) : (
                            <HqGhostButton className="mt-3" onClick={() => void refresh()}>
                                تحديث
                            </HqGhostButton>
                        )
                    }
                />
            ) : (
                <>
                    {selectedUser && !visible.some((u) => u.id === selectedUser.id)
                        ? renderDossier(selectedUser)
                        : null}
                    {pageCount > 1 || hasMore || dirPage > 0 ? (
                        <div className="hq-ops-meta" data-testid="hq-dir-pager">
                            <HqGhostButton
                                disabled={safePage <= 0}
                                onClick={() => setDirPage((p) => Math.max(0, p - 1))}
                            >
                                السابق
                            </HqGhostButton>
                            <p className="hq-ops-stamp">
                                {safePage + 1}
                                {serverPaged && !matchedExact ? '' : ` / ${pageCount}`}
                            </p>
                            <HqGhostButton
                                disabled={
                                    serverPaged
                                        ? !hasMore && safePage + 1 >= pageCount
                                        : safePage >= pageCount - 1
                                }
                                onClick={() => setDirPage((p) => p + 1)}
                            >
                                التالي
                            </HqGhostButton>
                        </div>
                    ) : null}
                    <div className="hq-dir-list" role="list" aria-label="دليل الحسابات" data-testid="hq-dir-list">
                        {visible.map((user) => (
                            <div
                                key={user.id}
                                className={cn('hq-dir-item', selectedUserId === user.id && 'hq-dir-item-open')}
                            >
                                <HeadquartersUserRow
                                    user={user}
                                    busy={mutating || mutatingUserId === user.id}
                                    locked={isHqUserMutationLocked(user)}
                                    open={selectedUserId === user.id}
                                    pickingFreeze={freezePickerUserId === user.id}
                                    onOpen={() =>
                                        setSelectedUserId((prev) => (prev === user.id ? null : user.id))
                                    }
                                    onRoleChange={(next) => void onRoleChange(user, next)}
                                    onFreeze={(hours) => void onFreeze(user, hours)}
                                    onUnfreeze={() => void onUnfreeze(user)}
                                    onToggleFreezePicker={() =>
                                        setFreezePickerUserId((prev) => (prev === user.id ? null : user.id))
                                    }
                                    onTogglePublicBadge={(shown) => void onTogglePublicBadge(user, shown)}
                                />
                                {selectedUser && selectedUserId === user.id
                                    ? renderDossier(selectedUser)
                                    : null}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default HeadquartersPanel;
