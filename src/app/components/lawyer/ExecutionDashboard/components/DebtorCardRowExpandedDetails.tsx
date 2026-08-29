import React from 'react';
import type { Debtor } from '@/app/types/execution';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowExpandedDetailsProps = {
    d: Debtor;
    rowIsLegalEntity: boolean;
    isPrimary: boolean;
    multiDebtorMode: boolean;
    rowIsEmployee: boolean;
    showDebtorNotificationPanel: boolean;
    executionToolsTimelineLockedUi: DebtorsSectionProps['executionToolsTimelineLockedUi'];
    activeDebtorIsDeceased: DebtorsSectionProps['activeDebtorIsDeceased'];
    safeActiveDebtorHeirsForNotification: unknown[];
    openHeirsNotificationCenter: DebtorsSectionProps['openHeirsNotificationCenter'];
    onOpenUnifiedSummonsHub: DebtorsSectionProps['onOpenUnifiedSummonsHub'];
    heirSubstituteLines?: string[];
    Bell: DebtorsSectionProps['Bell'];
    MapPin: DebtorsSectionProps['MapPin'];
};

export function DebtorCardRowExpandedDetails({
    d,
    rowIsLegalEntity,
    isPrimary,
    multiDebtorMode,
    rowIsEmployee,
    showDebtorNotificationPanel,
    executionToolsTimelineLockedUi,
    activeDebtorIsDeceased,
    safeActiveDebtorHeirsForNotification,
    openHeirsNotificationCenter,
    onOpenUnifiedSummonsHub,
    heirSubstituteLines,
    Bell,
    MapPin,
}: DebtorCardRowExpandedDetailsProps) {
    return (
        <>
            {heirSubstituteLines && heirSubstituteLines.length > 0 ? (
                <button
                    type="button"
                    onClick={() => openHeirsNotificationCenter()}
                    className="mb-2 w-full rounded-xl border border-cyan-400/45 bg-cyan-950/35 px-3 py-2 text-[10px] font-black text-cyan-100 hover:bg-cyan-900/40"
                >
                    إخطار الورثة
                </button>
            ) : null}
            {showDebtorNotificationPanel && (
                <div className="mb-1 rounded-xl border border-cyan-500/25 bg-slate-950/80 p-2.5">
                    <div className="mb-1.5 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-cyan-100/95">الإخطار والتبليغ</span>
                    </div>
                    <button
                        type="button"
                        disabled={executionToolsTimelineLockedUi}
                        onClick={() => {
                            if (
                                activeDebtorIsDeceased &&
                                safeActiveDebtorHeirsForNotification.length > 0
                            ) {
                                openHeirsNotificationCenter();
                                return;
                            }
                            onOpenUnifiedSummonsHub?.({
                                debtorKey: null,
                                initialMainTab: null,
                            });
                        }}
                        className={`w-full flex flex-row-reverse items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 transition-colors ${
                            executionToolsTimelineLockedUi
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-cyan-900/50 hover:border-cyan-400/45'
                        }`}
                    >
                        <Bell size={16} className="text-cyan-300 shrink-0" />
                        {activeDebtorIsDeceased &&
                        safeActiveDebtorHeirsForNotification.length > 0
                            ? 'إخطار الورثة'
                            : 'تسجيل التبليغ'}
                    </button>
                </div>
            )}
            <div className="flex flex-col gap-2">
                {rowIsLegalEntity ? (
                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                        <p className="mb-0.5 text-[10px] text-gray-400">الصفة القانونية</p>
                        <p className="text-xs font-medium text-slate-200 break-words">معنوي</p>
                    </div>
                ) : null}
                {!rowIsLegalEntity && (isPrimary || d.occupation || multiDebtorMode) ? (
                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                        <p className="mb-0.5 text-[10px] text-gray-400">الحالة الوظيفية</p>
                        <p className="text-xs font-medium text-slate-200 break-words">
                            {rowIsEmployee ? 'موظف' : 'كاسب'}
                        </p>
                    </div>
                ) : null}
                {d.address ? (
                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                            <span>العنوان (السكن)</span>
                            <MapPin size={12} className="shrink-0 text-rose-400" />
                        </div>
                        <p className="text-xs leading-snug text-white break-words [unicode-bidi:plaintext]">
                            {d.address}
                        </p>
                    </div>
                ) : null}
            </div>
            {!d.address && (
                <p className="text-gray-500 text-xs text-center py-2">لا يوجد عنوان مسجّل</p>
            )}
        </>
    );
}
