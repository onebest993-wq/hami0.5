import React from 'react';
import { MapPin, Pencil, Phone, Users } from 'lucide-react';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { PartyOverflowToggle } from '../executionDashboardLazyShell';
import type { Party } from '@/app/types/execution';

type PartiesSectionProps = {
    creditorWorkspaceEntries: any[];
    showExtraCreditors: boolean;
    setShowExtraCreditors: React.Dispatch<React.SetStateAction<boolean>>;
    expandedCreditorById: Record<string, boolean>;
    toggleCreditorExpanded: (key: string) => void;
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
    openEditParty: (kind: 'creditor' | 'debtor', index: number) => void;
};

export const PartiesSection: React.FC<PartiesSectionProps> = ({
    creditorWorkspaceEntries,
    showExtraCreditors,
    setShowExtraCreditors,
    expandedCreditorById,
    toggleCreditorExpanded,
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
    openEditParty,
}) => {
    return (
        <div className="mx-3 mt-2 space-y-2">
            {creditorWorkspaceEntries.map((ent, idx) => {
                const c = ent.c;
                const ecIdx = ent.ecIndex >= 0 ? ent.ecIndex : idx;
                const isPmCred = ent.isPmCreditor;
                if (creditorWorkspaceEntries.length > 2 && !showExtraCreditors && idx >= 2) {
                    return null;
                }
                const creditorKey = ent.key;
                const creditorOpen = expandedCreditorById[creditorKey] ?? false;
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
                return (
                    <div
                        key={creditorKey}
                        className="relative mt-2 w-full h-fit px-3 pb-2.5 pt-2 text-right backdrop-blur-2xl transition-all duration-300 ease-in-out overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#0B1120]/35 shadow-[0_14px_46px_rgba(0,0,0,0.45)] ring-1 ring-emerald-500/10 hover:ring-emerald-500/20"
                        dir="rtl"
                        style={{
                            backgroundImage:
                                'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%),' +
                                'repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 16px),' +
                                'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px)',
                            backgroundBlendMode: 'overlay',
                        }}
                    >
                        {!creditorOpen ? (
                            <button
                                type="button"
                                className="absolute inset-0 z-0 rounded-2xl"
                                aria-label="Expand creditor"
                                onClick={() => toggleCreditorExpanded(creditorKey)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleCreditorExpanded(creditorKey);
                                    }
                                }}
                            />
                        ) : null}
                        <div className="relative z-10">
                            <span className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full border border-emerald-400/35 bg-[#0B1120]/80 px-3 py-1 text-[11px] font-extrabold leading-none text-emerald-300 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                                الدائن
                                {creditorWorkspaceEntries.length > 1 ? (
                                    <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-emerald-300/90">
                                        {idx + 1}
                                    </span>
                                ) : effectiveCreditors.length > 1 ? (
                                    <span className="ms-0.5 inline tabular-nums text-[10px] font-bold text-emerald-300/90">
                                        {ecIdx + 1}
                                    </span>
                                ) : null}
                                {isPmCred ? (
                                    <span className="mr-1 inline text-[9px] font-semibold text-slate-500">
                                        ·إضافي
                                    </span>
                                ) : null}
                            </span>
                            <div className="flex w-full items-center justify-between gap-2 text-right" dir="rtl">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleCreditorExpanded(creditorKey)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleCreditorExpanded(creditorKey);
                                        }
                                    }}
                                    className="min-w-0 flex-1 rounded-xl py-0 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 cursor-pointer"
                                >
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
                                                    <span
                                                        className="shrink-0 text-amber-500 text-xl font-bold cursor-pointer hover:underline"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            openHeirsQuickView(
                                                                c as unknown as Party,
                                                                'creditor',
                                                                'ورثة الدائن'
                                                            );
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                openHeirsQuickView(
                                                                    c as unknown as Party,
                                                                    'creditor',
                                                                    'ورثة الدائن'
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {creditorHeirsWord}
                                                    </span>
                                                ) : null}
                                                <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white py-2 block">
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
                                            className="mt-1 flex flex-row flex-nowrap items-center justify-start gap-1 overflow-x-auto scrollbar-hide"
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
                                            className="flex flex-row flex-wrap items-center justify-start gap-1 mt-1"
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
                            {creditorOpen && (
                                <div
                                    className="border-t border-emerald-500/10 px-0 pb-1 pt-2 text-right"
                                    dir="rtl"
                                >
                                    <div
                                        className="mb-2 flex items-center justify-end"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        role="presentation"
                                    >
                                        <ExecutionPartySpecialActionsMenu
                                            variant="creditor"
                                            creditorDeathEntryLabel={creditorDeathMenuLabel}
                                            onReportCreditorDeath={handleCreditorDeathMenuAction}
                                            isHistoricalMode={isHistoricalMode}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {c.occupation || c.phone ? (
                                            <div
                                                className={
                                                    c.occupation && c.phone
                                                        ? 'grid grid-cols-2 gap-2'
                                                        : 'grid grid-cols-1 gap-2'
                                                }
                                            >
                                                {c.occupation ? (
                                                    <div className="min-w-0 rounded-lg border border-emerald-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                        <p className="mb-0.5 text-[10px] text-gray-400">
                                                            الوظيفة
                                                        </p>
                                                        <p className="text-xs font-medium leading-snug text-slate-200 break-words">
                                                            {String(c.occupation ?? '')}
                                                        </p>
                                                    </div>
                                                ) : null}
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
                                    {!c.phone && !c.address && creditorExtraMinorNames.length === 0 && (
                                        <p className="py-1.5 text-center text-[11px] text-gray-500">
                                            لا توجد بيانات اتصال
                                        </p>
                                    )}
                                    {creditorExtraMinorNames.length > 0 && creditorExtraMinorLabel && (
                                        <div className="mt-2 border-t border-emerald-500/10 pt-2">
                                            <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                <span>{creditorExtraMinorLabel}</span>
                                                <Users size={12} className="shrink-0 text-emerald-400" />
                                            </div>
                                            <p className="text-xs leading-snug text-white break-words">
                                                {creditorExtraMinorNames.join('، ')}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex justify-end border-t border-emerald-500/10 pt-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isPmCred) {
                                                    showToast(
                                                        'لا يمكن تعديل الدائن الإضافي من هنا.',
                                                        'info'
                                                    );
                                                    return;
                                                }
                                                openEditParty('creditor', ecIdx);
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                                        >
                                            <Pencil size={12} />
                                            تعديل بيانات الدائن
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
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
};
