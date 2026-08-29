import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from '@/app/components/ui/icons/CheckCircle2';
import { HandHelping } from '@/app/components/ui/icons/HandHelping';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { MessageSquarePlus } from '@/app/components/ui/icons/MessageSquarePlus';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { TaskHelpApiService } from '@/app/services/taskHelp/taskHelpApiService';
import { clampTaskText, MAX_HELP_NOTE_LENGTH } from '@/app/services/tasks/taskInputGuard';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { TasksManagerDialogContent } from './TasksManagerDialogContent';
import {
    TASKS_BTN_BRONZE,
    TASKS_BTN_GHOST,
    TASKS_BTN_PRIMARY,
    TASKS_DIALOG_CONTENT_WIDE,
    TASKS_DIALOG_DESC,
    TASKS_DIALOG_SUBPANEL,
    TASKS_INPUT,
} from './tasksBoucleTheme';

function statusLabel(status: TaskHelpRequest['collaborationStatus']): string {
    switch (status) {
        case 'PENDING':
            return 'بانتظار قبول';
        case 'ACCEPTED':
            return 'قيد المساعدة';
        case 'AWAITING_OWNER_REVIEW':
            return 'بانتظار مراجعة المالك';
        case 'COMPLETED':
            return 'مكتمل';
        case 'REJECTED':
            return 'مرفوض';
        default:
            return status;
    }
}

export type TaskHelpInboxPanelProps = {
    open: boolean;
    userId: string | null;
    userName?: string;
    onClose: () => void;
    onAccepted?: (request: TaskHelpRequest) => void;
    onUpdated?: (request: TaskHelpRequest) => void;
};

export function TaskHelpInboxPanel({
    open,
    userId,
    userName,
    onClose,
    onAccepted,
    onUpdated,
}: TaskHelpInboxPanelProps) {
    const [rows, setRows] = useState<TaskHelpRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const list = await TaskHelpApiService.list(userId);
            setRows(list);
        } catch {
            setError('تعذر تحميل طلبات المساعدة');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (open && userId) void refresh();
    }, [open, userId, refresh]);

    const handleAccept = useCallback(
        async (req: TaskHelpRequest) => {
            if (!userId) return;
            setBusyId(req.id);
            setError(null);
            try {
                const accepted = await TaskHelpApiService.accept(req.id, userId, userName);
                onAccepted?.(accepted);
                await refresh();
            } catch (err) {
                const code = (err as { code?: string })?.code;
                setError(
                    code === 'ALREADY_ACCEPTED'
                        ? 'سبق أن قبل زميل آخر هذا الطلب'
                        : 'تعذر قبول الطلب',
                );
                await refresh();
            } finally {
                setBusyId(null);
            }
        },
        [userId, userName, onAccepted, refresh],
    );

    const handleNote = useCallback(
        async (req: TaskHelpRequest) => {
            if (!userId) return;
            const text = clampTaskText((noteDrafts[req.id] ?? '').trim(), MAX_HELP_NOTE_LENGTH);
            if (!text) return;
            setBusyId(req.id);
            try {
                const updated = await TaskHelpApiService.addNote(req.id, userId, text, userName);
                setNoteDrafts((prev) => ({ ...prev, [req.id]: '' }));
                onUpdated?.(updated);
                await refresh();
            } catch {
                setError('تعذر إرسال الملاحظة');
            } finally {
                setBusyId(null);
            }
        },
        [userId, userName, noteDrafts, onUpdated, refresh],
    );

    const handleHelperDone = useCallback(
        async (req: TaskHelpRequest) => {
            if (!userId) return;
            setBusyId(req.id);
            try {
                const updated = await TaskHelpApiService.markHelperDone(req.id, userId);
                onUpdated?.(updated);
                await refresh();
            } catch {
                setError('تعذر تحديث الإنجاز');
            } finally {
                setBusyId(null);
            }
        },
        [userId, onUpdated, refresh],
    );

    const handleOwnerConfirm = useCallback(
        async (req: TaskHelpRequest) => {
            if (!userId) return;
            setBusyId(req.id);
            try {
                const updated = await TaskHelpApiService.confirmOwnerReview(req.id, userId);
                onUpdated?.(updated);
                await refresh();
            } catch {
                setError('تعذر تأكيد المراجعة');
            } finally {
                setBusyId(null);
            }
        },
        [userId, onUpdated, refresh],
    );

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT_WIDE} instant>
                <DialogHeader className="text-right space-y-2">
                    <DialogTitle className="text-[#F4F4F5] text-base font-extrabold flex flex-row-reverse items-center gap-2 justify-start">
                        <HandHelping className="size-4 text-[#E6C673] shrink-0" aria-hidden />
                        صندوق طلبات المساعدة
                    </DialogTitle>
                    <DialogDescription className={`${TASKS_DIALOG_DESC} !text-xs`}>
                        وارد وصادر — قبول أول زميل يقفل الطلب العام فوراً
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-right py-2" data-testid="task-help-inbox">
                    {loading ? (
                        <p className="text-xs text-[#F4F4F5]/55 flex flex-row-reverse items-center gap-2">
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            جاري التحميل…
                        </p>
                    ) : null}
                    {error ? (
                        <p className="text-xs font-bold text-rose-300" role="alert">
                            {error}
                        </p>
                    ) : null}
                    {!loading && rows.length === 0 ? (
                        <p className="text-sm text-[#F4F4F5]/55">لا توجد طلبات مساعدة حالياً.</p>
                    ) : null}

                    <ul className="space-y-3">
                        {rows.map((req) => {
                            const isOwner = userId === req.requesterId;
                            const isAssignee = userId === req.assigneeId;
                            const canAccept =
                                !isOwner &&
                                req.collaborationStatus === 'PENDING' &&
                                (req.shareScope === 'PUBLIC_FORUM' ||
                                    req.targetColleagueId === userId);
                            const busy = busyId === req.id;

                            return (
                                <li
                                    key={req.id}
                                    className={`${TASKS_DIALOG_SUBPANEL} !p-3`}
                                    data-testid={`task-help-inbox-item-${req.id}`}
                                >
                                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                                        <p className="text-sm font-extrabold text-[#F4F4F5] leading-snug">
                                            {req.title}
                                        </p>
                                        <span className="text-[10px] font-bold text-[#F4F4F5]/50 shrink-0">
                                            {statusLabel(req.collaborationStatus)}
                                        </span>
                                    </div>
                                    {req.location ? (
                                        <p className="text-[11px] text-[#F4F4F5]/55">{req.location}</p>
                                    ) : null}
                                    {req.instructions ? (
                                        <p className="text-[11px] text-[#F4F4F5]/80 whitespace-pre-wrap">
                                            {req.instructions}
                                        </p>
                                    ) : null}

                                    {req.sharedNotes.length > 0 ? (
                                        <ul className="space-y-1 border-t border-white/[0.07] pt-2">
                                            {req.sharedNotes.map((n) => (
                                                <li key={n.id} className="text-[11px] text-[#F4F4F5]/80">
                                                    <span className="font-bold text-[#E6C673]/85">
                                                        {n.authorName || n.authorId.slice(0, 6)}:
                                                    </span>{' '}
                                                    {n.text}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}

                                    <div className="flex flex-row-reverse flex-wrap gap-2 pt-1">
                                        {canAccept ? (
                                            <button
                                                type="button"
                                                data-testid={`task-help-accept-${req.id}`}
                                                disabled={busy}
                                                onClick={() => void handleAccept(req)}
                                                className={`${TASKS_BTN_PRIMARY} disabled:opacity-40`}
                                            >
                                                قبول المساعدة
                                            </button>
                                        ) : null}
                                        {isAssignee && req.collaborationStatus === 'ACCEPTED' ? (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void handleHelperDone(req)}
                                                className={`${TASKS_BTN_BRONZE} disabled:opacity-40 inline-flex items-center gap-1`}
                                            >
                                                <CheckCircle2 className="size-3.5" aria-hidden />
                                                تم الإنجاز
                                            </button>
                                        ) : null}
                                        {isOwner &&
                                        req.collaborationStatus === 'AWAITING_OWNER_REVIEW' ? (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void handleOwnerConfirm(req)}
                                                className={`${TASKS_BTN_BRONZE} disabled:opacity-40`}
                                            >
                                                تأكيد المراجعة
                                            </button>
                                        ) : null}
                                    </div>

                                    {(isOwner || isAssignee) &&
                                    (req.collaborationStatus === 'ACCEPTED' ||
                                        req.collaborationStatus === 'AWAITING_OWNER_REVIEW') ? (
                                        <div className="flex flex-row-reverse gap-2 items-center pt-1">
                                            <input
                                                dir="rtl"
                                                className={`flex-1 min-h-[44px] ${TASKS_INPUT} !px-2.5 !py-1.5`}
                                                placeholder="ملاحظة مشتركة…"
                                                enterKeyHint="send"
                                                autoComplete="off"
                                                value={noteDrafts[req.id] ?? ''}
                                                onChange={(e) =>
                                                    setNoteDrafts((prev) => ({
                                                        ...prev,
                                                        [req.id]: e.target.value,
                                                    }))
                                                }
                                            />
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void handleNote(req)}
                                                className={`${TASKS_BTN_GHOST} min-w-[44px] flex items-center justify-center`}
                                                aria-label="إرسال ملاحظة"
                                            >
                                                <MessageSquarePlus className="size-4" aria-hidden />
                                            </button>
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </TasksManagerDialogContent>
        </Dialog>
    );
}
