import React from 'react';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import type { Debtor, Party } from '@/app/types/execution';
import { isPrimaryPartyDeceased } from '@/app/utils/partyHeirsEditOnlyMode';
import { DebtorMemoBadgePortal, DebtorSummonsMarkerPortal } from './DebtorsSectionPortals';
import { DebtorCardRowExpandedDetails } from './DebtorCardRowExpandedDetails';
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
                            ? isPrimaryPartyDeceased('debtor', d as Party, executionData)
                            : Boolean((d as Debtor)?.isDeceased)) ||
                            rowIsLegalEntity ||
                            custodyRemovalClaimActive
                    )}
                    isHistoricalMode={isHistoricalMode}
                    editPartyLabel={
                        debtorHeirsEditOnly ? 'تعديل بيانات الورثة' : 'تعديل بيانات المدين'
                    }
                    onEditParty={() => {
                        if (multiDebtorMode && wsDebt && wsRow.fileDebtorIndex === null) {
                            showToast(
                                'لا يمكن تعديل هذا المدين من هنا بعد تسجيل الإضبارة.',
                                'info',
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
            <DebtorCardRowExpandedDetails
                d={d}
                rowIsLegalEntity={rowIsLegalEntity}
                isPrimary={isPrimary}
                multiDebtorMode={multiDebtorMode}
                rowIsEmployee={rowIsEmployee}
                showDebtorNotificationPanel={showDebtorNotificationPanel}
                executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                activeDebtorIsDeceased={activeDebtorIsDeceased}
                safeActiveDebtorHeirsForNotification={safeActiveDebtorHeirsForNotification}
                openHeirsNotificationCenter={openHeirsNotificationCenter}
                onOpenUnifiedSummonsHub={onOpenUnifiedSummonsHub}
                heirSubstituteLines={debtorDisp.heirSubstituteLines}
                Bell={Bell}
                MapPin={MapPin}
            />
            <DebtorMemoBadgePortal
                open={isPrimary && executionMemoBadgePopoverOpen}
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
