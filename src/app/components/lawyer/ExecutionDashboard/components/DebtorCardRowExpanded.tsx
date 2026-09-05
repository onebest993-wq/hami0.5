import React from 'react';
import type { Debtor } from '@/app/types/execution';
import { DebtorMemoBadgePortal, DebtorSummonsMarkerPortal } from './DebtorsSectionPortals';
import { DebtorCardRowExpandedDetails } from './DebtorCardRowExpandedDetails';
import type { DebtorsSectionProps } from './DebtorsSection.types';

export type DebtorCardRowExpandedProps = {
    d: Debtor;
    isPrimary: boolean;
    multiDebtorMode: boolean;
    rowIsEmployee: boolean;
    rowIsLegalEntity: boolean;
    debtorDisp: {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
        heirSubstituteLines?: string[];
    };
    showDebtorNotificationPanel: boolean;
    Bell: DebtorsSectionProps['Bell'];
    X: DebtorsSectionProps['X'];
    Calendar: DebtorsSectionProps['Calendar'];
    openHeirsNotificationCenter: DebtorsSectionProps['openHeirsNotificationCenter'];
    executionToolsTimelineLockedUi: DebtorsSectionProps['executionToolsTimelineLockedUi'];
    activeDebtorIsDeceased: DebtorsSectionProps['activeDebtorIsDeceased'];
    safeActiveDebtorHeirsForNotification: unknown[];
    onOpenUnifiedSummonsHub: DebtorsSectionProps['onOpenUnifiedSummonsHub'];
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
    isPrimary,
    multiDebtorMode,
    rowIsEmployee,
    rowIsLegalEntity,
    debtorDisp,
    showDebtorNotificationPanel,
    Bell,
    X,
    Calendar,
    openHeirsNotificationCenter,
    executionToolsTimelineLockedUi,
    activeDebtorIsDeceased,
    safeActiveDebtorHeirsForNotification,
    onOpenUnifiedSummonsHub,
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
