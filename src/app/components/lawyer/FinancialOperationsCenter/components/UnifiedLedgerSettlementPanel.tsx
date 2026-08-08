import React from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, CalendarClock, ChevronDown, ChevronUp, Handshake, X, XCircle } from '@/app/components/ui/lucideIcons';
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="space-y-3 border-t border-white/10 pt-3"
        >
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={handleCollapseToggle}
                    className="shrink-0 inline-flex items-center justify-center rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-200"
                    aria-label={bodyExpanded ? 'طي التسوية' : 'توسيع التسوية'}
                    aria-expanded={bodyExpanded}
                >
                    {bodyExpanded ? (
                        <ChevronUp size={16} strokeWidth={2.25} />
                    ) : (
                        <ChevronDown size={16} strokeWidth={2.25} />
                    )}
                </button>
                <p className="text-sm text-cyan-100/90 text-right font-semibold flex-1">التسوية المالية</p>
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
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium text-cyan-300/80">تسوية مسجلة</p>
                            <p className="text-[15px] font-black text-cyan-50 tabular-nums">
                                {formatIqdDisplay(pending!.amount)} د.ع
                            </p>
                            <p className="mt-1 flex flex-row-reverse items-center gap-1.5 text-[10px] text-slate-400">
                                <CalendarClock size={12} className="text-cyan-400/80" />
                                موعد السداد:{' '}
                                <span className="font-semibold text-slate-200 tabular-nums">
                                    {pending!.dueDate}
                                </span>
                            </p>
                            {duePhaseLabel ? (
                                <p
                                    className={`mt-1 text-[10px] font-bold ${
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
                        <Handshake size={16} className="shrink-0 text-cyan-400" />
                    </div>

                    {showDueActions && !settlementBreachOpen ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={markPendingSettlementPaid}
                                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-100 text-[11px] font-black hover:bg-emerald-500/20 transition flex items-center justify-center gap-2"
                            >
                                <BadgeCheck size={14} className="text-emerald-400" />
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
                                className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-rose-100 text-[11px] font-black hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
                            >
                                <X size={14} className="text-rose-300" />
                                لم يتم التسديد
                            </button>
                        </div>
                    ) : null}

                    {settlementBreachOpen ? (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-rose-500/35 bg-rose-950/30 p-3 space-y-2"
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
                                className="w-full rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2.5 text-rose-50 text-[11px] font-black hover:bg-rose-500/30 transition flex items-center justify-center gap-2"
                            >
                                <XCircle size={14} />
                                إلغاء التسوية
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettlementBreachOpen(false)}
                                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 py-1"
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
