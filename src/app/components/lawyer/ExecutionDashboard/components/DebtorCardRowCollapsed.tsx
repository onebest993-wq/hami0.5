import React from 'react';
import type { Debtor } from '@/app/types/execution';
import type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';
import type { DebtorsSectionProps } from './DebtorsSection.types';
import { DebtorCardRowNameHeading } from './debtorCardRow/DebtorCardRowNameHeading';
import { DebtorCardRowInlineStatusChips } from './debtorCardRow/DebtorCardRowInlineStatusChips';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import { LazyDebtorCardRowBadgesCluster } from '../debtorCardRowBadgesClusterLazy';

const DEBTOR_BADGES_PAINT_SLOT = (
    <div
        className="h-11 min-h-[44px] w-full rounded-lg border border-white/8 bg-white/[0.04]"
        aria-hidden
        data-testid="debtor-badges-paint-slot"
    />
);

export type DebtorCardRowCollapsedProps = DebtorCardRowBadgesClusterProps & {
    d: Debtor;
    debtorDisp: {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
        heirSubstituteLines?: string[];
    };
    debtorHeirsWord: string | null;
    debtorHasHeirs: boolean;
    rowIsLegalEntity: boolean;
    rowShowUnservedMemoBadge: boolean;
    showDebtorNotificationPanel: boolean;
    heirsDetailsIncludeClient: DebtorsSectionProps['heirsDetailsIncludeClient'];
    openHeirsQuickView: DebtorsSectionProps['openHeirsQuickView'];
    executionAppealBanner: DebtorsSectionProps['executionAppealBanner'];
    onOpenDecisionsAppealsTab: DebtorsSectionProps['onOpenDecisionsAppealsTab'];
};

export function DebtorCardRowCollapsed({
    d,
    debtorDisp,
    debtorHeirsWord,
    debtorHasHeirs,
    rowIsLegalEntity,
    rowShowUnservedMemoBadge,
    showDebtorNotificationPanel,
    heirsDetailsIncludeClient,
    openHeirsQuickView,
    executionAppealBanner,
    onOpenDecisionsAppealsTab,
    isPrimary,
    ...badgesProps
}: DebtorCardRowCollapsedProps) {
    const {
        debtorKey,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
        onOpenUnifiedSummonsHub,
    } = badgesProps;

    const nameHeading = (
        <DebtorCardRowNameHeading
            debtorDisp={debtorDisp}
            debtorHeirsWord={debtorHeirsWord}
            debtorHasHeirs={debtorHasHeirs}
            rowIsLegalEntity={rowIsLegalEntity}
            d={d}
            heirsDetailsIncludeClient={heirsDetailsIncludeClient}
            openHeirsQuickView={openHeirsQuickView}
            nameClassName={
                isPrimary
                    ? 'text-[1.04rem] sm:text-[1.08rem]'
                    : 'text-xl'
            }
        />
    );

    return (
        <div className="flex w-full items-center justify-between gap-2.5" dir="rtl">
            {isPrimary ? (
                <div className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5 text-right">
                    {nameHeading}
                    <DebtorCardRowInlineStatusChips
                        showDeceased={Boolean(debtorDisp.showDeceasedGlyph && !debtorHeirsWord)}
                        appealLabel={
                            executionAppealBanner.show ? executionAppealBanner.label : null
                        }
                        onOpenAppeals={onOpenDecisionsAppealsTab}
                        showUnservedMemo={Boolean(
                            showDebtorNotificationPanel && rowShowUnservedMemoBadge,
                        )}
                        onUnservedMemo={() => {
                            setSummonsMarkerPopoverOpen(false);
                            setExecutionMemoBadgePopoverOpen(true);
                        }}
                    />
                    <PreloadableOverlayGate
                        lazy={LazyDebtorCardRowBadgesCluster}
                        lazyProps={{ isPrimary, ...badgesProps }}
                        fallback={DEBTOR_BADGES_PAINT_SLOT}
                    />
                </div>
            ) : (
                <div className="min-w-0 flex-1 text-right">
                    <div className="flex w-full min-w-0 flex-col items-stretch gap-1" dir="rtl">
                        {nameHeading}
                        <DebtorCardRowInlineStatusChips
                            showDeceased={Boolean(debtorDisp.showDeceasedGlyph && !debtorHeirsWord)}
                            appealLabel={null}
                            showUnservedMemo={rowShowUnservedMemoBadge}
                            onUnservedMemo={() => {
                                onOpenUnifiedSummonsHub?.({
                                    debtorKey: String(debtorKey),
                                    initialMainTab: 'tabligh',
                                });
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
