import React from 'react';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import type { Debtor, Party } from '@/app/types/execution';
import { isPrimaryPartyDeceased } from '@/app/utils/partyHeirsEditOnlyMode';
import { DebtorMemoBadgePortal, DebtorSummonsMarkerPortal } from './DebtorsSectionPortals';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowExpandedProps = {
    d: Debtor;
    debtorKey: string;
    isPrimary: boolean;
    idx: number;
    wsDebt: boolean;
    wsRow: DebtorWorkspaceEntryContract;
    multiDebtorMode: boolean;
    rowIsEmployee: boolean;
    rowEmploymentToggleLabel: string;
    rowIsLegalEntity: boolean;
    debtorHeirsEditOnly: boolean;
    debtorDisp: {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
        heirSubstituteLines?: string[];
    };
    showDebtorNotificationPanel: boolean;
    custodyRemovalClaimActive: boolean;
    Bell: DebtorsSectionProps['Bell'];
    Phone: DebtorsSectionProps['Phone'];
    MapPin: DebtorsSectionProps['MapPin'];
    X: DebtorsSectionProps['X'];
    Calendar: DebtorsSectionProps['Calendar'];
    debtorDeathMenuLabel: DebtorsSectionProps['debtorDeathMenuLabel'];
    handleDebtorDeathMenuAction: DebtorsSectionProps['handleDebtorDeathMenuAction'];
    handleDebtorEmploymentToggle: DebtorsSectionProps['handleDebtorEmploymentToggle'];
    isHistoricalMode: DebtorsSectionProps['isHistoricalMode'];
    showToast: DebtorsSectionProps['showToast'];
    openEditParty: DebtorsSectionProps['openEditParty'];
    openHeirsNotificationCenter: DebtorsSectionProps['openHeirsNotificationCenter'];
    executionToolsTimelineLockedUi: DebtorsSectionProps['executionToolsTimelineLockedUi'];
    activeDebtorIsDeceased: DebtorsSectionProps['activeDebtorIsDeceased'];
    safeActiveDebtorHeirsForNotification: unknown[];
    onOpenUnifiedSummonsHub: DebtorsSectionProps['onOpenUnifiedSummonsHub'];
    executionData: DebtorsSectionProps['executionData'];
    executionMemoBadgePopoverOpen: DebtorsSectionProps['executionMemoBadgePopoverOpen'];
    primaryMemoNoticeBadge: DebtorsSectionProps['primaryMemoNoticeBadge'];
    showDebtorUnservedMemoBadge: DebtorsSectionProps['showDebtorUnservedMemoBadge'];
    setExecutionMemoBadgePopoverOpen: DebtorsSectionProps['setExecutionMemoBadgePopoverOpen'];
    showDebtorSummonsAttendanceBadge: DebtorsSectionProps['showDebtorSummonsAttendanceBadge'];
    summonsMarkerPopoverOpen: DebtorsSectionProps['summonsMarkerPopoverOpen'];
    debtorSummonsMarkerLocal: DebtorsSectionProps['debtorSummonsMarkerLocal'];
    summonsPurposeDraft: DebtorsSectionProps['summonsPurposeDraft'];
    setSummonsPurposeDraft: DebtorsSectionProps['setSummonsPurposeDraft'];
    setSummonsMarkerPopoverOpen: DebtorsSectionProps['setSummonsMarkerPopoverOpen'];
    saveSummonsMarkerPurposeEdit: DebtorsSectionProps['saveSummonsMarkerPurposeEdit'];
    clearDebtorSummonsMarker: DebtorsSectionProps['clearDebtorSummonsMarker'];
};

export function DebtorCardRowExpanded({
    d,
    debtorKey,
    isPrimary,
    idx,
    wsDebt,
    wsRow,
    multiDebtorMode,
    rowIsEmployee,
    rowEmploymentToggleLabel,
    rowIsLegalEntity,
    debtorHeirsEditOnly,
    debtorDisp,
    showDebtorNotificationPanel,
    custodyRemovalClaimActive,
    Bell,
    Phone,
    MapPin,
    X,
    Calendar,
    debtorDeathMenuLabel,
    handleDebtorDeathMenuAction,
    handleDebtorEmploymentToggle,
    isHistoricalMode,
    showToast,
    openEditParty,
    openHeirsNotificationCenter,
    executionToolsTimelineLockedUi,
    activeDebtorIsDeceased,
    safeActiveDebtorHeirsForNotification,
    onOpenUnifiedSummonsHub,
    executionData,
    executionMemoBadgePopoverOpen,
    primaryMemoNoticeBadge,
    showDebtorUnservedMemoBadge,
    setExecutionMemoBadgePopoverOpen,
    showDebtorSummonsAttendanceBadge,
    summonsMarkerPopoverOpen,
    debtorSummonsMarkerLocal,
    summonsPurposeDraft,
    setSummonsPurposeDraft,
    setSummonsMarkerPopoverOpen,
    saveSummonsMarkerPurposeEdit,
    clearDebtorSummonsMarker,
}: DebtorCardRowExpandedProps) {
    return (
                                                    <div className="space-y-1.5 text-right" dir="rtl">
                                                        <div className="relative z-20 mb-2 flex items-center justify-end pointer-events-auto">
                                                            <ExecutionPartySpecialActionsMenu
                                                                variant="debtor"
                                                                debtorDeathEntryLabel={debtorDeathMenuLabel}
                                                                onReportDebtorDeath={handleDebtorDeathMenuAction}
                                                                debtorIsEmployee={rowIsEmployee}
                                                                debtorEmploymentToggleLabel={rowEmploymentToggleLabel}
                                                                onToggleDebtorEmployment={() =>
                                                                    handleDebtorEmploymentToggle({
                                                                        debtorKey,
                                                                        isPrimary,
                                                                    })
                                                                }
                                                                debtorEmploymentToggleToKasabDisabled={false}
                                                                hideDebtorEmploymentToggle={Boolean(
                                                                    (isPrimary
                                                                        ? isPrimaryPartyDeceased(
                                                                              'debtor',
                                                                              d as Party,
                                                                              executionData,
                                                                          )
                                                                        : Boolean((d as Debtor)?.isDeceased)) ||
                                                                        rowIsLegalEntity ||
                                                                        custodyRemovalClaimActive
                                                                )}
                                                                isHistoricalMode={isHistoricalMode}
                                                                editPartyLabel={
                                                                    debtorHeirsEditOnly
                                                                        ? 'تعديل بيانات الورثة'
                                                                        : 'تعديل بيانات المدين'
                                                                }
                                                                onEditParty={() => {
                                                                    if (
                                                                        multiDebtorMode &&
                                                                        wsDebt &&
                                                                        wsRow.fileDebtorIndex === null
                                                                    ) {
                                                                        showToast(
                                                                            'لا يمكن تعديل هذا المدين من هنا بعد تسجيل الإضبارة.',
                                                                            'info'
                                                                        );
                                                                        return;
                                                                    }
                                                                    openEditParty('debtor', idx, {
                                                                        party: d as Party,
                                                                        forceHeirs: debtorHeirsEditOnly,
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        {debtorDisp.heirSubstituteLines &&
                                                        debtorDisp.heirSubstituteLines.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHeirsNotificationCenter()}
                                                            className="mb-2 w-full rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-900/35 to-blue-900/35 px-3 py-2 text-[10px] font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:from-cyan-800/40 hover:to-blue-800/40"
                                                        >
                                                            إخطار الورثة
                                                        </button>
                                                    ) : null}
                                                    {showDebtorNotificationPanel && (
                                                        <div className="mb-1 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-cyan-950/25 p-2.5 shadow-inner shadow-black/20">
                                                            <div className="mb-1.5 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-bold text-cyan-100/95">
                                                                    الإخطار والتبليغ
                                                                </span>
                                                            </div>
                                                            {null}
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
                                                                    onOpenUnifiedSummonsHub({
                                                                        debtorKey: null,
                                                                        initialMainTab: null,
                                                                    });
                                                                }}
                                                                className={`w-full flex flex-row-reverse items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 transition-all ${
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
                                                                <p className="mb-0.5 text-[10px] text-gray-400">
                                                                    الصفة القانونية
                                                                </p>
                                                                <p className="text-xs font-medium text-slate-200 break-words">
                                                                    معنوي
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                        {!rowIsLegalEntity &&
                                                        (isPrimary || d.occupation || multiDebtorMode) ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <p className="mb-0.5 text-[10px] text-gray-400">
                                                                    الحالة الوظيفية
                                                                </p>
                                                                <p className="text-xs font-medium text-slate-200 break-words">
                                                                    {rowIsEmployee ? 'موظف' : 'كاسب'}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                        {d.address ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                    <span>العنوان (السكن)</span>
                                                                    <MapPin
                                                                        size={12}
                                                                        className="shrink-0 text-rose-400"
                                                                    />
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

                                                    <DebtorMemoBadgePortal
                                                        open={
                                                            isPrimary &&
                                                            executionMemoBadgePopoverOpen
                                                        }
                                                        primaryMemoNoticeBadge={primaryMemoNoticeBadge}
                                                        showDebtorUnservedMemoBadge={showDebtorUnservedMemoBadge}
                                                        setExecutionMemoBadgePopoverOpen={setExecutionMemoBadgePopoverOpen}
                                                        onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
                                                        X={X}
                                                        Calendar={Calendar}
                                                    />

                                                    <DebtorSummonsMarkerPortal
                                                        open={
                                                            isPrimary &&
                                                            showDebtorSummonsAttendanceBadge &&
                                                            summonsMarkerPopoverOpen
                                                        }
                                                        debtorSummonsMarkerLocal={debtorSummonsMarkerLocal}
                                                        summonsPurposeDraft={summonsPurposeDraft}
                                                        setSummonsPurposeDraft={setSummonsPurposeDraft}
                                                        setSummonsMarkerPopoverOpen={setSummonsMarkerPopoverOpen}
                                                        saveSummonsMarkerPurposeEdit={saveSummonsMarkerPurposeEdit}
                                                        clearDebtorSummonsMarker={clearDebtorSummonsMarker}
                                                        X={X}
                                                        Bell={Bell}
                                                    />
                                                    </div>
    );
}
