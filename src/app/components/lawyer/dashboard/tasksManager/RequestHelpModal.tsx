import React, { useCallback, useEffect, useState } from 'react';
import { HandHelping, Loader2, Shield } from '@/app/components/ui/lucideIcons';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { ShareScope } from '@/app/types/taskHelpTypes';
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

const TASKS_DIALOG_CONTENT =
    'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md max-h-[90dvh] overflow-y-auto';

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
                note: note.trim() || undefined,
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
            <TasksManagerDialogContent className={TASKS_DIALOG_CONTENT} instant>
                <DialogHeader className="text-right space-y-2">
                    <DialogTitle className="text-slate-100 text-base font-extrabold flex flex-row-reverse items-center gap-2 justify-start">
                        <HandHelping className="size-4 text-amber-300/90 shrink-0" aria-hidden />
                        طلب مساعدة في المهمة
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs leading-relaxed">
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
                            className={`min-h-[44px] rounded-xl border-2 px-2 py-2 text-[11px] font-extrabold touch-manipulation ${
                                scope === 'PRIVATE_DIRECT'
                                    ? 'border-amber-500 bg-amber-600/90 text-white shadow-[inset_0_0_0_1px_rgba(251,191,36,0.45)]'
                                    : 'border-slate-500 bg-slate-800 text-slate-200'
                            }`}
                        >
                            طلب خاص لزميل
                        </button>
                        <button
                            type="button"
                            data-testid="task-help-scope-public"
                            onClick={() => setScope('PUBLIC_FORUM')}
                            className={`min-h-[44px] rounded-xl border-2 px-2 py-2 text-[11px] font-extrabold touch-manipulation ${
                                scope === 'PUBLIC_FORUM'
                                    ? 'border-sky-400 bg-sky-600/90 text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.45)]'
                                    : 'border-slate-500 bg-slate-800 text-slate-200'
                            }`}
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
                            <label
                                htmlFor="task-help-colleague"
                                className="text-[11px] font-bold text-slate-500 block mb-1"
                            >
                                الزميل المستهدف
                            </label>
                            {loadingColleagues ? (
                                <p className="text-xs text-slate-400 flex flex-row-reverse items-center gap-2">
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                    جاري تحميل الشبكة…
                                </p>
                            ) : (
                                <select
                                    id="task-help-colleague"
                                    data-testid="task-help-colleague"
                                    dir="rtl"
                                    className="w-full min-h-[44px] rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/50"
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
                        <label
                            htmlFor="task-help-note"
                            className="text-[11px] font-bold text-slate-500 block mb-1"
                        >
                            ملاحظة توجيهية (اختياري)
                        </label>
                        <textarea
                            id="task-help-note"
                            data-testid="task-help-note"
                            dir="rtl"
                            rows={3}
                            className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/50 resize-none min-h-[4.5rem]"
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

                <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start sticky bottom-0 bg-slate-900 pt-2">
                    <button
                        type="button"
                        data-testid="task-help-submit"
                        disabled={submitting || !userId}
                        onClick={() => void handleSubmit()}
                        className="min-h-[44px] px-4 py-2 rounded-lg border-2 border-amber-400 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold disabled:opacity-40 touch-manipulation inline-flex items-center gap-2 shadow-[0_2px_10px_rgba(217,119,6,0.35)]"
                    >
                        {submitting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                        إرسال الطلب
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 py-2 rounded-lg border-2 border-slate-500 bg-slate-800 text-slate-100 text-xs font-bold touch-manipulation"
                    >
                        إلغاء
                    </button>
                </DialogFooter>
            </TasksManagerDialogContent>
        </Dialog>
    );
}
