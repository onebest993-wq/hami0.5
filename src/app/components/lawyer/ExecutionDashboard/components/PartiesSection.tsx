import React, { memo, useCallback, useState, startTransition } from 'react';
import { MapPin, Phone, Users } from 'lucide-react';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { PartyOverflowToggle } from '../executionDashboardLazyShell';
import { ExecutionPartyCardFrame } from './ExecutionPartyCardFrame';
import { HeirsQuickViewTrigger } from './HeirsQuickViewTrigger';
import type { Party } from '@/app/types/execution';
import { isPartyHeirsEditOnlyMode } from '@/app/utils/partyDisplayName';

type PartiesSectionProps = {
    creditorWorkspaceEntries: any[];
    showExtraCreditors: boolean;
    setShowExtraCreditors: React.Dispatch<React.SetStateAction<boolean>>;
    getExecutionPartyDisplayName: (
        party: Party,
        kind: 'creditor' | 'debtor',
        index: number,
        executionData: any
    ) => {
        text: string;
        baseName: string;
        showDeceasedGlyph: boolean;
    };
    executionData: any;
    buildPartyHeirsRows: (party: Party, kind: 'creditor' | 'debtor') => any[];
    openHeirsQuickView: (party: Party, kind: 'creditor' | 'debtor', title: string) => void;
    effectiveCreditors: any[];
    heirsDetailsIncludeClient: (heirsDetails: any) => boolean;
    executionAppealBanner: { show: boolean; label: string };
    setDecisionsModalBootHubTab: React.Dispatch<React.SetStateAction<'appeals'>>;
    setShowDecisionsModal: (show: boolean) => void;
    partyBadgesExecutionId: string;
    viewExecutionData: any;
    activeCoerciveActions: any[];
    seizedAssets: any[];
    activeTimelineEvents: any[];
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
    expanded,
}: {
    badgeExtra: React.ReactNode;
    collapsed: React.ReactNode;
    expanded: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => {
        startTransition(() => setOpen((v) => !v));
    }, []);

    return (
        <ExecutionPartyCardFrame
            variant="creditor"
            roleLabel="الدائن"
            badgeExtra={badgeExtra}
            isOpen={open}
            onToggle={toggle}
            expandAriaLabel={open ? 'طي بيانات الدائن' : 'توسيع بيانات الدائن'}
            expandedPanel={open ? expanded : undefined}
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
    setDecisionsModalBootHubTab,
    setShowDecisionsModal,
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
        <div className="mx-3 mt-3.5 space-y-1.5">
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
                        expanded={
                            <>
                                    <div className="relative z-20 mb-2 flex items-center justify-end pointer-events-auto">
                                        <ExecutionPartySpecialActionsMenu
                                            variant="creditor"
                                            creditorDeathEntryLabel={creditorDeathMenuLabel}
                                            onReportCreditorDeath={handleCreditorDeathMenuAction}
                                            isHistoricalMode={isHistoricalMode}
                                            editPartyLabel={
                                                creditorHeirsEditOnly
                                                    ? 'تعديل بيانات الورثة'
                                                    : 'تعديل بيانات الدائن'
                                            }
                                            onEditParty={() => {
                                                if (isPmCred) {
                                                    showToast(
                                                        'لا يمكن تعديل هذا الدائن من هنا.',
                                                        'info'
                                                    );
                                                    return;
                                                }
                                                openEditParty('creditor', ecIdx, {
                                                    party: c as unknown as Party,
                                                    forceHeirs: creditorHeirsEditOnly,
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {c.occupation ? (
                                            <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                <p className="mb-0.5 text-[10px] text-gray-400">الوظيفة</p>
                                                <p className="text-xs font-medium leading-snug text-slate-200 break-words">
                                                    {String(c.occupation ?? '')}
                                                </p>
                                            </div>
                                        ) : null}
                                        {c.phone || c.address ? (
                                            <div
                                                className={`grid gap-2 ${
                                                    c.phone && c.address ? 'grid-cols-2' : 'grid-cols-1'
                                                }`}
                                            >
                                                {c.phone ? (
                                                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                            <span>الهاتف</span>
                                                            <Phone
                                                                size={12}
                                                                className="shrink-0 text-emerald-400"
                                                            />
                                                        </div>
                                                        <p className="text-xs font-medium text-white [unicode-bidi:plaintext] break-all">
                                                            {String(c.phone ?? '')}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                {c.address ? (
                                                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                            <span>العنوان</span>
                                                            <MapPin
                                                                size={12}
                                                                className="shrink-0 text-emerald-400"
                                                            />
                                                        </div>
                                                        <p className="text-xs leading-snug text-white break-words">
                                                            {String(c.address ?? '')}
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    {!c.phone && !c.address && creditorExtraMinorNames.length === 0 && (
                                        <p className="py-1 text-center text-[11px] text-gray-500">
                                            لا توجد بيانات اتصال
                                        </p>
                                    )}
                                    {creditorExtraMinorNames.length > 0 && creditorExtraMinorLabel && (
                                        <div className="mt-1.5 border-t border-emerald-500/10 pt-1.5">
                                            <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                <span>{creditorExtraMinorLabel}</span>
                                                <Users size={12} className="shrink-0 text-emerald-400" />
                                            </div>
                                            <p className="text-xs leading-snug text-white break-words">
                                                {creditorExtraMinorNames.join('، ')}
                                            </p>
                                        </div>
                                    )}
                                </>
                        }
                        collapsed={
                            <div className="flex w-full items-center justify-between gap-2 text-right" dir="rtl">
                                <div className="min-w-0 flex-1 rounded-xl py-0 text-right">
                                    <div className="flex w-full min-w-0 flex-col items-stretch gap-1" dir="rtl">
                                        <div
                                            className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                            dir="rtl"
                                        >
                                            <div
                                                className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                dir="rtl"
                                            >
                                                {creditorHeirsWord ? (
                                                    <HeirsQuickViewTrigger
                                                        label={creditorHeirsWord}
                                                        onOpen={() =>
                                                            openHeirsQuickView(
                                                                c as unknown as Party,
                                                                'creditor',
                                                                'ورثة الدائن'
                                                            )
                                                        }
                                                    />
                                                ) : null}
                                                <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white block">
                                                    {creditorHeirsWord
                                                        ? creditorDisp.baseName
                                                        : creditorDisp.text}
                                                    {(creditorHasHeirs
                                                        ? heirsDetailsIncludeClient(
                                                              (c as unknown as Party).heirs_details
                                                          )
                                                        : c.isClient) &&
                                                    !creditorDisp.showDeceasedGlyph ? (
                                                        <span
                                                            className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                            title="موكلي"
                                                            aria-label="موكلي"
                                                        >
                                                            ★
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className="mt-0.5 flex flex-row flex-nowrap items-center justify-start gap-1 overflow-x-auto scrollbar-hide"
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
                                            {ent.ecIndex === 0 &&
                                            !isPmCred &&
                                            creditorPartyPreserveAppealInline &&
                                            executionAppealBanner.show ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDecisionsModalBootHubTab('appeals');
                                                        setShowDecisionsModal(true);
                                                    }}
                                                    className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                    title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                >
                                                    {executionAppealBanner.label}
                                                </button>
                                            ) : null}
                                        </div>
                                        <div
                                            className="flex flex-row flex-wrap items-center justify-start gap-1 mt-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            role="presentation"
                                        >
                                            <ExecutionPartyInteractiveBadges
                                                executionId={partyBadgesExecutionId}
                                                party="creditor"
                                                isPrimaryDebtor={false}
                                                executionData={viewExecutionData}
                                                activeCoerciveActions={activeCoerciveActions}
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
                                        {ent.ecIndex === 0 &&
                                        !isPmCred &&
                                        !creditorPartyPreserveAppealInline &&
                                        executionAppealBanner.show ? (
                                            <div className="flex w-full justify-end" dir="rtl">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDecisionsModalBootHubTab('appeals');
                                                        setShowDecisionsModal(true);
                                                    }}
                                                    className="max-w-[10rem] shrink-0 truncate inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                    title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                >
                                                    {executionAppealBanner.label}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
});
