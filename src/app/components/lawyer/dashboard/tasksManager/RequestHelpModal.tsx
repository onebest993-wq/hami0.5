import React, { useCallback, useEffect, useState } from 'react';
import { HandHelping } from '@/app/components/ui/icons/HandHelping';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { Shield } from '@/app/components/ui/icons/Shield';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { ShareScope } from '@/app/types/taskHelpTypes';
import { clampTaskText, MAX_HELP_NOTE_LENGTH } from '@/app/services/tasks/taskInputGuard';
import type { NetworkColleague } from '@/app/services/caseShare/caseShareTypes';
import { CaseShareApiService } from '@/app/services/caseShare/caseShareApiService';
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { TasksManagerDialogContent } from './TasksManagerDialogContent';
import {
    TASKS_BTN_BRONZE,
    TASKS_DIALOG_BTN_CANCEL,
    TASKS_DIALOG_CONTENT,
    TASKS_DIALOG_DESC,
    TASKS_DIALOG_FOOTER,
    TASKS_INPUT,
    TASKS_LABEL,
} from './tasksBoucleTheme';

const SCOPE_ON =
    'min-h-[44px] rounded-xl border px-2 py-2 text-[11px] font-extrabold touch-manipulation border-[#E6C673]/50 bg-[#E6C673]/12 text-[#E6C673]';
const SCOPE_OFF =
    'min-h-[44px] rounded-xl border px-2 py-2 text-[11px] font-extrabold touch-manipulation border-white/[0.1] bg-[#12182B] text-[#F4F4F5]/85';

export type RequestHelpModalProps = {
    open: boolean;
    task: LegalTask | null;
    userId: string | null;
    userName?: string;
    onClose: () => void;
    onSubmit: (params: {
        taskId: string;
        scope: ShareScope;
        targetColleagueId?: string;
        targetColleagueName?: string;
        note?: string;
    }) => Promise<void>;
};

export function RequestHelpModal({
    open,
    task,
    userId,
    userName,
    onClose,
    onSubmit,
}: RequestHelpModalProps) {
    const [scope, setScope] = useState<ShareScope>('PRIVATE_DIRECT');
    const [note, setNote] = useState('');
    const [colleagueId, setColleagueId] = useState('');
    const [colleagues, setColleagues] = useState<NetworkColleague[]>([]);
    const [loadingColleagues, setLoadingColleagues] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setScope('PRIVATE_DIRECT');
        setNote('');
        setColleagueId('');
        setError(null);
    }, [open, task?.id]);

    useEffect(() => {
        if (!open || !userId || scope !== 'PRIVATE_DIRECT') return;
        let cancelled = false;
        setLoadingColleagues(true);
        void CaseShareApiService.listNetworkColleagues(userId)
            .then((rows) => {
                if (!cancelled) setColleagues(rows);
            })
            .catch(() => {
                if (!cancelled) setColleagues([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingColleagues(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, userId, scope]);

    const handleSubmit = useCallback(async () => {
        if (!task || !userId) return;
        if (scope === 'PRIVATE_DIRECT' && !colleagueId) {
            setError('اختر زميلاً للطلب الخاص');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const selected = colleagues.find((c) => c.id === colleagueId);
            await onSubmit({
                taskId: task.id,
                scope,
                targetColleagueId: scope === 'PRIVATE_DIRECT' ? colleagueId : undefined,
                targetColleagueName: selected?.name,
                note: clampTaskText(note, MAX_HELP_NOTE_LENGTH) || undefined,
            });
            onClose();
        } catch {
            setError('تعذر إرسال طلب المساعدة. حاول مجدداً.');
        } finally {
            setSubmitting(false);
        }
    }, [task, userId, scope, colleagueId, colleagues, note, onSubmit, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <TasksManagerDialogContent
                className={`${TASKS_DIALOG_CONTENT} max-h-[90dvh] overflow-y-auto`}
                instant
            >
                <DialogHeader className="text-right space-y-2">
                    <DialogTitle className="text-[#F4F4F5] text-base font-extrabold flex flex-row-reverse items-center gap-2 justify-start">
                        <HandHelping className="size-4 text-[#E6C673] shrink-0" aria-hidden />
                        طلب مساعدة في المهمة
                    </DialogTitle>
                    <DialogDescription className={`${TASKS_DIALOG_DESC} !text-xs`}>
                        {task?.title ?? '—'}
                        {userName ? ` · من ${userName}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-right py-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            data-testid="task-help-scope-private"
                            onClick={() => setScope('PRIVATE_DIRECT')}
                            className={scope === 'PRIVATE_DIRECT' ? SCOPE_ON : SCOPE_OFF}
                        >
                            طلب خاص لزميل
                        </button>
                        <button
                            type="button"
                            data-testid="task-help-scope-public"
                            onClick={() => setScope('PUBLIC_FORUM')}
                            className={scope === 'PUBLIC_FORUM' ? SCOPE_ON : SCOPE_OFF}
                        >
                            طلب عام في المنتدى
                        </button>
                    </div>

                    {scope === 'PUBLIC_FORUM' ? (
                        <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-3 py-2.5 flex flex-row-reverse gap-2 items-start">
                            <Shield className="size-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden />
                            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-semibold">
                                درع الخصوصية: سيتم حذف اسم الموكل ورقم القضية والمستندات السرية تلقائياً قبل النشر
                                في المنتدى.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="task-help-colleague" className={TASKS_LABEL}>
                                الزميل المستهدف
                            </label>
                            {loadingColleagues ? (
                                <p className="text-xs text-[#F4F4F5]/55 flex flex-row-reverse items-center gap-2">
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                    جاري تحميل الشبكة…
                                </p>
                            ) : (
                                <select
                                    id="task-help-colleague"
                                    data-testid="task-help-colleague"
                                    dir="rtl"
                                    className={`min-h-[44px] ${TASKS_INPUT}`}
                                    value={colleagueId}
                                    onChange={(e) => setColleagueId(e.target.value)}
                                >
                                    <option value="">اختر زميلاً…</option>
                                    {colleagues.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="task-help-note" className={TASKS_LABEL}>
                            ملاحظة توجيهية (اختياري)
                        </label>
                        <textarea
                            id="task-help-note"
                            data-testid="task-help-note"
                            dir="rtl"
                            rows={3}
                            className={`${TASKS_INPUT} resize-none min-h-[4.5rem]`}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="تعليمات مختصرة للزميل…"
                        />
                    </div>

                    {error ? (
                        <p className="text-xs font-bold text-rose-300" role="alert">
                            {error}
                        </p>
                    ) : null}
                </div>

                <DialogFooter className={TASKS_DIALOG_FOOTER}>
                    <button
                        type="button"
                        data-testid="task-help-submit"
                        disabled={submitting || !userId}
                        onClick={() => void handleSubmit()}
                        className={`${TASKS_BTN_BRONZE} inline-flex items-center gap-2 disabled:opacity-40`}
                    >
                        {submitting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        إرسال الطلب
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={TASKS_DIALOG_BTN_CANCEL}
                    >
                        إلغاء
                    </button>
                </DialogFooter>
            </TasksManagerDialogContent>
        </Dialog>
    );
}
