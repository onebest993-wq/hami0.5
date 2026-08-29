import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { Search } from '@/app/components/ui/icons/Search';
import { HqChip, HqChipRow, HqGhostButton, HqMetric, HqStateBlock } from '@/app/components/admin/hqChrome';
import { dispatchHqVerificationChanged } from '@/app/components/admin/hqStatusEvents';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { useHqPanelLoad, hqPanelFailDetail } from '@/app/components/admin/useHqPanelLoad';
import { HqVerificationDocPeek } from '@/app/components/admin/HqVerificationDocPeek';
import { HqVerificationRequestCard } from '@/app/components/admin/HqVerificationRequestCard';
import {
    countHqVerificationByStatus,
    filterHqVerificationRows,
    hqVerificationCanApprove,
    hqVerificationNameMismatches,
    matchesHqVerificationQuery,
    sanitizeHqVerificationQueueRow,
    type HqVerificationQueueRow,
} from '@/app/components/admin/hqVerificationQueue';
import type { HqVerificationFilter } from '@/app/components/admin/hqJump';
import { HQ_USER_QUERY_MAX } from '@/app/components/admin/hqUserFilters';
import { cn } from '@/app/components/ui/utils';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    fetchLawyerVerifications,
    patchLawyerVerificationStatus,
} from '@/app/services/auth/lawyerVerificationRemote';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';

export function AdminLawyerVerificationRequests({
    onInspectUser,
    initialStatusFilter = 'pending',
}: {
    onInspectUser?: (userId: string) => void;
    initialStatusFilter?: HqVerificationFilter;
}) {
    const [rows, setRows] = useState<HqVerificationQueueRow[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<HqVerificationFilter>(initialStatusFilter);
    const [query, setQuery] = useState('');
    const [mismatchOnly, setMismatchOnly] = useState(false);
    const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
    const [rejectOpenId, setRejectOpenId] = useState<string | null>(null);
    const [peekUserId, setPeekUserId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [queueCapped, setQueueCapped] = useState(false);
    const busyRef = useRef<string | null>(null);

    const work = useCallback(async (signal: AbortSignal) => {
        setLoadError(false);
        try {
            const records = await fetchLawyerVerifications('all', signal);
            if (signal.aborted) return;
            setQueueCapped(Boolean(records.capped));
            setRows(
                records.flatMap((raw) => {
                    if (!raw || typeof raw !== 'object') return [];
                    const row = sanitizeHqVerificationQueueRow(raw);
                    return row ? [row] : [];
                }),
            );
        } catch (error) {
            if (signal.aborted || isHqAbortError(error, signal)) return;
            setRows([]);
            setQueueCapped(false);
            setLoadError(true);
            SmartToast.error('تعذّر جلب طلبات التوثيق — تأكد من صلاحية الإدارة وBFF');
        }
    }, []);

    const { loading, failed, failKind, reload } = useHqPanelLoad(work);
    useHqLiveReload(reload);

    useEffect(() => {
        setStatusFilter(initialStatusFilter);
    }, [initialStatusFilter]);

    const decide = async (userId: string, status: 'active' | 'rejected') => {
        if (busyRef.current) return;
        const row = rows.find((item) => item.userId === userId);
        if (status === 'active' && (!row || !hqVerificationCanApprove(row))) {
            SmartToast.warning('لا يمكن الاعتماد بدون وجه وظهر هوية النقابة');
            return;
        }
        const reason = (rejectDraft[userId] ?? '').trim();
        if (status === 'rejected' && reason.length < 4) {
            SmartToast.warning('أدخل سبب الرفض (أربعة أحرف على الأقل)');
            return;
        }
        busyRef.current = userId;
        setBusyId(userId);
        try {
            const result = await patchLawyerVerificationStatus({
                userId,
                status,
                rejectionReason: status === 'rejected' ? reason.slice(0, 240) : undefined,
            });
            if (!result.ok) {
                SmartToast.error(result.error);
                return;
            }
            dispatchHqVerificationChanged(userId, status);
            setRows((prev) =>
                prev.map((item) =>
                    item.userId === userId
                        ? {
                              ...item,
                              status,
                              rejectionReason: status === 'rejected' ? reason.slice(0, 240) : '',
                          }
                        : item,
                ),
            );
            SmartToast.success(status === 'active' ? 'تم اعتماد المحامي' : 'تم رفض الطلب');
            setRejectOpenId(null);
            await reload();
        } finally {
            busyRef.current = null;
            setBusyId(null);
        }
    };

    const pendingCount = countHqVerificationByStatus(rows, 'pending');
    const activeCount = countHqVerificationByStatus(rows, 'active');
    const rejectedCount = countHqVerificationByStatus(rows, 'rejected');
    const mismatchCount = rows.filter(hqVerificationNameMismatches).length;
    const visible = useMemo(() => {
        return filterHqVerificationRows(rows, statusFilter)
            .filter((row) => matchesHqVerificationQuery(row, query))
            .filter((row) => (mismatchOnly ? hqVerificationNameMismatches(row) : true));
    }, [rows, statusFilter, query, mismatchOnly]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await reload();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div dir="rtl" className="hq-ops" data-testid="hq-verification-queue">
            <div className="hq-ops-head">
                <div className="min-w-0">
                    <p className="hq-kicker">الحسابات</p>
                    <h2 className="hq-title">طلبات التوثيق</h2>
                </div>
                <div className="hq-ops-meta">
                    {pendingCount > 0 ? (
                        <button
                            type="button"
                            className="hq-ops-pill hq-ops-pill-warn"
                            onClick={() => setStatusFilter('pending')}
                        >
                            {pendingCount} قيد التدقيق
                        </button>
                    ) : null}
                    <p className="hq-ops-stamp">
                        {visible.length === rows.length
                            ? `${rows.length} طلب محمّل`
                            : `${visible.length} ظاهر من ${rows.length}`}
                        {queueCapped ? ' — القائمة مقصوصة عند سقف المقر' : ''}
                    </p>
                    <HqGhostButton
                        onClick={() => void onRefresh()}
                        disabled={loading || refreshing}
                        aria-busy={loading || refreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', (loading || refreshing) && 'animate-spin')} aria-hidden />
                        تحديث
                    </HqGhostButton>
                </div>
            </div>

            <div className="hq-ops-grid hq-ops-grid-3">
                <HqMetric
                    label="قيد التدقيق"
                    value={pendingCount}
                    hint="نفس تصفية المستخدمين — طلب مرفوع بلا قرار"
                    tone={pendingCount > 0 ? 'warn' : 'ok'}
                    onClick={() => setStatusFilter('pending')}
                />
                <HqMetric
                    label="معتمد"
                    value={activeCount}
                    hint="شارة الدليل «معتمد» — ليست علامة الصح على الصورة"
                    tone="ok"
                    onClick={() => setStatusFilter('active')}
                />
                <HqMetric
                    label="مرفوض"
                    value={rejectedCount}
                    hint="مع سبب محفوظ"
                    tone="danger"
                    onClick={() => setStatusFilter('rejected')}
                />
            </div>

            <div className="hq-panel hq-dir-board">
                <div className="hq-ops-cluster">
                    <p className="hq-ops-cluster-title">الحالة</p>
                    <HqChipRow>
                        <HqChip active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>
                            قيد التدقيق ({pendingCount})
                        </HqChip>
                        <HqChip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                            معتمد ({activeCount})
                        </HqChip>
                        <HqChip active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')}>
                            مرفوض ({rejectedCount})
                        </HqChip>
                        <HqChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                            الكل ({rows.length})
                        </HqChip>
                        {mismatchCount > 0 ? (
                            <HqChip
                                active={mismatchOnly}
                                onClick={() => setMismatchOnly((prev) => !prev)}
                            >
                                اختلاف الاسم ({mismatchCount})
                            </HqChip>
                        ) : null}
                    </HqChipRow>
                </div>
                <div className="hq-dir-search">
                    <div className="hq-dir-search-field">
                        <Search className="hq-dir-search-icon" aria-hidden />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value.slice(0, HQ_USER_QUERY_MAX))}
                            placeholder="ابحث عن اسم، بريد، هاتف، محافظة، أو غرفة..."
                            className="hq-dir-search-input"
                            aria-label="بحث في طلبات التوثيق"
                            enterKeyHint="search"
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <HqStateBlock kind="loading" title="جاري التحميل…" />
            ) : loadError || failed ? (
                <HqStateBlock
                    kind="error"
                    title="تعذّر تحميل طابور التوثيق. حدّث الصفحة بعد التأكد من الجلسة والجهاز الموثّق."
                    detail={hqPanelFailDetail(failKind)}
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void onRefresh()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : visible.length === 0 ? (
                <HqStateBlock
                    kind="empty"
                    title={
                        query.trim()
                            ? 'لا مطابقات للبحث الحالي.'
                            : statusFilter === 'pending'
                              ? 'لا توجد طلبات قيد التدقيق حالياً.'
                              : 'لا سجلات في هذه التصفية.'
                    }
                    detail="طلب بلا هوية يظهر هنا ولا يُقبل حتى يُرفق الوجه والظهر. إن غاب الحساب تماماً فابحث في المستخدمين عن «بلا طلب»."
                />
            ) : (
                <div className="hq-verify-list">
                    {visible.map((lawyer) => (
                        <HqVerificationRequestCard
                            key={lawyer.userId}
                            lawyer={lawyer}
                            busy={busyId === lawyer.userId}
                            rejectOpen={rejectOpenId === lawyer.userId}
                            rejectDraft={rejectDraft[lawyer.userId] ?? ''}
                            onRejectDraft={(value) =>
                                setRejectDraft((prev) => ({ ...prev, [lawyer.userId]: value }))
                            }
                            onToggleReject={() =>
                                setRejectOpenId((current) => (current === lawyer.userId ? null : lawyer.userId))
                            }
                            onApprove={() => void decide(lawyer.userId, 'active')}
                            onReject={() => void decide(lawyer.userId, 'rejected')}
                            onInspect={
                                onInspectUser
                                    ? () => {
                                          dispatchHqVerificationChanged(lawyer.userId, lawyer.status);
                                          onInspectUser(lawyer.userId);
                                      }
                                    : undefined
                            }
                            onPeekDocs={() => setPeekUserId(lawyer.userId)}
                        />
                    ))}
                </div>
            )}
            {peekUserId ? (
                <HqVerificationDocPeek userId={peekUserId} onClose={() => setPeekUserId(null)} />
            ) : null}
        </div>
    );
}
