import React from 'react';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { BadgeCheck } from '@/app/components/ui/icons/BadgeCheck';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Handshake } from '@/app/components/ui/icons/Handshake';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { formatIqdDisplay, formatNumberInput } from '../utils';
import type { SettlementDuePhase } from '../utils';
import type { PendingSettlement, UnifiedLedgerStore } from '../types';

export interface DebtorAgentSeizedItem {
    id: string;
    kind: 'property' | 'salary' | 'movable' | 'third_party' | 'mark';
    title: string;
    subtitle?: string;
    statusLabel?: string;
}

export interface DebtorAgentFinancialHubPanelProps {
    remainingUnified: number;
    totalOwedUnified: number;
    repaymentInput: string;
    setRepaymentInput: (v: string) => void;
    applyDebtRepayment: () => boolean;
    canApplyRepayment: boolean;
    store: UnifiedLedgerStore;
    settlementInput: string;
    setSettlementInput: (v: string) => void;
    settlementDueDateInput: string;
    setSettlementDueDateInput: (v: string) => void;
    registerSettlementPlan: () => Promise<boolean>;
    revertSettlementPlan: () => void;
    markPendingSettlementPaid: () => void;
    showSettlementDueActions: boolean;
    pendingSettlementDuePhase: SettlementDuePhase | null;
    seizedItems: DebtorAgentSeizedItem[];
    completed: boolean;
}

function CollapsibleActionStrip({
    tone,
    icon: Icon,
    title,
    expanded,
    onToggle,
    disabled = false,
    badge,
    children,
}: {
    tone: 'emerald' | 'violet';
    icon: React.ElementType;
    title: string;
    expanded: boolean;
    onToggle: () => void;
    disabled?: boolean;
    badge?: string;
    children: React.ReactNode;
}) {
    const toneClasses =
        tone === 'emerald'
            ? {
                  shell: 'border-emerald-500/15 bg-emerald-500/[0.04]',
                  hover: 'hover:bg-emerald-500/[0.05]',
                  icon: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
                  title: 'text-emerald-100',
                  divider: 'border-emerald-500/10',
              }
            : {
                  shell: 'border-violet-500/15 bg-violet-500/[0.04]',
                  hover: 'hover:bg-violet-500/[0.05]',
                  icon: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
                  title: 'text-violet-100',
                  divider: 'border-violet-500/10',
              };

    return (
        <div className={`overflow-hidden rounded-xl border ${toneClasses.shell}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={onToggle}
                aria-expanded={expanded}
                className={`flex w-full flex-row-reverse items-center justify-between gap-2 px-3 py-2.5 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses.hover}`}
            >
                <span className="flex min-w-0 flex-row-reverse items-center gap-2">
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${toneClasses.icon}`}
                    >
                        <Icon size={15} />
                    </span>
                    <span className={`text-[11px] font-bold ${toneClasses.title}`}>{title}</span>
                </span>
                <span className="flex shrink-0 flex-row-reverse items-center gap-1.5">
                    {badge ? (
                        <span className="rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-bold text-slate-300">
                            {badge}
                        </span>
                    ) : null}
                    <motion.span
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 text-slate-400"
                    >
                        <ChevronDown size={13} />
                    </motion.span>
                </span>
            </button>

            <AnimatePresence initial={false}>
                {expanded ? (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className={`space-y-2 border-t px-3 pb-3 pt-2 ${toneClasses.divider}`}>
                            {children}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function formatPaymentYmd(at: string): string {
    const raw = String(at || '').trim();
    if (raw.length >= 10) return raw.slice(0, 10);
    return '—';
}

function duePhaseLabel(phase: SettlementDuePhase | null): string | null {
    if (phase === 'waiting') return 'بانتظار موعد السداد';
    if (phase === 'due') return 'حان موعد السداد';
    if (phase === 'overdue') return 'تجاوز موعد السداد';
    return null;
}

export const DebtorAgentFinancialHubPanel: React.FC<DebtorAgentFinancialHubPanelProps> = ({
    remainingUnified,
    totalOwedUnified,
    repaymentInput,
    setRepaymentInput,
    applyDebtRepayment,
    canApplyRepayment,
    store,
    settlementInput,
    setSettlementInput,
    settlementDueDateInput,
    setSettlementDueDateInput,
    registerSettlementPlan,
    revertSettlementPlan,
    markPendingSettlementPaid,
    showSettlementDueActions,
    pendingSettlementDuePhase,
    seizedItems,
    completed,
}) => {
    const pending = store.pendingSettlement as PendingSettlement | null | undefined;
    const [repaymentExpanded, setRepaymentExpanded] = React.useState(false);
    const [settlementExpanded, setSettlementExpanded] = React.useState(false);

    const showRepayment = !completed && remainingUnified > 0;
    const recentPayments = React.useMemo(
        () =>
            store.payments
                .filter((p) => p.entryType !== 'disburse')
                .slice(0, 4),
        [store.payments]
    );

    React.useEffect(() => {
        if (!showRepayment) setRepaymentExpanded(false);
    }, [showRepayment]);

    React.useEffect(() => {
        if (pending) setSettlementExpanded(true);
    }, [pending?.id]);

    const phaseLabel = duePhaseLabel(pendingSettlementDuePhase);

    return (
        <div className="space-y-2 pb-1" dir="rtl">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-right">
                <div className="flex flex-row-reverse gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-medium text-slate-500">المبلغ المتبقي على موكلك</p>
                        <p className="mt-0.5 text-xl font-black tabular-nums text-[#E6C673]">
                            {formatIqdDisplay(remainingUnified)}{' '}
                            <span className="text-[10px] font-semibold text-slate-400">د.ع</span>
                        </p>
                        {totalOwedUnified > remainingUnified ? (
                            <p className="mt-0.5 text-[9px] text-slate-500">
                                إجمالي الوعاء {formatIqdDisplay(totalOwedUnified)} د.ع
                            </p>
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-1 border-r border-white/8 pr-3">
                        <p className="text-[9px] font-medium text-slate-500">سجل الدفعات</p>
                        {pending ? (
                            <p className="mt-1 text-[9px] leading-snug text-violet-200/90">
                                تسوية {formatIqdDisplay(pending.amount)} د.ع
                                <span className="text-slate-500"> — استحقاق </span>
                                <span className="tabular-nums text-slate-300">{pending.dueDate}</span>
                            </p>
                        ) : null}
                        {recentPayments.length > 0 ? (
                            <ul className="mt-1 space-y-0.5">
                                {recentPayments.map((p) => (
                                    <li
                                        key={p.id}
                                        className="flex flex-row-reverse items-center justify-between gap-2 text-[9px]"
                                    >
                                        <span className="tabular-nums font-semibold text-emerald-100/90">
                                            {formatIqdDisplay(p.amount)} د.ع
                                        </span>
                                        <span className="truncate text-slate-500">
                                            {formatPaymentYmd(p.at)}
                                            {p.entryType === 'settlement' ? ' · تسوية' : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : !pending ? (
                            <p className="mt-1 text-[9px] text-slate-600">لا دفعات مسجّلة بعد</p>
                        ) : null}
                    </div>
                </div>
            </div>

            {showRepayment ? (
                <CollapsibleActionStrip
                    tone="emerald"
                    icon={Wallet}
                    title="تسديد"
                    expanded={repaymentExpanded}
                    onToggle={() => setRepaymentExpanded((v) => !v)}
                >
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={repaymentInput}
                            onChange={(e) => setRepaymentInput(formatNumberInput(e.target.value))}
                            placeholder="مبلغ التسديد"
                            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
                        />
                        <button
                            type="button"
                            disabled={!canApplyRepayment}
                            onClick={() => {
                                if (applyDebtRepayment()) setRepaymentExpanded(false);
                            }}
                            className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-600/20 px-3 py-1.5 text-[10px] font-bold text-emerald-50 disabled:opacity-40"
                        >
                            تسجيل دفعة
                        </button>
                    </div>
                </CollapsibleActionStrip>
            ) : null}

            <CollapsibleActionStrip
                tone="violet"
                icon={Handshake}
                title="التسوية"
                expanded={settlementExpanded}
                onToggle={() => setSettlementExpanded((v) => !v)}
                badge={pending ? 'مقفلة' : undefined}
                disabled={false}
            >
                {pending ? (
                    <div className="space-y-2 rounded-lg border border-violet-500/20 bg-black/20 p-2.5">
                        <div className="flex flex-row-reverse items-start justify-between gap-2">
                            <div className="min-w-0 text-right">
                                <p className="text-[9px] text-slate-400">تسوية مسجّلة ومقفلة</p>
                                <p className="text-[13px] font-black tabular-nums text-violet-100">
                                    {formatIqdDisplay(pending.amount)} د.ع
                                </p>
                                <p className="mt-0.5 text-[9px] text-slate-400">
                                    موعد السداد{' '}
                                    <span className="font-semibold tabular-nums text-slate-200">
                                        {pending.dueDate}
                                    </span>
                                </p>
                                {phaseLabel ? (
                                    <p
                                        className={`mt-0.5 text-[9px] font-bold ${
                                            pendingSettlementDuePhase === 'waiting'
                                                ? 'text-slate-500'
                                                : pendingSettlementDuePhase === 'due'
                                                  ? 'text-amber-300'
                                                  : 'text-rose-300'
                                        }`}
                                    >
                                        {phaseLabel}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {showSettlementDueActions ? (
                            <button
                                type="button"
                                onClick={markPendingSettlementPaid}
                                className="flex w-full flex-row-reverse items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/16"
                            >
                                <BadgeCheck size={13} />
                                تم دفع المبلغ
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                revertSettlementPlan();
                                setSettlementExpanded(false);
                                setSettlementInput('');
                                setSettlementDueDateInput('');
                            }}
                            className="w-full text-center text-[8px] font-medium text-slate-500 underline decoration-slate-600/60 underline-offset-2 hover:text-slate-300"
                        >
                            إلغاء التسوية
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={settlementInput}
                            onChange={(e) => setSettlementInput(formatNumberInput(e.target.value))}
                            placeholder="مبلغ التسوية"
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/35"
                        />
                        <input
                            type="date"
                            value={settlementDueDateInput}
                            onChange={(e) => setSettlementDueDateInput(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/35"
                        />
                        <button
                            type="button"
                            onClick={async () => {
                                const ok = await registerSettlementPlan();
                                if (ok) setSettlementExpanded(true);
                            }}
                            className="w-full rounded-lg border border-violet-500/30 bg-violet-600/15 py-2 text-[10px] font-bold text-violet-50"
                        >
                            تسجيل تسوية
                        </button>
                    </div>
                )}
            </CollapsibleActionStrip>

            {seizedItems.length > 0 ? (
                <div className="space-y-1.5 rounded-xl border border-amber-500/15 bg-amber-950/10 p-2.5">
                    <p className="text-[10px] font-bold text-amber-100">ما تم حجزه (قرار الدائن)</p>
                    <ul className="space-y-1">
                        {seizedItems.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-lg border border-white/8 bg-black/25 px-2 py-1.5 text-right"
                            >
                                <p className="text-[10px] font-semibold text-slate-100">{item.title}</p>
                                {item.subtitle ? (
                                    <p className="text-[9px] text-slate-400">{item.subtitle}</p>
                                ) : null}
                                {item.statusLabel ? (
                                    <p className="mt-0.5 text-[8px] font-bold text-amber-200/90">
                                        {item.statusLabel}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
};
