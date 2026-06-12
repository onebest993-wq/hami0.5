import React from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRowEverywhere,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';

export type GuarantorWorkspaceWrapperProps = {
    executionId: string;
    row: Record<string, unknown>;
    guarantorFollowup: ExecutionFile['guarantor_followup'] | null | undefined;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
        }
    ) => void;
    disabled?: boolean;
    onOpenAppeals: (decisionId?: string) => void;
    onOpenDecisions: (decisionId?: string) => void;
    onOpenGuarantorDetails: (decisionId?: string) => void;
    requestTitle?: string;
};

export const GuarantorWorkspaceWrapper: React.FC<GuarantorWorkspaceWrapperProps> = ({
    executionId,
    row,
    persistGuarantorFollowupDetails,
    disabled,
    onOpenAppeals,
    onOpenDecisions,
    requestTitle = 'طلب كفيل ضامن',
}) => {
    const allDecisions = React.useMemo(
        () => readExecutorDecisionsArray(executionId) as Record<string, unknown>[],
        [executionId, row]
    );
    const decisionId = String(row?.id || '').trim();
    const rejected = Boolean(decisionId) && isExecutorRowRejectedAndFinal(row);
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    const alternative = outcome === 'alternative';
    const approved =
        Boolean(decisionId) &&
        !rejected &&
        (alternative || isExecutorRowApprovedWorkflowActive(row, allDecisions));
    const detailsSaved = Boolean(String(row?.guarantorDetailsSavedAt || '').trim());
    const needsCompletion = approved && !detailsSaved;
    const vanish = approved && detailsSaved;

    const [expanded, setExpanded] = React.useState(false);
    const prevNeedsCompletionRef = React.useRef<boolean>(false);
    React.useEffect(() => {
        const prev = prevNeedsCompletionRef.current;
        prevNeedsCompletionRef.current = needsCompletion;
        if (needsCompletion && !prev) setExpanded(true);
        if (!needsCompletion) setExpanded(false);
    }, [needsCompletion]);

    const [name, setName] = React.useState<string>('');
    const [workplace, setWorkplace] = React.useState<string>('');
    const [salary, setSalary] = React.useState<string>('');
    const [deduction, setDeduction] = React.useState<string>('');

    React.useEffect(() => {
        if (!needsCompletion) return;
        setName('');
        setWorkplace('');
        setSalary('');
        setDeduction('');
    }, [decisionId, needsCompletion]);

    const parseIqd = (s: string): number | null => {
        const t = String(s).replace(/,/g, '').replace(/\s/g, '').trim();
        if (!t) return null;
        const x = Number(t);
        return Number.isFinite(x) ? x : null;
    };

    const canSave =
        Boolean(String(name || '').trim()) && Boolean(String(workplace || '').trim()) && !disabled;

    if (!decisionId) return null;
    if (vanish) return null;

    if (rejected) {
        return (
            <div className="mt-2 rounded-2xl border p-3 border-rose-500/35 bg-rose-950/25">
                <p className="text-[11px] font-black text-right text-rose-200">قرار المنفذ</p>
                <p className="mt-1 text-[10px] text-slate-400 text-right">تم رفض الطلب</p>
                <div className="mt-3 border-t border-white/10 pt-3">
                    <button
                        type="button"
                        onClick={() => onOpenAppeals(decisionId)}
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                    >
                        تقديم طعن (الذهاب لمركز القرارات)
                    </button>
                </div>
            </div>
        );
    }

    const pending = !approved && !rejected;

    if (pending) {
        return (
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                <p className="text-[11px] font-black text-right text-slate-200">قرار المنفذ</p>
                <p className="mt-1 text-[10px] text-slate-400 text-right">قيد البت</p>
                <div className="mt-3 border-t border-white/10 pt-3">
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={decisionId}
                        requestKind="guarantor_request"
                    />
                </div>
            </div>
        );
    }

    if (!needsCompletion) return null;

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title: requestTitle,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ',
            subtitle: alternative ? 'قرار بديل — أكمل بيانات الكفيل' : 'تمت الموافقة',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:complete`,
            title: 'إكمال بيانات الكفيل',
            subtitle: 'أكمل البيانات ثم احفظ',
            status: 'active',
            tone: 'neutral',
            content: (
                <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-300">اسم الكفيل</label>
                            <input
                                type="text"
                                disabled={disabled}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                placeholder="اسم الكفيل"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold text-slate-300">مكان العمل</label>
                            <input
                                type="text"
                                disabled={disabled}
                                value={workplace}
                                onChange={(e) => setWorkplace(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                placeholder="مكان العمل"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    الراتب (اختياري)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    disabled={disabled}
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300">
                                    الاستقطاع (اختياري)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    disabled={disabled}
                                    value={deduction}
                                    onChange={(e) => setDeduction(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={() => {
                            persistGuarantorFollowupDetails(String(name || ''), String(workplace || ''), {
                                salaryIqd: parseIqd(salary),
                                deductionIqd: parseIqd(deduction),
                            });
                            const ts = new Date().toISOString();
                            patchExecutorDecisionRowEverywhere(decisionId, { guarantorDetailsSavedAt: ts });
                        }}
                        className="w-full rounded-xl bg-gradient-to-l from-indigo-500 to-violet-700 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                    >
                        حفظ بيانات الكفيل
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenDecisions(decisionId)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                    >
                        فتح مركز القرارات
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="mt-2">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
            >
                <span className="text-[#D4AF37]/85">{expanded ? 'تصغير' : 'توسيع'}</span>
            </button>
            {expanded ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            ) : null}
        </div>
    );
};
