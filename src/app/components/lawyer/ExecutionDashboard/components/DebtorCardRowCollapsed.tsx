import React from 'react';
import type { Debtor } from '@/app/types/execution';
import type { DebtorCardRowBadgesClusterProps } from './DebtorCardRowBadgesCluster.types';
import type { DebtorsSectionProps } from './DebtorsSection.types';
import { DebtorCardRowNameHeading } from './debtorCardRow/DebtorCardRowNameHeading';
import { DebtorCardRowInlineStatusChips } from './debtorCardRow/DebtorCardRowInlineStatusChips';
import { PartyCardCollapsedNameSlot } from './PartyCardCollapsedNameSlot';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import { LazyDebtorCardRowBadgesCluster } from '../debtorCardRowBadgesClusterLazy';
import { PARTY_SIGNALS_SCROLL_ROW } from '@/app/components/lawyer/execution/partySignalsScrollRow';

const DEBTOR_BADGES_PAINT_SLOT = (
    <div
        className="h-8 min-h-[32px] w-24 shrink-0 rounded-lg border border-white/8 bg-white/[0.04]"
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
    actionsMenu?: React.ReactNode;
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
    actionsMenu,
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
        <PartyCardCollapsedNameSlot actionsMenu={actionsMenu}>
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
        </PartyCardCollapsedNameSlot>
    );

    const statusChips = (
        <DebtorCardRowInlineStatusChips
            embeddedInScrollRow
            showDeceased={Boolean(debtorDisp.showDeceasedGlyph && !debtorHeirsWord)}
            appealLabel={
                isPrimary && executionAppealBanner.show ? executionAppealBanner.label : null
            }
            onOpenAppeals={isPrimary ? onOpenDecisionsAppealsTab : undefined}
            showUnservedMemo={Boolean(
                isPrimary
                    ? showDebtorNotificationPanel && rowShowUnservedMemoBadge
                    : rowShowUnservedMemoBadge,
            )}
            onUnservedMemo={() => {
                if (isPrimary) {
                    setSummonsMarkerPopoverOpen(false);
                    setExecutionMemoBadgePopoverOpen(true);
                    return;
                }
                onOpenUnifiedSummonsHub?.({
                    debtorKey: String(debtorKey),
                    initialMainTab: 'tabligh',
                });
            }}
        />
    );

    return (
        <div className="flex w-full items-center justify-center" dir="rtl">
            {isPrimary ? (
                <div className="flex min-w-0 w-full flex-col items-center gap-0.5 text-center">
                    {nameHeading}
                    <div
                        className={`mt-1.5 ${PARTY_SIGNALS_SCROLL_ROW} justify-center`}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                        dir="rtl"
                    >
                        {statusChips}
                        <PreloadableOverlayGate
                            lazy={LazyDebtorCardRowBadgesCluster}
                            lazyProps={{ isPrimary, ...badgesProps }}
                            fallback={DEBTOR_BADGES_PAINT_SLOT}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex min-w-0 w-full flex-col items-center gap-1 text-center" dir="rtl">
                    {nameHeading}
                    <div
                        className={`mt-1 ${PARTY_SIGNALS_SCROLL_ROW} justify-center`}
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                        dir="rtl"
                    >
                        {statusChips}
                    </div>
                </div>
            )}
        </div>
    );
}
