import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { formatIqdDisplay } from '../utils';
import type { SettlementDuePhase } from '../utils';
import type { UnifiedLedgerStore } from '../types';
import type { SettlementUxTier } from '../settlementUxMatrix';
import { resolveSettlementContext } from '../settlementContext';
import { SettlementScheduleCard } from './SettlementScheduleCard';

export interface UnifiedLedgerSettlementPanelProps {
    settlementUxTier: SettlementUxTier;
    panelOpen: boolean;
    onClosePanel: () => void;
    store: UnifiedLedgerStore;
    remainingUnified: number;
    settlementInput: string;
    setSettlementInput: (v: string) => void;
    settlementDueDateInput: string;
    setSettlementDueDateInput: (v: string) => void;
    showSettlementForm: boolean;
    setShowSettlementForm: (v: boolean) => void;
    registerSettlementPlan: () => boolean | Promise<boolean>;
    markPendingSettlementPaid: () => void;
    cancelPendingSettlement: () => void;
    canApplySettlementAny: boolean;
    showSettlementDueActions: boolean;
    pendingSettlementDuePhase: SettlementDuePhase | null;
    pendingSettlementDueYmd: string;
    onNotify: (message: string, type?: 'warning' | 'info' | 'success') => void;
    salarySeizureActive?: boolean;
}

export const UnifiedLedgerSettlementPanel: React.FC<UnifiedLedgerSettlementPanelProps> = ({
    settlementUxTier,
    panelOpen,
    onClosePanel,
    store,
    remainingUnified,
    settlementInput,
    setSettlementInput,
    settlementDueDateInput,
    setSettlementDueDateInput,
    showSettlementForm,
    setShowSettlementForm,
    registerSettlementPlan,
    markPendingSettlementPaid,
    cancelPendingSettlement,
    canApplySettlementAny,
    showSettlementDueActions,
    pendingSettlementDuePhase,
    pendingSettlementDueYmd,
    onNotify,
    salarySeizureActive = false,
}) => {
    const [settlementBreachOpen, setSettlementBreachOpen] = React.useState(false);
    const [bodyExpanded, setBodyExpanded] = React.useState(true);
    const currentYmd = React.useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    React.useEffect(() => {
        setSettlementBreachOpen(false);
    }, [store.pendingSettlement?.id, store.pendingSettlement?.dueDate, pendingSettlementDueYmd]);

    React.useEffect(() => {
        if (panelOpen || store.pendingSettlement) setBodyExpanded(true);
    }, [panelOpen, store.pendingSettlement?.id]);

    const handleCollapseToggle = () => {
        if (bodyExpanded) {
            setBodyExpanded(false);
            if (!store.pendingSettlement) onClosePanel();
            return;
        }
        setBodyExpanded(true);
    };

    const settlementContext = resolveSettlementContext({
        settlementUxTier,
        remainingUnified,
        completed: store.completed,
        panelOpen,
        showSettlementForm,
        pendingSettlement: store.pendingSettlement,
        pendingSettlementDueYmd,
        currentYmd,
        isFinancialDebtCollectionClaim: false,
        financialCenterTotalIqd: remainingUnified,
        settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
        salarySeizureActive,
    });

    if (!settlementContext.showSettlementPanel) return null;

    const pending = store.pendingSettlement;
    const showNewSettlementForm = settlementContext.showNewSettlementForm;
    const showPendingSummary = settlementContext.showPendingSummary;
    const showDueActions = settlementContext.showSettlementDueActions;
    const phase = settlementContext.pendingSettlementDuePhase ?? pendingSettlementDuePhase;

    const duePhaseLabel =
        phase === 'waiting'
            ? 'بانتظار موعد السداد'
            : phase === 'due'
              ? 'حان موعد السداد'
              : phase === 'overdue'
                ? 'تجاوز موعد السداد'
                : null;

    return (
        <motion.div
            key={`${settlementUxTier}-${panelOpen ? 'open' : 'closed'}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="space-y-2.5 border-t border-white/[0.07] pt-2.5"
        >
            <div className="flex items-center justify-between gap-2" dir="rtl">
                <p className="flex-1 text-[12px] font-semibold text-slate-200 text-right">التسوية المالية</p>
                <button
                    type="button"
                    onClick={handleCollapseToggle}
                    className="shrink-0 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200"
                    aria-label={bodyExpanded ? 'طي التسوية' : 'توسيع التسوية'}
                    aria-expanded={bodyExpanded}
                >
                    {bodyExpanded ? (
                        <ChevronUp size={15} strokeWidth={2.25} />
                    ) : (
                        <ChevronDown size={15} strokeWidth={2.25} />
                    )}
                </button>
            </div>

            {bodyExpanded && showNewSettlementForm ? (
                <SettlementScheduleCard
                    settlementInput={settlementInput}
                    setSettlementInput={setSettlementInput}
                    settlementDueDateInput={settlementDueDateInput}
                    setSettlementDueDateInput={setSettlementDueDateInput}
                    canApply={canApplySettlementAny}
                    onSave={async () => {
                        const ok = await Promise.resolve(registerSettlementPlan());
                        if (ok) setShowSettlementForm(false);
                    }}
                />
            ) : null}

            {bodyExpanded && showPendingSummary ? (
                <div className="space-y-2 text-right">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-right">
                        <p className="text-[9px] font-medium text-slate-500">تسوية مسجلة</p>
                        <p className="text-[14px] font-bold text-white tabular-nums">
                            {formatIqdDisplay(pending!.amount)} د.ع
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                            موعد السداد:{' '}
                            <span className="font-semibold text-slate-200 tabular-nums">
                                {pending!.dueDate}
                            </span>
                        </p>
                        {duePhaseLabel ? (
                            <p
                                className={`mt-1 text-[10px] font-semibold ${
                                    phase === 'waiting'
                                        ? 'text-slate-400'
                                        : phase === 'due'
                                          ? 'text-amber-300'
                                          : 'text-rose-300'
                                }`}
                            >
                                {duePhaseLabel}
                            </p>
                        ) : null}
                    </div>

                    {showDueActions && !settlementBreachOpen ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <button
                                type="button"
                                onClick={markPendingSettlementPaid}
                                className="w-full min-h-[40px] rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-500/16"
                            >
                                تم التسديد
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSettlementBreachOpen(true);
                                    onNotify(
                                        'لم يتم التسديد ضمن الموعد — يمكنك إلغاء التسوية أو متابعة الإجراءات الجبرية.',
                                        'warning'
                                    );
                                }}
                                className="w-full min-h-[40px] rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/16"
                            >
                                لم يتم التسديد
                            </button>
                        </div>
                    ) : null}

                    {settlementBreachOpen ? (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-rose-500/30 bg-rose-950/25 p-2.5 space-y-1.5"
                        >
                            <p className="text-[10px] text-rose-200/90 text-right leading-relaxed">
                                نكس التسوية — يمكن إلغاؤها لإعادة دورة الحياة كما لم تكن موجودة.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    cancelPendingSettlement();
                                    setSettlementBreachOpen(false);
                                }}
                                className="w-full min-h-[40px] rounded-lg border border-rose-400/35 bg-rose-500/18 px-3 py-2 text-[11px] font-bold text-rose-50 transition hover:bg-rose-500/26"
                            >
                                إلغاء التسوية
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettlementBreachOpen(false)}
                                className="w-full py-1 text-center text-[10px] text-slate-400 hover:text-slate-200"
                            >
                                تراجع
                            </button>
                        </motion.div>
                    ) : null}
                </div>
            ) : null}
        </motion.div>
    );
};
