import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import type { CommunicationDisplayContext } from '../communicationDecisionModel';
import type { CommunicationResultDraft } from './communicationsTabTypes';

function CommunicationAwaitingSubStepBackButton({
    label,
    onBack,
    disabled,
}: {
    label: string;
    onBack: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onBack}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-right min-h-[44px] text-[10px] font-bold text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 touch-manipulation transition-colors disabled:opacity-40"
            aria-label={label}
        >
            <ChevronRight size={16} className="shrink-0 text-[#E6C673]/70" aria-hidden />
            <span>{label}</span>
        </button>
    );
}

export function CommunicationAwaitingResponseForm({
    draft,
    saving,
    onDraftChange,
    onSaveResult,
    onBack,
}: {
    draft: CommunicationResultDraft;
    saving: boolean;
    onDraftChange: (draft: CommunicationResultDraft) => void;
    onSaveResult: () => void;
    onBack: () => void;
}) {
    return (
        <>
            <CommunicationAwaitingSubStepBackButton
                label="العودة إلى متابعة النتيجة"
                onBack={onBack}
                disabled={saving}
            />
            <div className="space-y-2 border-t border-white/[0.06] px-3 py-2">
                <p className="text-[9px] font-bold text-emerald-200/90">تسجيل الإجابة</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-500">تاريخ الإجابة</label>
                        <input
                            type="date"
                            value={draft.letterDate}
                            onChange={(e) => onDraftChange({ ...draft, letterDate: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[9px] text-slate-500">رقم الكتاب</label>
                        <input
                            type="text"
                            value={draft.letterNum}
                            onChange={(e) => onDraftChange({ ...draft, letterNum: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-100 text-right"
                            placeholder="رقم الكتاب"
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-[9px] text-slate-500">مضمون الإجابة</label>
                    <textarea
                        value={draft.result}
                        onChange={(e) => onDraftChange({ ...draft, result: e.target.value })}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-100 text-right"
                        placeholder="مضمون الإجابة الواردة"
                    />
                </div>
                <button
                    type="button"
                    disabled={saving || !String(draft.result || '').trim()}
                    onClick={onSaveResult}
                    className="w-full rounded-lg bg-emerald-600/70 py-2 text-[10px] font-black text-white disabled:opacity-40"
                >
                    حفظ الإجابة
                </button>
            </div>
        </>
    );
}

export function CommunicationAwaitingDismissConfirm({
    saving,
    onDismissFollowup,
    onCancelDismissConfirm,
    onBack,
}: {
    saving: boolean;
    onDismissFollowup: () => void;
    onCancelDismissConfirm: () => void;
    onBack: () => void;
}) {
    return (
        <>
            <CommunicationAwaitingSubStepBackButton
                label="العودة إلى متابعة النتيجة"
                onBack={onBack}
                disabled={saving}
            />
            <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-200">
                    هل تؤكد تجاهل متابعة نتيجة هذه المخاطبة؟
                </p>
                <p className="text-[9px] text-slate-500">
                    لن تُطالبك الواجهة بمتابعة النتيجة لهذا الكتاب.
                </p>
                <div className="flex flex-row-reverse flex-wrap gap-1.5">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onDismissFollowup}
                        className="rounded-lg border border-slate-500/35 bg-slate-500/15 px-3 py-2 text-[10px] font-black text-slate-100 disabled:opacity-40"
                    >
                        تأكيد التجاهل
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onCancelDismissConfirm}
                        className="rounded-lg px-3 py-2 text-[10px] font-bold text-slate-400"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </>
    );
}

export function CommunicationAwaitingNoResponseFlows({
    noResponseFlow,
    ctx,
    ui,
    saving,
    onStartNoResponseChoose,
    onPickNoResponseSameContext,
    onPickNoResponseEdit,
    onNoResponseEditDraftChange,
    onCancelNoResponseFlow,
    onConfirmNoResponseSame,
    onConfirmNoResponseEdit,
    onBack,
}: {
    noResponseFlow: string | undefined;
    ctx: CommunicationDisplayContext;
    ui: {
        noResponseEditDate?: string;
        noResponseEditBody?: string;
    };
    saving: boolean;
    onStartNoResponseChoose: () => void;
    onPickNoResponseSameContext: () => void;
    onPickNoResponseEdit: (letterDate: string, body: string) => void;
    onNoResponseEditDraftChange: (letterDate: string, body: string) => void;
    onCancelNoResponseFlow: () => void;
    onConfirmNoResponseSame: () => void;
    onConfirmNoResponseEdit: (letterDate: string, body: string) => void;
    onBack: () => void;
}) {
    if (noResponseFlow === 'choose') {
        return (
            <>
                <CommunicationAwaitingSubStepBackButton
                    label="العودة إلى متابعة النتيجة"
                    onBack={onBack}
                    disabled={saving}
                />
                <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-100">
                        هل تؤكد عدم ورود إجابة من الجهة المخاطَبة؟
                    </p>
                    <p className="text-[9px] font-bold text-amber-200/90">اختر السياق</p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onPickNoResponseSameContext}
                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-100 disabled:opacity-40"
                        >
                            بنفس السياق
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => onPickNoResponseEdit(ctx.letterDate, ctx.outcomeBody)}
                            className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-[10px] font-bold text-slate-200 disabled:opacity-40"
                        >
                            تعديل
                        </button>
                    </div>
                </div>
            </>
        );
    }
    if (noResponseFlow === 'confirm_same') {
        return (
            <>
                <CommunicationAwaitingSubStepBackButton
                    label="العودة إلى اختيار السياق"
                    onBack={() => onStartNoResponseChoose()}
                    disabled={saving}
                />
                <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-100">
                        تأكيد عدم ورود إجابة (بنفس سياق الكتاب)؟
                    </p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onConfirmNoResponseSame}
                            className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-[10px] font-black text-amber-50 disabled:opacity-40"
                        >
                            تأكيد
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onCancelNoResponseFlow}
                            className="rounded-lg px-3 py-2 text-[10px] font-bold text-slate-400"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </>
        );
    }
    if (noResponseFlow !== 'edit') return null;
    return (
        <>
            <CommunicationAwaitingSubStepBackButton
                label="العودة إلى اختيار السياق"
                onBack={() => onStartNoResponseChoose()}
                disabled={saving}
            />
            <div className="border-t border-white/[0.06] px-3 py-2 space-y-2">
                <p className="text-[9px] font-bold text-slate-400">تعديل تفاصيل الكتاب قبل التأكيد</p>
                <div>
                    <label className="mb-1 block text-[9px] text-slate-500">تاريخ الكتاب</label>
                    <input
                        type="date"
                        value={ui.noResponseEditDate ?? ctx.letterDate}
                        onChange={(e) =>
                            onNoResponseEditDraftChange(
                                e.target.value,
                                ui.noResponseEditBody ?? ctx.outcomeBody,
                            )
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-100"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[9px] text-slate-500">تفاصيل المخاطبة</label>
                    <textarea
                        value={ui.noResponseEditBody ?? ctx.outcomeBody}
                        onChange={(e) =>
                            onNoResponseEditDraftChange(
                                ui.noResponseEditDate ?? ctx.letterDate,
                                e.target.value,
                            )
                        }
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[11px] text-slate-100"
                    />
                </div>
                <div className="flex flex-row-reverse flex-wrap gap-1.5">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            onConfirmNoResponseEdit(
                                ui.noResponseEditDate ?? ctx.letterDate,
                                ui.noResponseEditBody ?? '',
                            )
                        }
                        className="rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-[10px] font-black text-amber-50 disabled:opacity-40"
                    >
                        تأكيد عدم الورود
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onCancelNoResponseFlow}
                        className="rounded-lg px-3 py-2 text-[10px] font-bold text-slate-400"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </>
    );
}
