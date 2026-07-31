// @ts-nocheck
import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
} from 'react';
import type { Debtor } from '@/app/types/execution';
import type { DebtorLiabilityGroup } from '@/app/utils/debtorLiabilityGroups';
import type { DebtorWorkspaceEntry as DebtorWorkspaceEntryContract } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import { useApplyPartyEditDisplayOverlay } from '../helpers/partyEditDisplayOverlay';
import { DebtorCardRow } from './DebtorCardRow';
import type {
    DebtorsSectionHandle,
    DebtorsSectionProps,
    ExpandControlRegistrar,
} from './DebtorsSection.types';

export type { DebtorsSectionHandle, DebtorsSectionProps } from './DebtorsSection.types';

export const DebtorsSection = forwardRef<DebtorsSectionHandle, DebtorsSectionProps>(function DebtorsSection(
    props,
    ref,
) {
    const expandControlsRef = useRef(new Map<string, () => void>());
    const applyPartyOverlay = useApplyPartyEditDisplayOverlay();

    const registerExpandControl = useCallback<ExpandControlRegistrar>((debtorKey, expand) => {
        expandControlsRef.current.set(debtorKey, expand);
        return () => {
            expandControlsRef.current.delete(debtorKey);
        };
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            expandDebtor: (debtorKey: string) => {
                expandControlsRef.current.get(debtorKey)?.();
            },
        }),
        [],
    );

    const {
        PartyOverflowToggle,
        liabilityGroupTabsMode = false,
        debtorLiabilityGroups = [],
        debtorBrowserTabsMode,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        executionDebtorTabIndex,
        multiDebtorMode,
        effectiveDebtors,
        showExtraDebtors,
        setExecutionDebtorTabIndex,
        setShowExtraDebtors,
        onOpenUnifiedSummonsHub,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setShowUnifiedSummonsModal,
        executionData,
        claimType,
        activeDebtorHeirsForNotification,
        activeTimelineEvents,
        activeTimelineEventsDebtorScoped,
        realEstateSeizureAssets,
        seizedAssets,
        standaloneExecutionMarks,
        thirdPartySeizureAssets,
        thirdPartySeizures,
    } = props;

    const resolvedOnOpenUnifiedSummonsHub = useCallback(
        (options?: {
            debtorKey?: string | null;
            initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
        }) => {
            if (onOpenUnifiedSummonsHub) {
                onOpenUnifiedSummonsHub(options);
                return;
            }
            setSummonsContextDebtorKey?.(options?.debtorKey ?? null);
            setSummonsHubInitialMainTab?.(options?.initialMainTab ?? null);
            setShowUnifiedSummonsModal?.(true);
        },
        [
            onOpenUnifiedSummonsHub,
            setSummonsContextDebtorKey,
            setSummonsHubInitialMainTab,
            setShowUnifiedSummonsModal,
        ],
    );

    const custodyRemovalClaimActive = useMemo(
        () => isCustodyRemovalExecutionClaim(executionData, claimType),
        [executionData, claimType],
    );

    const activeLiabilityGroupEntries = useMemo((): DebtorWorkspaceEntryContract[] => {
        if (!liabilityGroupTabsMode || debtorLiabilityGroups.length === 0) return [];
        return (
            debtorLiabilityGroups[executionDebtorTabIndex]?.entries ??
            debtorLiabilityGroups[0]?.entries ??
            []
        );
    }, [liabilityGroupTabsMode, debtorLiabilityGroups, executionDebtorTabIndex]);

    const debtorRowsToRender = useMemo((): Array<DebtorWorkspaceEntryContract | Debtor> => {
        if (liabilityGroupTabsMode) {
            return activeLiabilityGroupEntries;
        }
        if (debtorBrowserTabsMode) {
            return debtorWorkspaceEntries.slice(
                executionDebtorTabIndex,
                executionDebtorTabIndex + 1,
            );
        }
        if (multiDebtorMode) {
            return debtorWorkspaceEntries;
        }
        return effectiveDebtors;
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroupEntries,
        debtorBrowserTabsMode,
        debtorWorkspaceEntries,
        executionDebtorTabIndex,
        multiDebtorMode,
        effectiveDebtors,
    ]);

    const safeActiveDebtorHeirsForNotification = Array.isArray(activeDebtorHeirsForNotification)
        ? activeDebtorHeirsForNotification
        : [];
    const safeActiveTimelineEvents = Array.isArray(activeTimelineEvents) ? activeTimelineEvents : [];
    const safeActiveTimelineEventsDebtorScoped = Array.isArray(activeTimelineEventsDebtorScoped)
        ? activeTimelineEventsDebtorScoped
        : [];
    const safeDebtorWorkspaceEntries = Array.isArray(debtorWorkspaceEntries)
        ? debtorWorkspaceEntries
        : [];
    const safeEffectiveDebtors = Array.isArray(effectiveDebtors) ? effectiveDebtors : [];
    const safeRealEstateSeizureAssets = Array.isArray(realEstateSeizureAssets)
        ? realEstateSeizureAssets
        : [];
    const safeSeizedAssets = Array.isArray(seizedAssets) ? seizedAssets : [];
    const safeStandaloneExecutionMarks = Array.isArray(standaloneExecutionMarks)
        ? standaloneExecutionMarks
        : [];
    const safeThirdPartySeizureAssets = Array.isArray(thirdPartySeizureAssets)
        ? thirdPartySeizureAssets
        : [];
    const safeThirdPartySeizures = Array.isArray(thirdPartySeizures) ? thirdPartySeizures : [];

    return (
        <>
            <div className="mx-3 mt-3.5 space-y-1.5">
                <div className="space-y-1.5">
                    {debtorBrowserTabsMode &&
                    (liabilityGroupTabsMode
                        ? debtorLiabilityGroups.length > 0
                        : debtorWorkspaceEntries.length > 0) ? (
                        <div
                            ref={debtorWorkspaceChipStripRef}
                            className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl border border-rose-500/25 bg-slate-950/40 p-1.5"
                            dir="rtl"
                        >
                            {(liabilityGroupTabsMode
                                ? debtorLiabilityGroups
                                : debtorWorkspaceEntries
                            ).map((item, ti) => (
                                <button
                                    key={
                                        liabilityGroupTabsMode
                                            ? (item as DebtorLiabilityGroup).tabKey
                                            : (item as DebtorWorkspaceEntryContract).key
                                    }
                                    type="button"
                                    onClick={() => setExecutionDebtorTabIndex(ti)}
                                    className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-bold transition-all ${
                                        executionDebtorTabIndex === ti
                                            ? 'border-rose-500/50 bg-rose-950/45 text-rose-50'
                                            : 'border-transparent bg-slate-800/60 text-slate-400 hover:border-rose-500/25'
                                    }`}
                                >
                                    {liabilityGroupTabsMode
                                        ? (item as DebtorLiabilityGroup).label
                                        : (item as DebtorWorkspaceEntryContract).unified.name}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    {debtorRowsToRender.map((raw, loopIdx) => (
                        <DebtorCardRow
                            key={
                                multiDebtorMode || debtorBrowserTabsMode
                                    ? (raw as DebtorWorkspaceEntryContract).key ??
                                      `debtor-row-${loopIdx}`
                                    : `debtor-row-${loopIdx}`
                            }
                            {...props}
                            onOpenUnifiedSummonsHub={resolvedOnOpenUnifiedSummonsHub}
                            raw={raw}
                            loopIdx={loopIdx}
                            registerExpandControl={registerExpandControl}
                            applyPartyOverlay={applyPartyOverlay}
                            custodyRemovalClaimActive={custodyRemovalClaimActive}
                            safeActiveDebtorHeirsForNotification={safeActiveDebtorHeirsForNotification}
                            safeActiveTimelineEvents={safeActiveTimelineEvents}
                            safeActiveTimelineEventsDebtorScoped={safeActiveTimelineEventsDebtorScoped}
                            safeDebtorWorkspaceEntries={safeDebtorWorkspaceEntries}
                            safeEffectiveDebtors={safeEffectiveDebtors}
                            safeRealEstateSeizureAssets={safeRealEstateSeizureAssets}
                            safeSeizedAssets={safeSeizedAssets}
                            safeStandaloneExecutionMarks={safeStandaloneExecutionMarks}
                            safeThirdPartySeizureAssets={safeThirdPartySeizureAssets}
                            safeThirdPartySeizures={safeThirdPartySeizures}
                        />
                    ))}
                    {!multiDebtorMode && effectiveDebtors.length > 2 && (
                        <PartyOverflowToggle
                            hiddenCount={effectiveDebtors.length - 2}
                            expanded={showExtraDebtors}
                            onToggle={() => setShowExtraDebtors((v) => !v)}
                            variant="debtor"
                        />
                    )}
                </div>
            </div>
        </>
    );
});
