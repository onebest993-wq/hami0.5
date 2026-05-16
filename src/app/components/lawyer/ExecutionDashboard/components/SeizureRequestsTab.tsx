import React from 'react';
import { Shield, Wallet, Building2, Package, Users, ClipboardList } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    appendPendingExecutorSeizureDecision,
    getLatestSeizureDecisionBySubtype,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRowEverywhere,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';

type SeizureWorkspaceWrapperProps = {
    executionId: string;
    patchExecutionIds?: string[];
    row: any;
    title: string;
    completion: React.ReactNode;
    onOpenAppeals: (decisionId?: string) => void;
    expandSignal?: number;
};

const SeizureWorkspaceWrapper: React.FC<SeizureWorkspaceWrapperProps> = ({
    executionId,
    patchExecutionIds,
    row,
    title,
    completion,
    onOpenAppeals,
    expandSignal,
}) => {
    const decisionId = String(row?.id || '').trim();
    const rejected = Boolean(decisionId) && isExecutorRowRejectedAndFinal(row);
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    const alternative = outcome === 'alternative';
    const approved =
        Boolean(decisionId) && !rejected && (alternative || isExecutorRowEffectivelyApproved(row));
    const savedAt = String(row?.seizureRequestSavedAt || '').trim();
    const needsCompletion = approved && !savedAt;
    const vanish = approved && Boolean(savedAt);

    const [expanded, setExpanded] = React.useState(needsCompletion);
    const [busy, setBusy] = React.useState(false);
    const prevNeedsCompletionRef = React.useRef<boolean>(false);
    const prevExpandSignalRef = React.useRef<number>(-1);
    React.useEffect(() => {
        const prev = prevNeedsCompletionRef.current;
        prevNeedsCompletionRef.current = needsCompletion;
        if (needsCompletion && !prev) setExpanded(true);
        if (!needsCompletion) setExpanded(false);
    }, [needsCompletion]);
    React.useEffect(() => {
        const sig = typeof expandSignal === 'number' ? expandSignal : -1;
        if (sig === prevExpandSignalRef.current) return;
        prevExpandSignalRef.current = sig;
        if (needsCompletion) setExpanded(true);
    }, [expandSignal, needsCompletion]);

    if (!decisionId) return null;
    if (vanish) return null;

    const resolve = (nextOutcome: 'approved' | 'rejected') => {
        if (busy) return;
        const base = String(executionId || '').trim();
        const ids = Array.from(
            new Set(
                [base, ...(Array.isArray(patchExecutionIds) ? patchExecutionIds : [])]
                    .map((x) => String(x || '').trim())
                    .filter((x) => x && x !== 'undefined' && x !== 'null')
            )
        );
        if (ids.length === 0) return;
        setBusy(true);
        const nowIso = new Date().toISOString();
        try {
            patchExecutorDecisionRowEverywhere(decisionId, {
                executorOutcome: nextOutcome,
                status: nextOutcome === 'rejected' ? 'rejected' : 'accepted',
                appealStatus: 'pending',
                appealPhase: null,
                appealBaseBranch: nextOutcome === 'rejected' ? 'after_rejection' : 'after_approval',
                resolvedAt: nowIso,
            } as any);
        } catch {}
        try {
            window.dispatchEvent(
                new CustomEvent('hami-execution-decision-outcome', {
                    detail: {
                        executionId: ids[0],
                        requestKind: 'seizure',
                        outcome: nextOutcome,
                        decisionId,
                    },
                })
            );
        } catch {}
        setBusy(false);
    };

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
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#05060D]/55 p-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-right text-slate-100">قرار المنفذ</p>
                    <p className="text-[10px] text-slate-400">قيد البت</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolve('approved')}
                        className="rounded-xl bg-emerald-600/25 border border-emerald-500/35 py-2.5 text-[12px] font-black text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-40"
                    >
                        موافقة
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolve('rejected')}
                        className="rounded-xl bg-rose-700/25 border border-rose-500/35 py-2.5 text-[12px] font-black text-rose-100 hover:bg-rose-700/30 disabled:opacity-40"
                    >
                        رفض
                    </button>
                </div>
            </div>
        );
    }

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ',
            subtitle: 'تمت الموافقة',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:complete`,
            title: 'إكمال بيانات الحجز',
            subtitle: 'أكمل الحقول ثم احفظ',
            status: 'active',
            tone: 'neutral',
            content: completion,
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

type GuarantorWorkspaceWrapperProps = {
    executionId: string;
    row: any;
    guarantorFollowup: ExecutionFile['guarantor_followup'] | null | undefined;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    disabled?: boolean;
    onOpenAppeals: (decisionId?: string) => void;
    onOpenDecisions: (decisionId?: string) => void;
    onOpenGuarantorDetails: (decisionId?: string) => void;
};

const GuarantorWorkspaceWrapper: React.FC<GuarantorWorkspaceWrapperProps> = ({
    executionId,
    row,
    guarantorFollowup,
    persistGuarantorFollowupDetails,
    disabled,
    onOpenAppeals,
    onOpenDecisions,
    onOpenGuarantorDetails,
}) => {
    const decisionId = String(row?.id || '').trim();
    const rejected = Boolean(decisionId) && isExecutorRowRejectedAndFinal(row);
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    const alternative = outcome === 'alternative';
    const approved =
        Boolean(decisionId) && !rejected && (alternative || isExecutorRowEffectivelyApproved(row));
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

    const [guaranteeType, setGuaranteeType] = React.useState<'amount' | 'attendance'>('amount');
    const [name, setName] = React.useState<string>('');
    const [workplace, setWorkplace] = React.useState<string>('');
    const [salary, setSalary] = React.useState<string>('');
    const [deduction, setDeduction] = React.useState<string>('');

    React.useEffect(() => {
        if (!needsCompletion) return;
        setGuaranteeType('amount');
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
            title: 'طلب كفيل ضامن',
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
                            <label className="mb-1 block text-[11px] font-bold text-slate-300">نوع الكفالة</label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setGuaranteeType('amount')}
                                    className={`rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
                                        guaranteeType === 'amount'
                                            ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-100'
                                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                    }`}
                                >
                                    كفالة ضامنة للمبلغ
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setGuaranteeType('attendance')}
                                    className={`rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
                                        guaranteeType === 'attendance'
                                            ? 'border-amber-500/45 bg-amber-500/10 text-amber-100'
                                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                    }`}
                                >
                                    كفالة إحضار شخصية
                                </button>
                            </div>
                        </div>

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

                        {guaranteeType === 'amount' ? (
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
                        ) : null}
                    </div>

                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={() => {
                            persistGuarantorFollowupDetails(String(name || ''), String(workplace || ''), {
                                salaryIqd: guaranteeType === 'amount' ? parseIqd(salary) : null,
                                deductionIqd: guaranteeType === 'amount' ? parseIqd(deduction) : null,
                                guaranteeType,
                            });
                            const ts = new Date().toISOString();
                            patchExecutorDecisionRow(executionId, decisionId, { guarantorDetailsSavedAt: ts } as any);
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

export interface SeizureRequestsTabProps {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    seizureDetailCompletion: { decisionRowId: string; assetId: string; actionType: 'salary' | 'property' | 'vehicle' } | null;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    getLocalTodayYmd: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
    activeDebtorIsDeceased: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleCoerciveAction: (type: string) => void;
    handleGuarantorRequestFromFollowup: () => void;
    requestFollowupSeizureDecision: (subtype: 'third_party' | 'notice', title: string, body: string) => void;
}

export const SeizureRequestsTab: React.FC<SeizureRequestsTabProps> = ({
    executionId,
    executionData,
    seizureDetailCompletion,
    saveCoerciveAction,
    persistExecutionMerge,
    persistGuarantorFollowupDetails,
    pushTimelineEvent,
    nextTimelineId,
    getLocalTodayYmd,
    showToast,
    activeDebtorIsDeceased,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    inlineActionGateKey,
    setInlineActionGateKey,
    handleCoerciveAction,
    handleGuarantorRequestFromFollowup,
    requestFollowupSeizureDecision,
}) => {
    const normalizeExecutionId = React.useCallback((v: unknown): string => {
        const s = String(v ?? '').trim();
        if (!s) return '';
        if (s === 'undefined' || s === 'null') return '';
        return s;
    }, []);
    const executionIdsForDecisions = React.useMemo(() => {
        const ids = [normalizeExecutionId(executionId), normalizeExecutionId(executionData?.id)]
            .map((x) => String(x || '').trim())
            .filter(Boolean);
        return Array.from(new Set(ids));
    }, [executionData?.id, executionId, normalizeExecutionId]);
    const resolvedExecutionId = executionIdsForDecisions[0] || '';
    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);
    const [salaryExpandEpoch, setSalaryExpandEpoch] = React.useState(0);
    const [lastSalaryDecisionId, setLastSalaryDecisionId] = React.useState('');

    const readAllDecisions = React.useCallback((): Record<string, unknown>[] => {
        const merged: Record<string, unknown>[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...readExecutorDecisionsArray(id));
        }
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of merged) {
            const rid = String((row as any)?.id ?? '').trim();
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = String((prev as any)?.resolvedAt ?? (prev as any)?.date ?? '');
            const b = String((row as any)?.resolvedAt ?? (row as any)?.date ?? '');
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() => readAllDecisions());
    React.useEffect(() => {
        const sync = () => setDecisions(readAllDecisions());
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [readAllDecisions]);

    const [thirdPartyNameDraft, setThirdPartyNameDraft] = React.useState('');
    const [thirdPartyAmountDraft, setThirdPartyAmountDraft] = React.useState('');
    const [thirdPartyNotifyYmdDraft, setThirdPartyNotifyYmdDraft] = React.useState('');
    const [salaryDetailsDraftByDecisionId, setSalaryDetailsDraftByDecisionId] = React.useState<Record<string, { employerName: string; salaryAmount: string }>>({});
    const [propertyDetailsDraftByDecisionId, setPropertyDetailsDraftByDecisionId] = React.useState<Record<string, { propertyNumber: string; propertyDistrict: string; propertyType: string }>>({});
    const [vehicleDetailsDraftByDecisionId, setVehicleDetailsDraftByDecisionId] = React.useState<Record<string, { movableDescription: string; movableLocation: string; judicialCustodianName: string }>>({});

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [resolvedExecutionId]
    );

    const openGuarantorDetails = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-guarantor-details', {
                        detail: {
                            executionId: resolvedExecutionId,
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const findLatestGuarantorDecision = React.useMemo(() => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return (row as any) || null;
    }, [decisions]);

    const thirdPartyDecision = React.useMemo(
        () => getLatestSeizureDecisionBySubtype(resolvedExecutionId, 'third_party'),
        [resolvedExecutionId, decisions]
    );
    const noticeDecision = React.useMemo(
        () => getLatestSeizureDecisionBySubtype(resolvedExecutionId, 'notice'),
        [resolvedExecutionId, decisions]
    );
    const salaryDecision = React.useMemo(() => {
        const bySubtype = getLatestSeizureDecisionBySubtype(resolvedExecutionId, 'salary');
        if (bySubtype) return bySubtype as any;

        const isGuarantorRelated = (txt: string) => /الكفيل|كفيل/i.test(String(txt || ''));
        const isSalaryRelated = (txt: string) =>
            /حجز\s*راتب|حجز\s*الحوافز|الحوافز|المخصصات|الراتب/i.test(String(txt || ''));

        const candidates = decisions.filter((r) => {
            const rk = String((r as any)?.requestKind || '').trim();
            const rid = String((r as any)?.id || '').trim();
            const isSeizureLike = rk === 'seizure' || (!rk && /^seizure_req_/i.test(rid));
            if (!isSeizureLike) return false;
            const st = String((r as any)?.seizureSubtype || '').trim();
            if (st && st !== 'salary') return false;
            const title = String((r as any)?.title || '');
            const body = String((r as any)?.body || '');
            if (isGuarantorRelated(title) || isGuarantorRelated(body)) return false;
            return isSalaryRelated(title) || isSalaryRelated(body);
        });
        if (candidates.length === 0) return null;
        const first = candidates[0] as any;
        return candidates.reduce((acc: any, cur: any) => {
            const a = String(acc?.resolvedAt ?? acc?.date ?? '');
            const b = String(cur?.resolvedAt ?? cur?.date ?? '');
            return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
        }, first) as any;
    }, [resolvedExecutionId, decisions]);

    React.useEffect(() => {
        const did = String((salaryDecision as any)?.id || '').trim();
        if (!did) return;
        setLastSalaryDecisionId(did);
    }, [salaryDecision]);
    const propertyDecision = React.useMemo(
        () => getLatestSeizureDecisionBySubtype(resolvedExecutionId, 'property'),
        [resolvedExecutionId, decisions]
    );
    const movableDecision = React.useMemo(
        () => getLatestSeizureDecisionBySubtype(resolvedExecutionId, 'movable_auction'),
        [resolvedExecutionId, decisions]
    );

    const parseIsoFromYmd = (ymd: string): string | null => {
        const t = String(ymd || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
        const dt = new Date(`${t}T00:00:00.000Z`);
        return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
    };

    const normalizeDigitsOnly = (raw: string): string => {
        const t = String(raw || '');
        const ascii = t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        return ascii.replace(/[^\d]/g, '');
    };

    const renderDecisionInline = (row: any, requestKind: string) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        if (!decisionId) return null;
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending = String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
        if (!pending && !rejected) return null;
        if (rejected) {
            return (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3">
                    <p className="text-[11px] font-black text-rose-200 text-right">
                        تم رفض الطلب من قبل المنفذ
                    </p>
                    <div className="mt-2">
                        <ExecutionInlineExecutorDecisionActions
                            executionId={resolvedExecutionId}
                            decisionId={decisionId}
                            requestKind={requestKind}
                            disabled
                            onOpenAppealCenter={() => openAppeals(decisionId)}
                        />
                    </div>
                </div>
            );
        }
        return (
            <ExecutionInlineExecutorDecisionActions
                executionId={resolvedExecutionId}
                decisionId={decisionId}
                requestKind={requestKind}
            />
        );
    };

    const renderThirdPartyInlineCompletionIfAny = (row: any) => {
        if (!row?.id) return null;
        if (!isExecutorRowEffectivelyApproved(row)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;

        const name = String(thirdPartyNameDraft || '').trim();
        const amtRaw = String(thirdPartyAmountDraft || '').trim();
        const amt = amtRaw ? Number(normalizeDigitsOnly(amtRaw)) : NaN;
        const amount = !amtRaw || !Number.isFinite(amt) || amt <= 0 ? 0 : Math.trunc(amt);
        const iso = parseIsoFromYmd(thirdPartyNotifyYmdDraft);

        const canSave = Boolean(name) && amount > 0 && Boolean(iso) && Boolean(resolvedExecutionId);

        return (
            <div className="space-y-2">
                <p className="text-[10px] text-slate-300 text-right">
                    أكمل البيانات هنا بدل نافذة منبثقة:
                </p>
                <div className="grid grid-cols-1 gap-2">
                    <input
                        type="text"
                        value={thirdPartyNameDraft}
                        onChange={(e) => setThirdPartyNameDraft(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                        placeholder="اسم الجهة الثالثة (مثلاً: مصرف الرافدين)"
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        value={thirdPartyAmountDraft}
                        onChange={(e) => setThirdPartyAmountDraft(normalizeDigitsOnly(String(e.target.value || '')))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                        placeholder="المبلغ المطلوب حجزه (د.ع)"
                    />
                    <input
                        type="date"
                        value={thirdPartyNotifyYmdDraft}
                        onChange={(e) => setThirdPartyNotifyYmdDraft(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100"
                    />
                </div>
                <button
                    type="button"
                    disabled={!canSave}
                    className="w-full rounded-xl bg-gradient-to-l from-cyan-500 to-sky-700 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                    onClick={() => {
                        if (!canSave) return;
                        const decisionId = String(row.id || '').trim();
                        const entityId = `tps_${decisionId}_${Date.now()}`;
                        const nextSeizure = {
                            id: entityId,
                            decisionRowId: decisionId,
                            thirdPartyName: name,
                            requestedAmountIqd: amount,
                            notificationDateIso: iso,
                            replyStatus: 'pending',
                            transferredAmountIqd: null,
                            status: 'notified',
                        };
                        const prev = Array.isArray((executionData as any)?.thirdPartySeizures)
                            ? ((executionData as any).thirdPartySeizures as any[])
                            : [];
                        const nextSeizures = [nextSeizure, ...prev.filter((x) => String(x?.id || '') !== entityId)];

                        const nowIso = new Date().toISOString();
                        pushTimelineEvent(
                            {
                                id: nextTimelineId(),
                                date: getLocalTodayYmd(),
                                timestamp: nowIso,
                                title: '📨 حجز مال المدين لدى الغير — تم التبليغ',
                                description: `الجهة: ${name}\nالمبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع.\nتاريخ التبليغ: ${String(iso).slice(0, 10)}`,
                                type: 'coercive',
                                source: 'التنفيذ والمحجوزات',
                                metadata: {
                                    thirdPartySeizureId: entityId,
                                    decisionRowId: decisionId,
                                    timelineThreadKey: `third_party_seizure:${decisionId}`,
                                },
                            },
                            { mergePatch: { thirdPartySeizures: nextSeizures } }
                        );

                        try {
                            patchExecutorDecisionRow(resolvedExecutionId, decisionId, {
                                seizureRequestSavedAt: nowIso,
                                seizureRequestDetails: [
                                    `الجهة: ${name}`,
                                    `المبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع`,
                                    `تاريخ التبليغ: ${String(iso).slice(0, 10)}`,
                                ].join('\n'),
                                seizurePayloadJson: JSON.stringify({
                                    thirdPartySeizureId: entityId,
                                    thirdPartyName: name,
                                    requestedAmountIqd: amount,
                                    notificationDateIso: iso,
                                }),
                            } as any);
                        } catch {
                            /* ignore */
                        }

                        persistExecutionMerge({ thirdPartySeizures: nextSeizures });
                        setThirdPartyNameDraft('');
                        setThirdPartyAmountDraft('');
                        setThirdPartyNotifyYmdDraft('');
                        showToast('تم حفظ بيانات الحجز لدى الغير داخل نفس البطاقة.', 'success');
                    }}
                >
                    حفظ بيانات التبليغ
                </button>
            </div>
        );
    };

    const submitBasicSeizureRequest = React.useCallback(
        (args: { actionType: 'salary' | 'property' | 'vehicle'; title: string; body: string; subtype: any }) => {
            const exId = resolvedExecutionId;
            if (!exId) return null;
            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${args.title} — قيد البت لدى المنفذ`,
                requestBody: args.body,
                seizureSubtype: args.subtype,
            } as any);
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            const nowIso = new Date().toISOString();
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    type: 'decision',
                    title: `📋 ${args.title} — قيد البت`,
                    description: args.body,
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    source: 'التنفيذ والمحجوزات',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                } as any
            );
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
            return decisionId;
        },
        [appendPendingExecutorSeizureDecision, nextTimelineId, pushTimelineEvent, resolvedExecutionId, showToast]
    );

    const salaryRowForUi = React.useMemo(() => {
        const direct = salaryDecision as any;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => String((r as any)?.id || '').trim() === did) as any;
        if (found?.id) return found;
        return {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        } as any;
    }, [activeDebtorIsDeceased, decisions, lastSalaryDecisionId, salaryDecision]);

    const renderSalaryCompletion = (row: any) => {
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) return null;
        if (!isExecutorRowEffectivelyApproved(row)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;
        const draft = salaryDetailsDraftByDecisionId[decisionId] || { employerName: '', salaryAmount: '' };
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={draft.employerName}
                    onChange={(e) =>
                        setSalaryDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, employerName: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder={activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}
                />
                <input
                    type="text"
                    inputMode="numeric"
                    value={draft.salaryAmount}
                    onChange={(e) =>
                        setSalaryDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, salaryAmount: normalizeDigitsOnly(String(e.target.value || '')) },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="مقدار الدخل الشهري (اختياري)"
                />
                <button
                    type="button"
                    disabled={!String(draft.employerName || '').trim()}
                    onClick={() => {
                        if (!String(draft.employerName || '').trim()) {
                            showToast('أدخل جهة العمل/الجهة الصارفة.', 'warning');
                            return;
                        }
                        saveCoerciveAction('salary', {
                            decisionRowId: decisionId,
                            employerName: String(draft.employerName || '').trim(),
                            salaryAmount: String(draft.salaryAmount || '').trim(),
                        });
                    }}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ التفاصيل
                </button>
            </div>
        );
    };

    const renderPropertyCompletion = (row: any) => {
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) return null;
        if (!isExecutorRowEffectivelyApproved(row)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;
        const draft = propertyDetailsDraftByDecisionId[decisionId] || { propertyNumber: '', propertyDistrict: '', propertyType: '' };
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={draft.propertyNumber}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyNumber: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="رقم العقار"
                />
                <input
                    type="text"
                    value={draft.propertyDistrict}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyDistrict: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="المقاطعة"
                />
                <input
                    type="text"
                    value={draft.propertyType}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyType: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="نوع العقار"
                />
                <button
                    type="button"
                    disabled={!String(draft.propertyNumber || '').trim() || !String(draft.propertyDistrict || '').trim() || !String(draft.propertyType || '').trim()}
                    onClick={() => {
                        if (!String(draft.propertyNumber || '').trim()) return showToast('أدخل رقم العقار', 'warning');
                        if (!String(draft.propertyDistrict || '').trim()) return showToast('أدخل المقاطعة', 'warning');
                        if (!String(draft.propertyType || '').trim()) return showToast('أدخل نوع العقار', 'warning');
                        saveCoerciveAction('property', {
                            decisionRowId: decisionId,
                            propertyNumber: String(draft.propertyNumber || '').trim(),
                            propertyDistrict: String(draft.propertyDistrict || '').trim(),
                            propertyType: String(draft.propertyType || '').trim(),
                        });
                    }}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ التفاصيل
                </button>
            </div>
        );
    };

    const renderVehicleCompletion = (row: any) => {
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) return null;
        if (!isExecutorRowEffectivelyApproved(row)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;
        const draft = vehicleDetailsDraftByDecisionId[decisionId] || { movableDescription: '', movableLocation: '', judicialCustodianName: '' };
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={draft.movableDescription}
                    onChange={(e) =>
                        setVehicleDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, movableDescription: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="وصف المال المنقول"
                />
                <input
                    type="text"
                    value={draft.movableLocation}
                    onChange={(e) =>
                        setVehicleDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, movableLocation: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="مكان تواجد المال المنقول"
                />
                <input
                    type="text"
                    value={draft.judicialCustodianName}
                    onChange={(e) =>
                        setVehicleDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, judicialCustodianName: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="اسم الحارس القضائي (اختياري)"
                />
                <button
                    type="button"
                    disabled={!String(draft.movableDescription || '').trim() || !String(draft.movableLocation || '').trim()}
                    onClick={() => {
                        if (!String(draft.movableDescription || '').trim()) return showToast('أدخل وصف المال المنقول', 'warning');
                        if (!String(draft.movableLocation || '').trim()) return showToast('أدخل مكان تواجد المال المنقول', 'warning');
                        saveCoerciveAction('vehicle', {
                            decisionRowId: decisionId,
                            movableDescription: String(draft.movableDescription || '').trim(),
                            movableLocation: String(draft.movableLocation || '').trim(),
                            judicialCustodianName: String(draft.judicialCustodianName || '').trim(),
                        });
                    }}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ التفاصيل
                </button>
            </div>
        );
    };

    const buildRequestSteps = (title: string, row: any, requestKind: string, extra?: React.ReactNode): ExecutionInlineStep[] => {
        const hasRow = Boolean(row?.id);
        const rejected = hasRow ? isExecutorRowRejectedAndFinal(row) : false;
        const approved = hasRow ? isExecutorRowEffectivelyApproved(row) : false;
        const pending = hasRow ? String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '' : false;
        return [
            {
                id: `${title}:submit`,
                title,
                subtitle: hasRow ? 'تم إرسال الطلب إلى سلطة المنفذ' : 'لم يتم إرسال الطلب بعد',
                status: hasRow ? 'done' : 'active',
                tone: hasRow ? 'success' : 'neutral',
            } satisfies ExecutionInlineStep,
            {
                id: `${title}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected ? 'تم رفض الطلب' : approved ? 'تمت الموافقة' : pending ? 'قيد البت' : '—',
                status: rejected ? 'active' : pending ? 'active' : hasRow ? 'done' : 'locked',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: hasRow ? renderDecisionInline(row, requestKind) : null,
            } satisfies ExecutionInlineStep,
            ...(extra
                ? [
                      {
                          id: `${title}:details`,
                          title: 'إكمال البيانات',
                          subtitle: 'حقول مدمجة داخل نفس البطاقة',
                          status: approved && !rejected ? 'active' : 'locked',
                          tone: approved && !rejected ? 'neutral' : 'neutral',
                          content: approved && !rejected ? extra : null,
                      } satisfies ExecutionInlineStep,
                  ]
                : []),
        ];
    };

    return (
        <div className="p-4 space-y-3 text-right">
        {!activeDebtorIsDeceased ? (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        if (executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode)
                            return;
                        const did = String(findLatestGuarantorDecision?.id || '').trim();
                        const rejected = Boolean(did) && isExecutorRowRejectedAndFinal(findLatestGuarantorDecision);
                        const outcome = String(findLatestGuarantorDecision?.executorOutcome ?? 'pending').trim();
                        const alternative = outcome === 'alternative';
                        const approved =
                            Boolean(did) &&
                            !rejected &&
                            (alternative || isExecutorRowEffectivelyApproved(findLatestGuarantorDecision));
                        const detailsSaved = Boolean(
                            String(findLatestGuarantorDecision?.guarantorDetailsSavedAt || '').trim()
                        );
                        const needsCompletion = approved && !detailsSaved;
                        if (needsCompletion) {
                            openGuarantorDetails(did || undefined);
                            return;
                        }
                        if (executionData?.guarantor_followup?.details_saved === true) {
                            setGuarantorExistingWarningOpen(true);
                            return;
                        }
                        setInlineActionGateKey('guarantor_request');
                    }}
                    disabled={
                        executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-[12px] font-bold text-slate-100 backdrop-blur-xl transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-amber-400/35 hover:shadow-[0_18px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(230,198,115,0.08)] disabled:opacity-40"
                >
                    <div className="flex flex-row-reverse items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-200">
                            <Shield size={18} className="text-current" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">طلب كفيل ضامن</p>
                        </div>
                    </div>
                </button>
                <InlineActionGate
                    gateKey="guarantor_request"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        handleGuarantorRequestFromFollowup();
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
                {guarantorExistingWarningOpen ? (
                    <div className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                        <p className="text-amber-200 text-[11px] font-black">يوجد كفيل ضامن مُسجَّل في الإضبارة</p>
                        <p className="mt-1 text-amber-100/85 text-[10px] leading-relaxed">
                            هذا الطلب سيُستخدم لإدخال كفيل جديد. أكمل الطلب فقط إذا كنت تريد استبدال الكفيل الحالي.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setGuarantorExistingWarningOpen(false);
                                    setInlineActionGateKey('guarantor_request');
                                }}
                                className="rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100 hover:from-amber-800/50 hover:to-amber-700/35"
                            >
                                أتفهم الأمر
                            </button>
                            <button
                                type="button"
                                onClick={() => setGuarantorExistingWarningOpen(false)}
                                className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                ) : null}
                {findLatestGuarantorDecision ? (
                    <GuarantorWorkspaceWrapper
                        executionId={resolvedExecutionId}
                        row={findLatestGuarantorDecision}
                        guarantorFollowup={executionData?.guarantor_followup}
                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                        disabled={isHistoricalMode || coerciveUiLocked}
                        onOpenAppeals={openAppeals}
                        onOpenDecisions={openDecisions}
                        onOpenGuarantorDetails={openGuarantorDetails}
                    />
                ) : null}
            </div>
        ) : null}
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || isHistoricalMode) return;
                    const did = String(salaryRowForUi?.id || '').trim();
                    if (did) {
                        const outcome = String(salaryRowForUi?.executorOutcome ?? 'pending').trim();
                        const alternative = outcome === 'alternative';
                        const rejected = isExecutorRowRejectedAndFinal(salaryRowForUi);
                        const approved =
                            !rejected && (alternative || isExecutorRowEffectivelyApproved(salaryRowForUi));
                        const savedAt = String(salaryRowForUi?.seizureRequestSavedAt || '').trim();
                        const needsCompletion = approved && !savedAt;
                        if (needsCompletion) {
                            setSalaryExpandEpoch((v) => v + 1);
                            return;
                        }
                        if (approved && savedAt) {
                            if (coerciveUiLocked) return;
                            setInlineActionGateKey('seizure_salary');
                            return;
                        }
                        return;
                    }
                    if (coerciveUiLocked) return;
                    setInlineActionGateKey('seizure_salary');
                }}
                disabled={executionCoerciveButtonDisabled || isHistoricalMode}
                className="w-full rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.06] px-4 py-3 text-[12px] font-bold text-slate-100 hover:bg-emerald-500/[0.10] hover:border-emerald-200/25 disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                        <Wallet className="w-6 h-6 text-white/70" />
                    </span>
                    {activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب'}
                </span>
            </button>
            <InlineActionGate
                gateKey="seizure_salary"
                activeKey={inlineActionGateKey}
                onConfirm={() => {
                    setInlineActionGateKey(null);
                    const did = submitBasicSeizureRequest({
                        actionType: 'salary',
                        title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
                        body: activeDebtorIsDeceased
                            ? 'طلب حجز الحوافز والمخصصات (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                            : 'طلب حجز راتب (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                        subtype: 'salary',
                    });
                    if (did) {
                        setLastSalaryDecisionId(did);
                        setSalaryExpandEpoch((v) => v + 1);
                    }
                }}
                onCancel={() => setInlineActionGateKey(null)}
            />
            {salaryRowForUi ? (
                <SeizureWorkspaceWrapper
                    executionId={resolvedExecutionId}
                    patchExecutionIds={executionIdsForDecisions}
                    row={salaryRowForUi}
                    title={activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب'}
                    completion={renderSalaryCompletion(salaryRowForUi)}
                    onOpenAppeals={openAppeals}
                    expandSignal={salaryExpandEpoch}
                />
            ) : null}
        </div>
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || isHistoricalMode) return;
                    setInlineActionGateKey('seizure_property');
                }}
                disabled={executionCoerciveButtonDisabled || isHistoricalMode}
                className="w-full rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] px-4 py-3 text-[12px] font-bold text-slate-100 hover:bg-amber-500/[0.10] hover:border-amber-200/25 disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                        <Building2 className="w-6 h-6 text-white/70" />
                    </span>
                    طلب حجز عقار
                </span>
            </button>
            <InlineActionGate
                gateKey="seizure_property"
                activeKey={inlineActionGateKey}
                onConfirm={() => {
                    setInlineActionGateKey(null);
                    submitBasicSeizureRequest({
                        actionType: 'property',
                        title: 'طلب حجز عقار',
                        body: 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                        subtype: 'property',
                    });
                }}
                onCancel={() => setInlineActionGateKey(null)}
            />
            {propertyDecision ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps('طلب حجز عقار', propertyDecision, 'seizure', renderPropertyCompletion(propertyDecision))}
                    />
                </div>
            ) : null}
        </div>
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || isHistoricalMode) return;
                    setInlineActionGateKey('seizure_vehicle');
                }}
                disabled={executionCoerciveButtonDisabled || isHistoricalMode}
                className="w-full rounded-2xl border border-sky-300/15 bg-sky-500/[0.06] px-4 py-3 text-[12px] font-bold text-slate-100 hover:bg-sky-500/[0.10] hover:border-sky-200/25 disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                        <Package className="w-6 h-6 text-white/70" />
                    </span>
                    طلب حجز مال منقول
                </span>
            </button>
            <InlineActionGate
                gateKey="seizure_vehicle"
                activeKey={inlineActionGateKey}
                onConfirm={() => {
                    setInlineActionGateKey(null);
                    submitBasicSeizureRequest({
                        actionType: 'vehicle',
                        title: 'طلب حجز مال منقول',
                        body: 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                        subtype: 'movable_auction',
                    });
                }}
                onCancel={() => setInlineActionGateKey(null)}
            />
            {movableDecision ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps('طلب حجز مال منقول', movableDecision, 'seizure', renderVehicleCompletion(movableDecision))}
                    />
                </div>
            ) : null}
        </div>
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || isHistoricalMode) return;
                    setInlineActionGateKey('seizure_third_party');
                }}
                disabled={executionCoerciveButtonDisabled || isHistoricalMode}
                className="w-full rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] px-4 py-3 text-[12px] font-bold text-slate-100 hover:bg-violet-500/[0.10] hover:border-violet-200/25 disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                        <Users className="w-6 h-6 text-white/70" />
                    </span>
                    طلب حجز مال المدين لدى الغير
                </span>
            </button>
            <InlineActionGate gateKey="seizure_third_party" activeKey={inlineActionGateKey} onConfirm={() =>
                (() => {
                    setInlineActionGateKey(null);
                    requestFollowupSeizureDecision(
                        'third_party',
                        'حجز مال المدين لدى الغير',
                        'طلب حجز مال المدين لدى الغير وفقاً لإجراءات التنفيذ.'
                    );
                })()
            } onCancel={() => setInlineActionGateKey(null)} />
            {thirdPartyDecision ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps(
                            'طلب حجز مال المدين لدى الغير',
                            thirdPartyDecision,
                            'seizure',
                            renderThirdPartyInlineCompletionIfAny(thirdPartyDecision)
                        )}
                    />
                </div>
            ) : null}
        </div>
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || isHistoricalMode) return;
                    setInlineActionGateKey('seizure_notice_mark');
                }}
                disabled={executionCoerciveButtonDisabled || isHistoricalMode}
                className="w-full rounded-2xl border border-rose-300/15 bg-rose-500/[0.06] px-4 py-3 text-[12px] font-bold text-slate-100 hover:bg-rose-500/[0.10] hover:border-rose-200/25 disabled:opacity-40"
            >
                <span className="flex flex-row-reverse items-center gap-3">
                    <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                        <ClipboardList className="w-6 h-6 text-white/70" />
                    </span>
                    وضع إشارة الحجز التنفيذي
                </span>
            </button>
            <InlineActionGate gateKey="seizure_notice_mark" activeKey={inlineActionGateKey} onConfirm={() =>
                (() => {
                    setInlineActionGateKey(null);
                    requestFollowupSeizureDecision(
                        'notice',
                        'وضع إشارة الحجز التنفيذي',
                        'طلب وضع إشارة الحجز التنفيذي لضمان التنفيذ.'
                    );
                })()
            } onCancel={() => setInlineActionGateKey(null)} />
            {noticeDecision ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps('وضع إشارة الحجز التنفيذي', noticeDecision, 'seizure')}
                    />
                </div>
            ) : null}
        </div>
    </div>
    );
};
