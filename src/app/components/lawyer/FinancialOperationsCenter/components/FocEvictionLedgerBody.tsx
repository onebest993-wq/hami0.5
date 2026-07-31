import React from 'react';
import { CheckCircle, History, Send } from 'lucide-react';
import { formatIqdDisplay } from '../utils';
import { SECTION_GLASS, LINK_RETRACT_COLLECTION } from '../constants';
import type { UnifiedLedgerStore } from '../types';
import type { SettlementUxTier } from '../settlementUxMatrix';
import { isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import { SettlementBuriedKebab } from './SettlementBuriedKebab';
import { ReactiveSettlementEntry } from './ReactiveSettlementEntry';
import LedgerExpenseEditCluster from './LedgerExpenseEditCluster';

export interface FocEvictionLedgerBodyProps {
    embeddedInFinancialHub?: boolean;
    evictionReenableCourtOrderedFees?: { grossAmount: number; onEnable: () => void };
    remainingUnified: number;
    totalOwedUnified: number;
    store: UnifiedLedgerStore;
    showSettlementEntry?: boolean;
    settlementUxTier?: SettlementUxTier;
    settlementInProgress: boolean;
    onActivateSettlement: () => void;
    onDeactivateSettlement: () => void;
    onShowSeizureLog?: () => void;
    setExpenseSheetOpen: (v: boolean) => void;
    setFeesSheetOpen: (v: boolean) => void;
    evictionLawyerFeeWaivedAtIntake?: boolean;
    sumLawyer: number;
    claimType?: string;
    claimTypes?: string[];
    hasPendingUnifiedCollection: boolean;
    hasApprovedUnifiedCollectionDecision: boolean;
    canSubmitEvictionPhase2: boolean;
    submitCollectionRequest: () => void;
    retractCollectionRequest: () => void;
    showSettlementPanel?: boolean;
    renderSettlementPanel: () => React.ReactNode;
    hasPaymentRows: boolean;
    undoLastPayment: () => void;
}

export const FocEvictionLedgerBody: React.FC<FocEvictionLedgerBodyProps> = ({
    embeddedInFinancialHub,
    evictionReenableCourtOrderedFees,
    remainingUnified,
    totalOwedUnified,
    store,
    showSettlementEntry,
    settlementUxTier,
    settlementInProgress,
    onActivateSettlement,
    onDeactivateSettlement,
    onShowSeizureLog,
    setExpenseSheetOpen,
    setFeesSheetOpen,
    evictionLawyerFeeWaivedAtIntake,
    sumLawyer,
    claimType,
    claimTypes,
    hasPendingUnifiedCollection,
    hasApprovedUnifiedCollectionDecision,
    canSubmitEvictionPhase2,
    submitCollectionRequest,
    retractCollectionRequest,
    showSettlementPanel,
    renderSettlementPanel,
    hasPaymentRows,
    undoLastPayment,
}) => (
    <div className="space-y-3">
        <div className={embeddedInFinancialHub ? 'flex flex-col gap-y-1' : `${SECTION_GLASS} flex flex-col gap-y-1`}>
            {evictionReenableCourtOrderedFees && (
                <button
                    type="button"
                    onClick={() => evictionReenableCourtOrderedFees.onEnable()}
                    className="mb-2 w-full rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 py-3 px-4 text-[#F5E6A8] font-bold text-xs shadow-sm"
                >
                    تفعيل مطالبة الأتعاب المحكوم بها (
                    {evictionReenableCourtOrderedFees.grossAmount.toLocaleString('ar-IQ')}{' '}
                    د.ع)
                </button>
            )}
            <div className="flex flex-col items-center text-center pb-0 mb-0 gap-y-1">
                <p className="text-[10px] text-slate-500">متبقي الوعاء</p>
                <div className="flex items-center justify-center gap-2">
                    <p
                        className="text-2xl sm:text-3xl font-black tabular-nums leading-none bg-gradient-to-b from-[#FFF8DC] via-[#E6C673] to-amber-700 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 0 14px rgba(230, 198, 115, 0.32))' }}
                    >
                        {formatIqdDisplay(remainingUnified)}
                    </p>
                    {showSettlementEntry && settlementUxTier === 'buried' && !settlementInProgress ? (
                        <SettlementBuriedKebab onActivate={onActivateSettlement} />
                    ) : null}
                    {onShowSeizureLog ? (
                        <button
                            type="button"
                            onClick={onShowSeizureLog}
                            className="inline-flex items-center justify-center rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 p-1 text-[#E6C673] transition hover:bg-[#E6C673]/20"
                            title="سجل الحجوزات"
                            aria-label="سجل الحجوزات"
                        >
                            <History size={14} strokeWidth={1.75} />
                        </button>
                    ) : null}
                    <LedgerExpenseEditCluster
                        onExpenses={() => setExpenseSheetOpen(true)}
                        onEditFees={() => setFeesSheetOpen(true)}
                        hideFees
                    />
                </div>
                {showSettlementEntry && settlementUxTier === 'primary' ? (
                    <div className="w-full pt-2">
                        <ReactiveSettlementEntry
                            tier="primary"
                            isActive={settlementInProgress}
                            onActivate={onActivateSettlement}
                            onDeactivate={onDeactivateSettlement}
                        />
                    </div>
                ) : null}
                {evictionLawyerFeeWaivedAtIntake &&
                    sumLawyer <= 0 &&
                    !isSpecificDeliveryClaim(claimType) &&
                    !(Array.isArray(claimTypes) &&
                        claimTypes.some((ct) => isSpecificDeliveryClaim(ct))) && (
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed px-1">
                        لم تُسجَّل أتعاب محكومة عند فتح الإضبارة — استخدم «تعديل» ثم «إضافة
                        بند أتعاب» لإدراجها في الوعاء وتحديث بيانات الإضبارة.
                    </p>
                )}
            </div>

            <div className="space-y-1">
                {(store.completed || remainingUnified <= 0) && totalOwedUnified > 0 && (
                    <div className="flex items-center justify-center gap-2 text-emerald-300 text-[11px] font-bold">
                        <CheckCircle size={15} />
                        منجز — الوعاء مغلق
                    </div>
                )}
                {store.garnishment && !store.completed && (
                    <p className="text-center text-[10px] text-indigo-200/90 leading-snug">
                        حجز الراتب (١/٥) مفعّل — تابع من التنفيذ والمحجوزات.
                    </p>
                )}
                {hasPendingUnifiedCollection &&
                !store.completed &&
                !hasApprovedUnifiedCollectionDecision ? (
                    <div className="w-full rounded-lg py-3 px-3 flex items-center justify-center gap-2 text-[11px] font-bold border border-slate-500/30 bg-slate-800/40 text-slate-300">
                        <CheckCircle size={16} />
                        طلب الاستحصال قيد البت — بانتظار موافقة المنفذ
                    </div>
                ) : canSubmitEvictionPhase2 ? (
                    <button
                        type="button"
                        onClick={submitCollectionRequest}
                        className="w-full rounded-lg bg-gradient-to-l from-[#E6C673] to-amber-600 py-3.5 px-4 text-[#0A0F1C] font-black text-xs shadow-md shadow-amber-900/20 disabled:opacity-35 flex items-center justify-center gap-2"
                    >
                        <Send size={16} />
                        تقديم طلب الاستحصال
                    </button>
                ) : null}
                {hasPendingUnifiedCollection &&
                    !store.completed &&
                    !hasApprovedUnifiedCollectionDecision && (
                    <button
                        type="button"
                        onClick={retractCollectionRequest}
                        className={LINK_RETRACT_COLLECTION}
                    >
                        إلغاء طلب الاستحصال والعودة لتعديل الوعاء
                    </button>
                )}
            </div>

            {showSettlementEntry &&
            settlementUxTier === 'secondary' &&
            !store.completed &&
            remainingUnified > 0 ? (
                <ReactiveSettlementEntry
                    tier="secondary"
                    isActive={settlementInProgress}
                    onActivate={onActivateSettlement}
                    onDeactivate={onDeactivateSettlement}
                />
            ) : null}

            {showSettlementPanel ? renderSettlementPanel() : null}

            {totalOwedUnified > 0 && (
                <div className="pt-2 mt-0">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] mb-2 font-medium">
                        <History size={13} />
                        سجل الدفعات
                    </div>
                    {!hasPaymentRows ? (
                        <>
                            <p className="text-center text-slate-500 text-[10px] py-2">
                                لا دفعات بعد
                            </p>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={undoLastPayment}
                                className="mb-2 w-full rounded-lg border border-rose-500/20 bg-rose-950/30 px-3 py-2 text-[11px] font-bold text-rose-200"
                            >
                                تراجع عن آخر دفعة
                            </button>
                            <ul className="space-y-2 max-h-36 overflow-y-auto text-[11px] text-slate-300">
                                {store.payments.map((p) => (
                                <li
                                    key={p.id}
                                    className="flex items-start justify-between gap-3 border-b border-white/5 pb-2"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <p className="text-[10px] text-slate-500 tabular-nums">
                                            {new Date(p.at).toLocaleDateString('ar-IQ')}
                                        </p>
                                        <p className="text-slate-400">
                                            {(p.entryType === 'disburse'
                                                ? 'صرف'
                                                : p.entryType === 'settlement'
                                                  ? 'تسوية'
                                                  : String(p.id).startsWith('pay-repay-')
                                                    ? 'تسديد'
                                                    : p.kind === 'full'
                                                      ? 'تحصيل كامل'
                                                      : 'تحصيل')}{' '}
                                            — {p.entryType === 'disburse' ? 'رصيد الأمانات' : 'متبقي الدين'}{' '}
                                            {(p.entryType === 'disburse'
                                                ? (p.trustBalanceAfter ?? p.balanceAfter)
                                                : (p.debtBalanceAfter ?? p.balanceAfter)
                                            ).toLocaleString('ar-IQ')}
                                        </p>
                                    </div>
                                    <span
                                        className={`${p.entryType === 'disburse' ? 'text-rose-300' : 'text-emerald-300'} text-sm font-black tabular-nums`}
                                    >
                                        {p.entryType === 'disburse' ? '-' : '+'}
                                        {p.amount.toLocaleString('ar-IQ')}
                                    </span>
                                </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    </div>
);
