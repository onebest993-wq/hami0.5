import React from 'react';
import { Plus, Scale } from 'lucide-react';
import DecisionCard from './DecisionCard';
import AppealWorkflowCard from './AppealWorkflowCard';
import type { Decision } from '../types';
import type { AppealsHubProponentFilter } from '../utils';
import { appealsHubProponentFilterLabel } from '../utils';
import type { DecisionCardProps } from './decisionCardTypes';

export type DecisionsAppealsHubViewProps = {
    isHistoricalMode: boolean;
    decisions: Decision[];
    decisionsHydrated: boolean;
    /** القرارات المرئية بعد فلترة سياق المسار — تُستخدم لحالة الفراغ والتبويبات */
    hubVisibleDecisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    setDecisionsHubTab: (tab: 'current' | 'previous' | 'appeals' | 'archive') => void;
    setShowAddModal: (v: boolean) => void;
    decisionBtnPrimary: string;
    archivePendingDecisions: Decision[];
    archiveSettledDecisions: Decision[];
    archivedDecisions: Decision[];
    filteredPreviousSettledDecisions: Decision[];
    filteredAppealsHubDecisions: Decision[];
    appealsHubDecisions: Decision[];
    previousFilter: 'all' | 'approved' | 'rejected';
    setPreviousFilter: (f: 'all' | 'approved' | 'rejected') => void;
    previousHubFilterOptions: AppealsHubProponentFilter[];
    previousProponentFilter: AppealsHubProponentFilter;
    setPreviousProponentFilter: (f: AppealsHubProponentFilter) => void;
    appealsHubFilterOptions: AppealsHubProponentFilter[];
    appealsProponentFilter: AppealsHubProponentFilter;
    setAppealsProponentFilter: (f: AppealsHubProponentFilter) => void;
    decisionCardProps: Omit<DecisionCardProps, 'decision'>;
    appealWorkflowCardProps: React.ComponentProps<typeof AppealWorkflowCard>;
};

export function DecisionsAppealsHubView(props: DecisionsAppealsHubViewProps) {
    const {
        isHistoricalMode,
        decisions,
        decisionsHydrated,
        hubVisibleDecisions,
        decisionsHubTab,
        setDecisionsHubTab,
        setShowAddModal,
        decisionBtnPrimary,
        archivePendingDecisions,
        archiveSettledDecisions,
        archivedDecisions,
        filteredPreviousSettledDecisions,
        filteredAppealsHubDecisions,
        appealsHubDecisions,
        previousFilter,
        setPreviousFilter,
        previousHubFilterOptions,
        previousProponentFilter,
        setPreviousProponentFilter,
        appealsHubFilterOptions,
        appealsProponentFilter,
        setAppealsProponentFilter,
        decisionCardProps,
        appealWorkflowCardProps,
    } = props;

    const visibleDecisions = hubVisibleDecisions;

    return (
        <>
            {!isHistoricalMode ? (
                        <button
                            type="button"
                            onClick={() => {
                                setDecisionsHubTab('previous');
                                setShowAddModal(true);
                            }}
                            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 ${decisionBtnPrimary}`}
                        >
                            <Plus size={18} className="opacity-90" />
                            إضافة قرار
                        </button>
                    ) : null}

                    <div
                        className={`space-y-4${isHistoricalMode ? ' pointer-events-none select-none opacity-[0.72]' : ''}`}
                    >
                        {!decisionsHydrated ? (
                            <div className="text-center py-6">
                                <p className="text-slate-400 text-sm">جاري تحميل القرارات…</p>
                            </div>
                        ) : decisions.length === 0 && hubVisibleDecisions.length === 0 ? (
                            <div className="text-center py-6">
                                <Scale size={40} className="text-slate-500 mx-auto mb-2" />
                                <p className="text-slate-300 text-sm">لا توجد قرارات أو طلبات بعد</p>
                            </div>
                        ) : (
                            <>
                                {visibleDecisions.length === 0 ? (
                                    <div className="text-center py-3">
                                        <p className="text-slate-400 text-xs">
                                            توجد سجلات محفوظة لكنها غير مرئية في سياق هذا المسار — راجع
                                            تبويب الأرشيف أو أعد فتح الإضبارة
                                        </p>
                                    </div>
                                ) : null}
                                <div
                                    className="flex flex-row-reverse gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md"
                                    role="tablist"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={decisionsHubTab === 'archive'}
                                        onClick={() => setDecisionsHubTab('archive')}
                                        className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                            decisionsHubTab === 'archive'
                                                ? 'bg-slate-600/90 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        سجل الأرشيف
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={decisionsHubTab === 'appeals'}
                                        onClick={() => setDecisionsHubTab('appeals')}
                                        className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                            decisionsHubTab === 'appeals'
                                                ? 'bg-amber-600/90 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        سجل الطعون
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={decisionsHubTab === 'previous'}
                                        onClick={() => setDecisionsHubTab('previous')}
                                        className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                            decisionsHubTab === 'previous'
                                                ? 'bg-slate-600/90 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        القرارات السابقة
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={decisionsHubTab === 'current'}
                                        onClick={() => setDecisionsHubTab('current')}
                                        className={`flex-1 rounded-lg py-2 px-1.5 text-[9px] sm:text-[10px] font-bold transition-colors leading-snug ${
                                            decisionsHubTab === 'current'
                                                ? 'bg-slate-600/90 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        الطلبات الحالية
                                    </button>
                                </div>

                                {decisionsHubTab === 'current' && (
                                    <div className="space-y-4">
                                        {archivePendingDecisions.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-slate-400">
                                        طلبات قيد المعالجة
                                                </p>
                                                <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                                    {archivePendingDecisions.map((d) => (
                                                        <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا توجد طلبات قيد المعالجة في الوقت الحالي
                                            </p>
                                        )}
                                    </div>
                                )}
                                {decisionsHubTab === 'previous' && (
                                    <div className="space-y-4">
                                        {/* فلاتر سريعة */}
                                        <div className="flex flex-wrap gap-2">
                                            {(['all', 'approved', 'rejected'] as const).map((f) => (
                                                <button
                                                    key={f}
                                                    type="button"
                                                    onClick={() => setPreviousFilter(f)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                        previousFilter === f
                                                            ? 'bg-slate-600/90 text-white shadow-sm'
                                                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                                    }`}
                                                >
                                                    {f === 'all'
                                                        ? 'الكل'
                                                        : f === 'approved'
                                                          ? 'الموافق عليها'
                                                          : 'المرفوضة'}
                                                </button>
                                            ))}
                                        </div>
                                        {previousHubFilterOptions.length > 1 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {previousHubFilterOptions.map((f) => (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => setPreviousProponentFilter(f)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                            previousProponentFilter === f
                                                                ? 'bg-amber-600/90 text-white shadow-sm'
                                                                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                                        }`}
                                                    >
                                                        {appealsHubProponentFilterLabel(f)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        {archiveSettledDecisions.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-gray-400">
                                                    القرارات المحسومة
                                                </p>
                                                {filteredPreviousSettledDecisions.length > 0 ? (
                                                <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                                    {filteredPreviousSettledDecisions.map((d) => (
                                                        <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                                    ))}
                                                </div>
                                                ) : (
                                                    <p className="text-center text-slate-500 text-xs py-4">
                                                        لا توجد قرارات في هذا التصنيف
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا توجد قرارات محسومة مسجّلة بعد
                                            </p>
                                        )}
                                    </div>
                                )}
                                {decisionsHubTab === 'archive' && (
                                    <div className="space-y-4">
                                        {archivedDecisions.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="border-b border-white/10 pb-2 text-right text-[11px] font-bold text-gray-400">
                                                    القرارات المؤرشفة
                                                </p>
                                                <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                                    {archivedDecisions.map((d) => (
                                                        <DecisionCard key={d.id} decision={d} {...decisionCardProps} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا توجد قرارات مؤرشفة
                                            </p>
                                        )}
                                    </div>
                                )}
                                {decisionsHubTab === 'appeals' && (
                                    <div className="space-y-2">
                                        {appealsHubFilterOptions.length > 1 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {appealsHubFilterOptions.map((f) => (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => setAppealsProponentFilter(f)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                                                            appealsProponentFilter === f
                                                                ? 'bg-amber-600/90 text-white shadow-sm'
                                                                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                                                        }`}
                                                    >
                                                        {appealsHubProponentFilterLabel(f)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        {filteredAppealsHubDecisions.length > 0 ? (
                                            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                                                {filteredAppealsHubDecisions.map((d, index) =>
                                                    d.manualExecutorLedgerEntry === true ? (
                                                        <DecisionCard
                                                            key={d.id}
                                                            decision={d}
                                                            {...decisionCardProps}
                                                            decisionsHubTab="appeals"
                                                        />
                                                    ) : (
                                                        <AppealWorkflowCard
                                                            key={d.id}
                                                            decision={d}
                                                            appealCardRank={index}
                                                            appealCardsTotal={
                                                                filteredAppealsHubDecisions.length
                                                            }
                                                            {...appealWorkflowCardProps}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        ) : appealsHubDecisions.length > 0 ? (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا توجد بطاقات في هذا التصنيف
                                            </p>
                                        ) : (
                                            <p className="text-center text-slate-500 text-xs py-4">
                                                لا يظهر هنا شيء حتى تبدأ إجراء تظلم أو تمييز على أحد القرارات
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
        </>
    );
}
