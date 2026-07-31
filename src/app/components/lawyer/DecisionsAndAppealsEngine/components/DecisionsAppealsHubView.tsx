import React from 'react';
import { Plus, Scale } from 'lucide-react';
import DecisionCard from './DecisionCard';
import AppealWorkflowCard from './AppealWorkflowCard';
import type { Decision } from '../types';
import type { AppealsHubProponentFilter } from '../utils';
import { appealsHubProponentFilterLabel } from '../utils';
import type { DecisionCardProps } from './decisionCardTypes';

type HubTabId = 'current' | 'previous' | 'appeals' | 'archive';

function HubTabButton({
    tabId,
    label,
    count,
    active,
    onSelect,
    activeClassName,
}: {
    tabId: HubTabId;
    label: string;
    count: number;
    active: boolean;
    onSelect: (tab: HubTabId) => void;
    activeClassName: string;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tabId)}
            className={`flex min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-2 text-[9px] font-bold leading-snug transition-colors sm:px-2.5 sm:text-[10px] ${
                active ? activeClassName : 'text-slate-400 hover:text-slate-200'
            }`}
        >
            <span className="inline-flex max-w-full items-center justify-center gap-1.5">
                <span className="truncate">{label}</span>
                <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold tabular-nums sm:text-[9px] ${
                        active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                    }`}
                    aria-label={`${count} بطاقة`}
                >
                    {count}
                </span>
            </span>
        </button>
    );
}

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

    const hubTabCounts: Record<HubTabId, number> = {
        current: archivePendingDecisions.length,
        previous: archiveSettledDecisions.length,
        appeals: appealsHubDecisions.length,
        archive: archivedDecisions.length,
    };

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
                                    className="flex flex-row-reverse gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-md"
                                    role="tablist"
                                >
                                    <HubTabButton
                                        tabId="archive"
                                        label="سجل الأرشيف"
                                        count={hubTabCounts.archive}
                                        active={decisionsHubTab === 'archive'}
                                        onSelect={setDecisionsHubTab}
                                        activeClassName="bg-slate-600/90 text-white shadow-sm"
                                    />
                                    <HubTabButton
                                        tabId="appeals"
                                        label="سجل الطعون"
                                        count={hubTabCounts.appeals}
                                        active={decisionsHubTab === 'appeals'}
                                        onSelect={setDecisionsHubTab}
                                        activeClassName="bg-amber-600/90 text-white shadow-sm"
                                    />
                                    <HubTabButton
                                        tabId="previous"
                                        label="القرارات السابقة"
                                        count={hubTabCounts.previous}
                                        active={decisionsHubTab === 'previous'}
                                        onSelect={setDecisionsHubTab}
                                        activeClassName="bg-slate-600/90 text-white shadow-sm"
                                    />
                                    <HubTabButton
                                        tabId="current"
                                        label="الطلبات الحالية"
                                        count={hubTabCounts.current}
                                        active={decisionsHubTab === 'current'}
                                        onSelect={setDecisionsHubTab}
                                        activeClassName="bg-slate-600/90 text-white shadow-sm"
                                    />
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
