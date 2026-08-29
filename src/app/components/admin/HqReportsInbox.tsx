import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import { HqChip, HqChipRow, HqGhostButton, HqSectionHeader, HqStateBlock } from '@/app/components/admin/hqChrome';
import type { HqReportFocus } from '@/app/components/admin/hqJump';
import { formatHqDate } from '@/app/components/admin/hqFormat';
import { dispatchHqStatusRefresh } from '@/app/components/admin/hqStatusEvents';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { useHqPanelLoad, hqPanelFailDetail } from '@/app/components/admin/useHqPanelLoad';
import {
    sanitizeHqCommentReportRows,
    sanitizeHqPostReportRows,
    type HqCommentReportRow,
    type HqPostReportRow,
} from '@/app/components/admin/hqReportRows';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import { SmartToast } from '@/app/components/ui/SmartToast';

function actionErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof SecureFetchError) {
        if (error.status === 429) return 'تجاوزت حد عمليات المقر — حاول لاحقاً';
        try {
            const parsed = JSON.parse(error.bodyText) as { error?: unknown };
            const msg = String(parsed.error ?? '').trim();
            if (msg) return msg;
        } catch {
            /* نص غير JSON */
        }
    }
    return fallback;
}

export function HqReportsInbox({ initialFocus = 'all' }: { initialFocus?: HqReportFocus }) {
    const [reportsData, setReportsData] = useState<HqPostReportRow[]>([]);
    const [commentReports, setCommentReports] = useState<HqCommentReportRow[]>([]);
    const [focus, setFocus] = useState<HqReportFocus>(initialFocus);
    const [loadError, setLoadError] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [queueCapped, setQueueCapped] = useState(false);
    const busyRef = useRef<string | null>(null);

    const work = useCallback(async (signal: AbortSignal) => {
        setLoadError(false);
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                reports?: unknown;
                commentReports?: unknown;
                capped?: boolean;
            }>('/api/forum/reports', { method: 'GET', signal });
            if (signal.aborted) return;
            if (!data?.ok) {
                setReportsData([]);
                setCommentReports([]);
                setQueueCapped(false);
                setLoadError(true);
                return;
            }
            setReportsData(sanitizeHqPostReportRows(data.reports));
            setCommentReports(sanitizeHqCommentReportRows(data.commentReports));
            setQueueCapped(Boolean(data.capped));
        } catch (error) {
            if (signal.aborted || isHqAbortError(error, signal)) return;
            setReportsData([]);
            setCommentReports([]);
            setQueueCapped(false);
            setLoadError(true);
        }
    }, []);

    const { loading, failed, failKind, reload } = useHqPanelLoad(work);
    useHqLiveReload(reload);

    useEffect(() => {
        setFocus(initialFocus);
    }, [initialFocus]);

    const runAction = async (busyKey: string, fallback: string, request: () => Promise<unknown>, success: string) => {
        if (busyRef.current) return;
        busyRef.current = busyKey;
        setActionLoading(busyKey);
        try {
            await request();
            SmartToast.success(success);
            await reload();
            dispatchHqStatusRefresh();
        } catch (error) {
            SmartToast.error(actionErrorMessage(error, fallback));
        } finally {
            busyRef.current = null;
            setActionLoading(null);
        }
    };

    const handleDismiss = (reportId: string) =>
        void runAction(
            reportId,
            'تعذّر تجاهل البلاغ',
            () =>
                hqMutatingFetch('/api/forum/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'dismiss', reportId }),
                }),
            'تم تجاهل البلاغ',
        );

    const handleDeletePost = (postId: string, reportId: string) =>
        void runAction(
            reportId,
            'تعذّر حذف المنشور',
            () =>
                hqMutatingFetch('/api/forum/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_post', postId, reportId }),
                }),
            'تم حذف المنشور',
        );

    const handleDismissComment = (reportId: string) =>
        void runAction(
            reportId,
            'تعذّر تجاهل بلاغ التعليق',
            () =>
                hqMutatingFetch('/api/forum/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'dismiss_comment', reportId }),
                }),
            'تم تجاهل بلاغ التعليق',
        );

    const handleDeleteComment = (commentId: string, reportId: string) =>
        void runAction(
            reportId,
            'تعذّر حذف التعليق',
            () =>
                hqMutatingFetch('/api/forum/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_comment', commentId, reportId }),
                }),
            'تم حذف التعليق',
        );

    const showPosts = focus !== 'comments';
    const showComments = focus !== 'posts';
    const visiblePosts = showPosts ? reportsData : [];
    const visibleComments = showComments ? commentReports : [];
    const visibleCount = visiblePosts.length + visibleComments.length;
    const totalCount = reportsData.length + commentReports.length;

    return (
        <div className="space-y-6">
            <HqSectionHeader
                kicker="المحتوى"
                title="صندوق البلاغات"
                action={
                    <div className="flex items-center gap-2">
                        {totalCount > 0 ? (
                            <span className="tabular-nums rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                {totalCount}
                            </span>
                        ) : null}
                        <HqGhostButton
                            onClick={() => void reload()}
                            title={queueCapped ? 'القائمة مقصوصة عند سقف المقر' : undefined}
                        >
                            تحديث
                        </HqGhostButton>
                    </div>
                }
            />
            {queueCapped ? (
                <p className="hq-ops-stamp">القائمة مقصوصة عند سقف المقر — الأقدم قد لا يظهر.</p>
            ) : null}

            <HqChipRow>
                <HqChip active={focus === 'all'} onClick={() => setFocus('all')}>
                    الكل
                </HqChip>
                <HqChip active={focus === 'posts'} onClick={() => setFocus('posts')}>
                    منشورات
                </HqChip>
                <HqChip active={focus === 'comments'} onClick={() => setFocus('comments')}>
                    تعليقات
                </HqChip>
            </HqChipRow>

            {loading ? (
                <HqStateBlock kind="loading" title="جاري تحميل البلاغات..." />
            ) : loadError || failed ? (
                <HqStateBlock
                    kind="error"
                    title="تعذّر تحميل البلاغات"
                    detail={hqPanelFailDetail(failKind)}
                    action={
                        <HqGhostButton className="mt-3" onClick={() => void reload()}>
                            إعادة المحاولة
                        </HqGhostButton>
                    }
                />
            ) : totalCount === 0 ? (
                <HqStateBlock
                    kind="empty"
                    title="لا توجد بلاغات جديدة"
                    detail="جميع المنشورات والتعليقات آمنة حتى الآن"
                />
            ) : visibleCount === 0 ? (
                <HqStateBlock kind="empty" title="لا توجد بلاغات في هذه التصفية" />
            ) : (
                <div className="space-y-6">
                    {visiblePosts.length > 0 ? (
                        <div className="space-y-3">
                            {visiblePosts.map((report) => (
                                <article key={report.id} className="hq-panel border-r-4 border-r-red-500/50 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-white">
                                                {report.post?.title || 'منشور بدون عنوان'}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-xs text-white/50">
                                                {report.post?.content || 'المحتوى محذوف أو غير متاح'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                                                <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-400">
                                                    {report.reason}
                                                </span>
                                                <span>{formatHqDate(report.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePost(report.postId, report.id)}
                                                disabled={Boolean(actionLoading)}
                                                className="flex min-h-11 items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/20 px-3 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                                            >
                                                <Trash2 className="h-3 w-3" /> حذف المنشور
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDismiss(report.id)}
                                                disabled={Boolean(actionLoading)}
                                                className="flex min-h-11 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                                            >
                                                <XCircle className="h-3 w-3" /> تجاهل
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                    {visibleComments.length > 0 ? (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-white">بلاغات التعليقات</h3>
                            {visibleComments.map((report) => (
                                <article key={report.id} className="hq-panel border-r-4 border-r-amber-500/50 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-white">تعليق مبلغ</p>
                                            <p className="mt-1 line-clamp-2 text-xs text-white/50">
                                                {report.snippet || 'المحتوى محذوف أو غير متاح'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                                                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-400">
                                                    {report.reason}
                                                </span>
                                                <span>{formatHqDate(report.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteComment(report.commentId, report.id)}
                                                disabled={Boolean(actionLoading)}
                                                className="flex min-h-11 items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/20 px-3 text-xs font-bold text-red-400 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-3 w-3" /> حذف التعليق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDismissComment(report.id)}
                                                disabled={Boolean(actionLoading)}
                                                className="flex min-h-11 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/60 disabled:opacity-50"
                                            >
                                                <XCircle className="h-3 w-3" /> تجاهل
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
