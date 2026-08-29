import React from 'react';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { HeirsQuickViewTrigger } from './HeirsQuickViewTrigger';
import type { ExecutionFile, Party, SeizedAsset, TimelineEvent } from '@/app/types/execution';

export type CreditorPartyCardCollapsedProps = {
    c: Record<string, unknown>;
    creditorHeirsWord: string | null;
    creditorDisp: { text: string; baseName: string; showDeceasedGlyph: boolean };
    creditorHasHeirs: boolean;
    heirsDetailsIncludeClient: (heirsDetails: unknown) => boolean;
    openHeirsQuickView: (party: Party, kind: 'creditor' | 'debtor', title: string) => void;
    entEcIndex: number;
    isPmCred: boolean;
    creditorPartyPreserveAppealInline: boolean;
    executionAppealBanner: { show: boolean; label: string };
    onOpenDecisionsAppealsTab: () => void;
    partyBadgesExecutionId: string;
    viewExecutionData: ExecutionFile | null;
    activeCoerciveActions?: string[];
    seizedAssets: SeizedAsset[];
    activeTimelineEvents: TimelineEvent[];
    decisionsReloadEpoch: number;
    isHistoricalMode: boolean;
};

export function CreditorPartyCardCollapsed({
    c,
    creditorHeirsWord,
    creditorDisp,
    creditorHasHeirs,
    heirsDetailsIncludeClient,
    openHeirsQuickView,
    entEcIndex,
    isPmCred,
    creditorPartyPreserveAppealInline,
    executionAppealBanner,
    onOpenDecisionsAppealsTab,
    partyBadgesExecutionId,
    viewExecutionData,
    activeCoerciveActions,
    seizedAssets,
    activeTimelineEvents,
    decisionsReloadEpoch,
    isHistoricalMode,
}: CreditorPartyCardCollapsedProps) {
    const showInlineStatus =
        (creditorDisp.showDeceasedGlyph && !creditorHeirsWord) ||
        (entEcIndex === 0 &&
            !isPmCred &&
            creditorPartyPreserveAppealInline &&
            executionAppealBanner.show);

    return (
        <div className="flex w-full flex-col items-center justify-center gap-0.5 text-center" dir="rtl">
            <div className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden">
                {creditorHeirsWord ? (
                    <HeirsQuickViewTrigger
                        label={creditorHeirsWord}
                        onOpen={() =>
                            openHeirsQuickView(c as unknown as Party, 'creditor', 'ورثة الدائن')
                        }
                    />
                ) : null}
                <span className="min-w-0 max-w-full truncate text-base font-bold leading-none text-white sm:text-lg">
                    {creditorHeirsWord ? creditorDisp.baseName : creditorDisp.text}
                    {(creditorHasHeirs
                        ? heirsDetailsIncludeClient((c as unknown as Party).heirs_details)
                        : c.isClient) && !creditorDisp.showDeceasedGlyph ? (
                        <span
                            className="ms-1 inline-block rounded border border-[#E6C673]/30 bg-[#E6C673]/10 px-1 py-px text-[9px] font-bold leading-none text-[#E6C673] select-none"
                            title="موكلي"
                            aria-label="موكلي"
                        >
                            موكلي
                        </span>
                    ) : null}
                </span>
            </div>
            {showInlineStatus ? (
                <div
                    className="flex max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-x-auto scrollbar-hide"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                    dir="rtl"
                >
                    {creditorDisp.showDeceasedGlyph && !creditorHeirsWord ? (
                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                            متوفى
                        </span>
                    ) : null}
                    {entEcIndex === 0 &&
                    !isPmCred &&
                    creditorPartyPreserveAppealInline &&
                    executionAppealBanner.show ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenDecisionsAppealsTab();
                            }}
                            className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                        >
                            {executionAppealBanner.label}
                        </button>
                    ) : null}
                </div>
            ) : null}
            <div
                className="flex max-w-full flex-row flex-wrap items-center justify-center gap-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
            >
                <ExecutionPartyInteractiveBadges
                    executionId={partyBadgesExecutionId}
                    party="creditor"
                    isPrimaryDebtor={false}
                    executionData={viewExecutionData}
                    activeCoerciveActions={activeCoerciveActions ?? []}
                    seizedAssets={seizedAssets}
                    timelineEvents={activeTimelineEvents}
                    hasGuarantor={false}
                    memoBadge={null}
                    absenceBadge={null}
                    showSummonsBadge={false}
                    debtorArrested={false}
                    forcedAttendancePending={false}
                    decisionsReloadEpoch={decisionsReloadEpoch}
                    isHistoricalMode={isHistoricalMode}
                />
            </div>
            {entEcIndex === 0 &&
            !isPmCred &&
            !creditorPartyPreserveAppealInline &&
            executionAppealBanner.show ? (
                <div className="flex w-full justify-center" dir="rtl">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDecisionsAppealsTab();
                        }}
                        className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                        title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                    >
                        {executionAppealBanner.label}
                    </button>
                </div>
            ) : null}
        </div>
    );
}
