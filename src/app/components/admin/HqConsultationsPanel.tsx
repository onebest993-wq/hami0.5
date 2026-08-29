import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/app/components/ui/utils';
import { HqChip, HqChipRow, HqGhostButton, HqSectionHeader, HqStateBlock } from '@/app/components/admin/hqChrome';
import { hqActionErrorMessage } from '@/app/components/admin/hqActionError';
import {
    sanitizeHqConsultationRows,
    type HqConsultationRow,
} from '@/app/components/admin/hqConsultationRows';
import type { HqForumPostKind } from '@/app/components/admin/hqJump';
import { useHqLiveReload } from '@/app/components/admin/useHqLiveReload';
import { useHqPanelLoad, hqPanelFailDetail } from '@/app/components/admin/useHqPanelLoad';
import { dispatchHqStatusRefresh } from '@/app/components/admin/hqStatusEvents';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { SmartToast } from '@/app/components/ui/SmartToast';

type ReplyFilter = 'all' | 'replied' | 'unreplied';

const FILTER_LABEL: Record<ReplyFilter, string> = {
    all: 'الكل',
    replied: 'تم الرد',
    unreplied: 'لم يتم الرد',
};

const POST_KIND_LABEL: Record<HqForumPostKind, string> = {
    all: 'كل المنشورات',
    pinned: 'مثبت',
    locked: 'مقفل',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * مراقبة المنشورات العامة في المنتدى عبر BFF المقر (تثبيت / قفل / حذف).
 * ليست سوق استشارات — المنشورات من forum_posts حيث group_id فارغ.
 */
export function HqConsultationsPanel({
    embedded = false,
    initialPostKind = 'all',
}: {
    embedded?: boolean;
    initialPostKind?: HqForumPostKind;
}) {
    const [consultations, setConsultations] = useState<HqConsultationRow[]>([]);
    const [queueCapped, setQueueCapped] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');
    const [postKind, setPostKind] = useState<HqForumPostKind>(initialPostKind);
    const busyRef = useRef<string | null>(null);

    useEffect(() => {
        setPostKind(initialPostKind);
    }, [initialPostKind]);

    const work = useCallback(async (signal: AbortSignal) => {
        setLoadError(false);
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                consultations?: unknown;
                capped?: boolean;
            }>('/api/admin/consultations', { method: 'GET', signal });
            if (signal.aborted) return;
            if (!data?.ok) {
                setConsultations([]);
                setQueueCapped(false);
                setLoadError(true);
                return;
            }
            setConsultations(sanitizeHqConsultationRows(data.consultations));
            setQueueCapped(Boolean(data.capped));
        } catch (error) {
            if (signal.aborted || isHqAbortError(error, signal)) return;
            setConsultations([]);
            setQueueCapped(false);
            setLoadError(true);
        }
    }, []);

    const { loading, failed, failKind, reload } = useHqPanelLoad(work);
    useHqLiveReload(reload);

    const onMutate = async (postId: string, action: 'delete' | 'pin' | 'unpin' | 'lock' | 'unlock') => {
        if (!UUID_RE.test(postId) || busyRef.current) return;
        busyRef.current = postId;
        setBusyId(postId);
        try {
            await hqMutatingFetch('/api/admin/consultations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, action }),
            });
            dispatchHqStatusRefresh();
            if (action === 'delete') {
                setConsultations((prev) => prev.filter((row) => row.id !== postId));
                SmartToast.success('تم حذف المنشور');
                return;
            }
            setConsultations((prev) =>
                prev.map((row) =>
                    row.id !== postId
                        ? row
                        : {
                              ...row,
                              pinned: action === 'pin' ? true : action === 'unpin' ? false : row.pinned,
                              locked: action === 'lock' ? true : action === 'unlock' ? false : row.locked,
                          },
                ),
            );
            SmartToast.success('تم تحديث المنشور');
        } catch (error) {
            SmartToast.error(hqActionErrorMessage(error, 'تعذّر تنفيذ الإجراء'));
        } finally {
            busyRef.current = null;
            setBusyId(null);
        }
    };

    const onDelete = async (postId: string) => {
        await onMutate(postId, 'delete');
    };

    const visible = consultations.filter((post) => {
        if (postKind === 'pinned' && !post.pinned) return false;
        if (postKind === 'locked' && !post.locked) return false;
        if (replyFilter === 'replied') return post.replyCount > 0;
        if (replyFilter === 'unreplied') return post.replyCount === 0;
        return true;
    });

    return (
        <div className="space-y-6">
            {embedded ? null : (
                <HqSectionHeader
                    kicker="المحتوى"
                    title="المنشورات العامة"
                    action={<HqGhostButton onClick={() => void reload()}>تحديث</HqGhostButton>}
                />
            )}

            <HqChipRow>
                {(Object.keys(FILTER_LABEL) as ReplyFilter[]).map((key) => (
                    <HqChip key={key} active={replyFilter === key} onClick={() => setReplyFilter(key)}>
                        {FILTER_LABEL[key]}
                    </HqChip>
                ))}
                {(Object.keys(POST_KIND_LABEL) as HqForumPostKind[]).map((key) => (
                    <HqChip key={key} active={postKind === key} onClick={() => setPostKind(key)}>
                        {POST_KIND_LABEL[key]}
                    </HqChip>
                ))}
                {embedded ? (
                    <HqGhostButton onClick={() => void reload()}>تحديث</HqGhostButton>
                ) : null}
            </HqChipRow>
            {queueCapped ? (
                <p className="hq-ops-stamp">القائمة مقصوصة عند سقف المقر — الأقدم قد لا يظهر.</p>
            ) : null}

            <div className="space-y-3">
                {loading ? (
                    <HqStateBlock kind="loading" title="جاري التحميل..." />
                ) : loadError || failed ? (
                    <HqStateBlock
                        kind="error"
                        title="تعذّر تحميل المنشورات"
                        detail={hqPanelFailDetail(failKind)}
                        action={
                            <HqGhostButton className="mt-3" onClick={() => void reload()}>
                                إعادة المحاولة
                            </HqGhostButton>
                        }
                    />
                ) : visible.length === 0 ? (
                    <HqStateBlock kind="empty" title="لا توجد منشورات عامة حالياً" />
                ) : (
                    visible.map((post) => (
                        <article key={post.id} className="hq-panel p-4 flex flex-col gap-2">
                            <div className="flex justify-between gap-3">
                                <span className="text-white font-bold text-sm">{post.name}</span>
                                <span className="text-xs text-white/40 shrink-0">{post.time}</span>
                            </div>
                            <p className="text-white/75 text-sm">{post.content}</p>

                            <div className="flex flex-wrap items-center justify-between gap-2 mt-1 pt-2 border-t border-white/5">
                                <span
                                    className={cn(
                                        'text-[10px] px-2 py-0.5 rounded',
                                        post.replyCount > 0
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500',
                                    )}
                                >
                                    {post.replyCount > 0
                                        ? `تم الرد (${post.replyCount})`
                                        : 'لم يتم الرد'}
                                    {post.pinned ? ' · مثبت' : ''}
                                    {post.locked ? ' · مقفل' : ''}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    <button
                                        type="button"
                                        className="text-white/60 text-xs hover:text-white disabled:opacity-50 min-h-11 px-2"
                                        disabled={busyId === post.id}
                                        onClick={() => void onMutate(post.id, post.pinned ? 'unpin' : 'pin')}
                                    >
                                        {post.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-white/60 text-xs hover:text-white disabled:opacity-50 min-h-11 px-2"
                                        onClick={() => void onMutate(post.id, post.locked ? 'unlock' : 'lock')}
                                        disabled={busyId === post.id}
                                    >
                                        {post.locked ? 'فتح النقاش' : 'قفل النقاش'}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-red-400 text-xs hover:text-red-300 disabled:opacity-50 min-h-11 px-2"
                                        disabled={busyId === post.id}
                                        onClick={() => void onDelete(post.id)}
                                    >
                                        حذف المنشور
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
}
