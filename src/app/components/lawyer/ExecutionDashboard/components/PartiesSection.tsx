import React, { memo } from 'react';
import { PartyOverflowToggle } from '../executionDashboardLazyShellUi';
import { ExecutionPartyCardFrame } from './ExecutionPartyCardFrame';
import { CreditorPartyCardCollapsed } from './CreditorPartyCardCollapsed';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import { appendCustomPartySignal } from '@/app/components/lawyer/execution/partyInteractiveBadges/customPartySignalsStorage';
import type {
    ExecutionFile,
    Party,
    SeizedAsset,
    TimelineEvent,
} from '@/app/types/execution';
import { isPartyHeirsEditOnlyMode } from '@/app/utils/partyDisplayName';
import type { HeirDetailRow } from '../helpers/heirUtils';

type CreditorWorkspaceEntry = {
    key: string;
    c: Record<string, unknown>;
    isPmCreditor: boolean;
    ecIndex: number;
};

type PartiesSectionProps = {
    creditorWorkspaceEntries: CreditorWorkspaceEntry[];
    showExtraCreditors: boolean;
    setShowExtraCreditors: React.Dispatch<React.SetStateAction<boolean>>;
    getExecutionPartyDisplayName: (
        party: Party,
        kind: 'creditor' | 'debtor',
        index: number,
        executionData: ExecutionFile | null | undefined
    ) => {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
    };
    executionData: ExecutionFile | null;
    buildPartyHeirsRows: (party: Party, kind: 'creditor' | 'debtor') => HeirDetailRow[];
    openHeirsQuickView: (party: Party, kind: 'creditor' | 'debtor', title: string) => void;
    effectiveCreditors: Party[];
    heirsDetailsIncludeClient: (heirsDetails: unknown) => boolean;
    executionAppealBanner: { show: boolean; label: string };
    onOpenDecisionsAppealsTab: () => void;
    partyBadgesExecutionId: string;
    viewExecutionData: ExecutionFile | null;
    activeCoerciveActions?: string[];
    seizedAssets: SeizedAsset[];
    activeTimelineEvents: TimelineEvent[];
    decisionsReloadEpoch: number;
    isHistoricalMode: boolean;
    creditorDeathMenuLabel: string;
    handleCreditorDeathMenuAction: () => void;
    creditorExtraMinorNames: string[];
    creditorExtraMinorLabel: string | null;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    decisionsStorageExecutionId: string;
    openEditParty: (
        kind: 'creditor' | 'debtor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: Party },
    ) => void;
};

const CreditorPartyCard = memo(function CreditorPartyCard({
    badgeExtra,
    collapsed,
}: {
    badgeExtra: React.ReactNode;
    collapsed: React.ReactNode;
}) {
    return (
        <ExecutionPartyCardFrame
            variant="creditor"
            roleLabel="الدائن"
            badgeExtra={badgeExtra}
            isOpen={false}
            onToggle={() => {}}
            expandable={false}
            expandAriaLabel="بيانات الدائن"
        >
            {collapsed}
        </ExecutionPartyCardFrame>
    );
});

export const PartiesSection = memo(function PartiesSection({
    creditorWorkspaceEntries,
    showExtraCreditors,
    setShowExtraCreditors,
    getExecutionPartyDisplayName,
    executionData,
    buildPartyHeirsRows,
    openHeirsQuickView,
    effectiveCreditors,
    heirsDetailsIncludeClient,
    executionAppealBanner,
    onOpenDecisionsAppealsTab,
    partyBadgesExecutionId,
    viewExecutionData,
    activeCoerciveActions,
    seizedAssets,
    activeTimelineEvents,
    decisionsReloadEpoch,
    isHistoricalMode,
    creditorDeathMenuLabel,
    handleCreditorDeathMenuAction,
    creditorExtraMinorNames,
    creditorExtraMinorLabel,
    showToast,
    decisionsStorageExecutionId,
    openEditParty,
}: PartiesSectionProps) {
    return (
        <div className="mx-3 mt-2 space-y-1.5">
            {creditorWorkspaceEntries.map((ent, idx) => {
                const c = ent.c;
                const ecIdx = ent.ecIndex >= 0 ? ent.ecIndex : idx;
                const isPmCred = ent.isPmCreditor;
                if (creditorWorkspaceEntries.length > 2 && !showExtraCreditors && idx >= 2) {
                    return null;
                }
                const creditorKey = ent.key;
                const creditorDisp = getExecutionPartyDisplayName(
                    c as unknown as Party,
                    'creditor',
                    ecIdx,
                    executionData
                );
                const creditorHeirsRows = buildPartyHeirsRows(c as unknown as Party, 'creditor');
                const creditorHasHeirs = creditorHeirsRows.length > 0;
                const creditorHeirsWord = creditorHasHeirs
                    ? creditorHeirsRows.length > 1
                        ? 'ورثة'
                        : 'وريث'
                    : null;
                const creditorPartyPreserveAppealInline =
                    creditorHasHeirs || creditorDisp.showDeceasedGlyph;
                const creditorHeirsEditOnly = isPartyHeirsEditOnlyMode(
                    executionData,
                    'creditor',
                    c as unknown as Party,
                    ecIdx,
                    decisionsStorageExecutionId
                );
                const creditorBadgeExtra = (
                    <>
                        {creditorWorkspaceEntries.length > 1 ? (
                            <span className="tabular-nums text-[10px] font-bold opacity-90">{idx + 1}</span>
                        ) : effectiveCreditors.length > 1 ? (
                            <span className="tabular-nums text-[10px] font-bold opacity-90">{ecIdx + 1}</span>
                        ) : null}
                    </>
                );
                return (
                    <CreditorPartyCard
                        key={creditorKey}
                        badgeExtra={creditorBadgeExtra}
                        collapsed={
                            <CreditorPartyCardCollapsed
                                c={c}
                                creditorHeirsWord={creditorHeirsWord}
                                creditorDisp={creditorDisp}
                                creditorHasHeirs={creditorHasHeirs}
                                heirsDetailsIncludeClient={heirsDetailsIncludeClient}
                                openHeirsQuickView={openHeirsQuickView}
                                entEcIndex={ent.ecIndex}
                                isPmCred={isPmCred}
                                creditorPartyPreserveAppealInline={creditorPartyPreserveAppealInline}
                                executionAppealBanner={executionAppealBanner}
                                onOpenDecisionsAppealsTab={onOpenDecisionsAppealsTab}
                                partyBadgesExecutionId={partyBadgesExecutionId}
                                viewExecutionData={viewExecutionData}
                                activeCoerciveActions={activeCoerciveActions}
                                seizedAssets={seizedAssets}
                                activeTimelineEvents={activeTimelineEvents}
                                decisionsReloadEpoch={decisionsReloadEpoch}
                                isHistoricalMode={isHistoricalMode}
                                actionsMenu={
                                    <ExecutionPartySpecialActionsMenu
                                        variant="creditor"
                                        creditorDeathEntryLabel={creditorDeathMenuLabel}
                                        onReportCreditorDeath={handleCreditorDeathMenuAction}
                                        isHistoricalMode={isHistoricalMode}
                                        onAddCustomSignal={(label) => {
                                            const added = appendCustomPartySignal(
                                                String(partyBadgesExecutionId || ''),
                                                'creditor',
                                                'main',
                                                label,
                                            );
                                            if (!added) {
                                                showToast('تعذّر إضافة الإشارة أو أنها مكررة.', 'warning');
                                                return;
                                            }
                                            showToast('تمت إضافة الإشارة المخصصة.', 'success');
                                        }}
                                        editPartyLabel={
                                            creditorHeirsEditOnly ? 'تعديل بيانات الورثة' : undefined
                                        }
                                        onEditParty={
                                            creditorHeirsEditOnly
                                                ? () => {
                                                      if (isPmCred) {
                                                          showToast(
                                                              'لا يمكن تعديل هذا الدائن من هنا.',
                                                              'info',
                                                          );
                                                          return;
                                                      }
                                                      openEditParty('creditor', ecIdx, {
                                                          party: c as unknown as Party,
                                                          forceHeirs: true,
                                                      });
                                                  }
                                                : undefined
                                        }
                                    />
                                }
                            />
                        }
                    />
                );
            })}
            {creditorWorkspaceEntries.length > 2 && (
                <PartyOverflowToggle
                    hiddenCount={creditorWorkspaceEntries.length - 2}
                    expanded={showExtraCreditors}
                    onToggle={() => setShowExtraCreditors((v) => !v)}
                    variant="creditor"
                />
            )}
            {creditorExtraMinorNames.length > 0 && creditorExtraMinorLabel ? (
                <p className="px-1 text-right text-[11px] leading-snug text-slate-400">
                    {creditorExtraMinorLabel}: {creditorExtraMinorNames.join('، ')}
                </p>
            ) : null}
        </div>
    );
});
