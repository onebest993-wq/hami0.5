import React, { Fragment, useMemo } from 'react';
import type { DefendantPersonalStage, JourneyNode, JourneyTransitionKind } from '@/app/types/criminal';
import type { CriminalDefendant } from '../criminalStore';
import {
    coerceJuvenileTrialJourneyNodeLabel,
    formatJourneyPathDisplayLabel,
    getJourneyBranchTracks,
    getCurrentJourneyNode,
    hasActiveJourneyFork,
} from '../stageJourney';
import { shouldUseJuvenileTrialJourneyLabels } from '../criminalStageUtils';
import {
    defaultPersonalStage,
    hasDivergentDefendantFates,
    personalStageLabel,
} from '../partyPersonalStage';
import { journeyStageCapsuleClass } from '../journeyStageVisuals';
import {
    LV_BLUR,
    LV_BTN_GOLD,
    LV_ELEVATION_SOFT,
    LV_INSET,
    LV_RADIUS,
} from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

export type CaseJourneyHeaderProps = {
    journey: JourneyNode[];
    defendants: CriminalDefendant[];
    selectedNodeId: string;
    selectedPartyId?: string;
    selectedBranchId?: string;
    onSelectNode: (nodeId: string) => void;
    onSelectParty?: (defendantId: string) => void;
    onSelectBranch?: (branchId: string) => void;
    /** زر الإحالة في يمين شريط المسار (تحقيق أو محاكمة). */
    showReferralButton?: boolean;
    onOpenReferral?: () => void;
    referralButtonDisabled?: boolean;
    referralButtonLabel?: string;
    referralButtonTitle?: string;
};

function connectorLabel(node: JourneyNode | undefined): string | undefined {
    if (!node) return undefined;
    const text = String(node.arrowLabel ?? node.transitionText ?? '')
        .replace(/\s*—\s*مادة\s*130\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return text || undefined;
}

/** يحافظ على ترتيب مسار الإضبارة كما سُجّل (append-only) — لا إعادة فرز بالتاريخ. */
function orderMainlineNodes(nodes: JourneyNode[]): JourneyNode[] {
    return nodes
        .map((n, sourceIndex) => ({ n, sourceIndex }))
        .filter(({ n }) => !String(n.branchId ?? '').trim())
        .filter(({ n }) => n.status !== 'future')
        .map(({ n, sourceIndex }) => ({
            node: {
                ...n,
                status: n.status === 'active' ? ('current' as const) : n.status,
            },
            sourceIndex,
        }))
        .sort((a, b) => a.sourceIndex - b.sourceIndex)
        .map(({ node }) => node);
}

function connectorLineTone(kind?: JourneyTransitionKind): string {
    if (kind === 'backward_reversal' || kind === 'jurisdiction_swap' || kind === 'parallel_fork') {
        return 'bg-amber-500/50';
    }
    if (kind === 'cassation_ascend' || kind === 'cassation_parallel_ascend') return 'bg-violet-500/45';
    if (kind === 'cassation_descend') return 'bg-red-600/45';
    if (kind === 'cassation_confirm') return 'bg-emerald-600/40';
    return 'bg-white/20';
}

const SegmentConnector = ({ text, kind }: { text?: string; kind?: JourneyTransitionKind }) => (
    <div
        className="flex items-center justify-center w-5 shrink-0 self-center print:hidden"
        title={text}
        aria-hidden={!text}
    >
        <div className={`h-px w-full ${connectorLineTone(kind)}`} />
        {text ? <span className="sr-only">{text}</span> : null}
    </div>
);

const JourneyCapsule = ({
    node,
    displayLabel,
    isSelected,
    isLiveCurrent,
    onSelect,
}: {
    node: JourneyNode;
    displayLabel: string;
    isSelected: boolean;
    isLiveCurrent: boolean;
    onSelect?: () => void;
}) => {
    const isPastArchive = !isLiveCurrent && node.status !== 'future';
    const intervention = node.phaseOverlay === 'under_intervention_review';
    const isInteractive = isLiveCurrent && typeof onSelect === 'function';

    let shell = journeyStageCapsuleClass(node.stage, { past: !intervention && isPastArchive });
    if (intervention) {
        shell = journeyStageCapsuleClass(node.stage, { intervention: true });
    } else if (isLiveCurrent) {
        shell = journeyStageCapsuleClass(node.stage, { selected: isSelected });
    }

    const title = node.isCassationFilterNode
        ? `${displayLabel} — فلتر تمييز (قراءة فقط)`
        : isPastArchive
          ? `${displayLabel} — مرحلة منتهية`
          : displayLabel;

    const content = (
        <>
            {isPastArchive && !intervention ? (
                <span className="text-[10px] shrink-0 opacity-70" aria-hidden>
                    🔒
                </span>
            ) : null}
            {isLiveCurrent && !intervention ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
            ) : null}
            {intervention ? (
                <span className="text-[10px] shrink-0" aria-hidden>
                    ⚠️
                </span>
            ) : null}
            <span className="font-black text-xs sm:text-sm whitespace-nowrap leading-tight">{displayLabel}</span>
        </>
    );

    const className = `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border shrink-0 min-h-[2.35rem] ${
        isInteractive ? 'transition-colors hover:brightness-110 cursor-pointer' : 'cursor-default'
    } ${shell}`;

    if (!isInteractive) {
        return (
            <span title={title} className={className} aria-hidden={false}>
                {content}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            title={title}
            aria-pressed={isSelected}
            className={className}
        >
            {content}
        </button>
    );
};

function fateBadgeTone(stage: DefendantPersonalStage): string {
    if (stage === 'referred_to_trial') return 'border-sky-500/40 bg-sky-500/10 text-sky-100';
    if (stage === 'acquitted' || stage === 'released_temporary') return 'border-white/15 bg-white/[0.04] text-white/55';
    if (stage === 'lawsuit_dropped_death' || stage === 'lawsuit_dropped') return 'border-red-900/50 bg-red-950/40 text-red-100';
    if (stage === 'convicted') return 'border-emerald-600/40 bg-emerald-900/20 text-emerald-100';
    return 'border-white/12 bg-white/[0.03] text-white/50';
}

const DefendantFateChip = ({
    defendant,
    active,
    onClick,
}: {
    defendant: CriminalDefendant;
    active: boolean;
    onClick: () => void;
}) => {
    const ps = defendant.personalStage ?? defaultPersonalStage();
    const name = String(defendant.fullName ?? '').trim() || '—';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold transition ${fateBadgeTone(ps)} ${
                active ? 'ring-1 ring-[#E6C673]/50' : 'hover:bg-white/[0.06]'
            }`}
        >
            <span className="max-w-[5.5rem] truncate">{name}</span>
            <span className="opacity-80">{personalStageLabel(ps)}</span>
        </button>
    );
};

const ParallelSplitTracks = ({
    defendants,
    selectedPartyId,
    onSelectParty,
}: {
    defendants: CriminalDefendant[];
    selectedPartyId?: string;
    onSelectParty?: (defendantId: string) => void;
}) => {
    if (!defendants.length) return null;
    return (
        <div className="flex flex-row-reverse flex-wrap items-center gap-1 min-w-0" dir="rtl">
            {defendants.map((d) => (
                <DefendantFateChip
                    key={d.id}
                    defendant={d}
                    active={selectedPartyId === d.id}
                    onClick={() => onSelectParty?.(selectedPartyId === d.id ? '' : d.id)}
                />
            ))}
        </div>
    );
};

const BranchSplitTracks = ({
    branches,
    defendants,
    selectedBranchId,
    selectedPartyId,
    onSelectBranch,
    onSelectParty,
}: {
    branches: ReturnType<typeof getJourneyBranchTracks>;
    defendants: CriminalDefendant[];
    selectedBranchId?: string;
    selectedPartyId?: string;
    onSelectBranch?: (branchId: string) => void;
    onSelectParty?: (defendantId: string) => void;
}) => (
    <div className="flex flex-col gap-1.5 min-w-0" dir="rtl">
        {branches.map((b) => {
            const branchActive = selectedBranchId === b.branchId;
            const branchDefendants = defendants.filter((d) =>
                b.defendantIds.length ? b.defendantIds.includes(d.id) : true,
            );
            return (
                <div key={b.branchId} className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <button
                        type="button"
                        onClick={() => onSelectBranch?.(branchActive ? '' : b.branchId)}
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold transition ${
                            branchActive
                                ? 'border-[#E6C673]/45 bg-[#E6C673]/12 text-[#E6C673]'
                                : 'border-white/12 bg-white/[0.04] text-white/70 hover:text-white'
                        }`}
                    >
                        {b.label}
                    </button>
                    {branchDefendants.map((d) => (
                        <DefendantFateChip
                            key={d.id}
                            defendant={d}
                            active={selectedPartyId === d.id}
                            onClick={() => onSelectParty?.(selectedPartyId === d.id ? '' : d.id)}
                        />
                    ))}
                </div>
            );
        })}
    </div>
);

/** شريط مسار الإضبارة — مضغوط، زجاجي، قابل للتمرير أفقياً. */
export const CaseJourneyHeader = ({
    journey,
    defendants,
    selectedNodeId,
    selectedPartyId,
    selectedBranchId,
    onSelectNode,
    onSelectParty,
    onSelectBranch,
    showReferralButton = false,
    onOpenReferral,
    referralButtonDisabled = false,
    referralButtonLabel = 'إحالة',
    referralButtonTitle = 'إحالة أو تبديل اختصاص',
}: CaseJourneyHeaderProps) => {
    const list = Array.isArray(journey) ? journey : [];
    const forkBranches = useMemo(() => getJourneyBranchTracks(list), [list]);
    const hasFork = hasActiveJourneyFork(list) || forkBranches.length >= 2;
    const displayNodes = useMemo(() => {
        const base = (() => {
            if (!hasFork) return orderMainlineNodes(list);
            const mainline = list.filter((n) => !String(n.branchId ?? '').trim());
            if (!mainline.length) return orderMainlineNodes(list);
            return orderMainlineNodes(mainline);
        })();
        return base.map((node) => {
            if (node.stage !== 'misdemeanor' && node.stage !== 'felony') return node;
            if (
                !shouldUseJuvenileTrialJourneyLabels(defendants, {
                    defendantIds: node.defendantIds,
                })
            ) {
                return { ...node, label: formatJourneyPathDisplayLabel(node) };
            }
            const label = coerceJuvenileTrialJourneyNodeLabel(node, undefined, true);
            const withJuvenileLabel = label === node.label ? node : { ...node, label };
            return {
                ...withJuvenileLabel,
                label: formatJourneyPathDisplayLabel(withJuvenileLabel),
            };
        });
    }, [hasFork, list, defendants]);

    /** المسار من اليمين إلى اليسار: أقدم مرحلة يميناً والحالية يساراً (مع dir=rtl). */
    const visualNodes = displayNodes;

    const currentId = useMemo(() => {
        if (selectedBranchId) {
            return list.find((n) => n.status === 'current' && n.branchId === selectedBranchId)?.id ?? '';
        }
        return getCurrentJourneyNode(list)?.id ?? '';
    }, [list, selectedBranchId]);

    const activeSelection = selectedNodeId || currentId;
    const currentNode = list.find((n) => n.id === currentId);

    const scopedDefendants = useMemo(() => {
        const ids = new Set(
            [...(currentNode?.targetDefendantIds ?? []), ...(currentNode?.defendantIds ?? [])]
                .map((x) => String(x ?? '').trim())
                .filter(Boolean),
        );
        if (!ids.size) return defendants;
        return defendants.filter((d) => ids.has(d.id));
    }, [currentNode, defendants]);

    const showPartySplit = !hasFork && hasDivergentDefendantFates(scopedDefendants.length ? scopedDefendants : defendants);

    if (!list.length) return null;

    const handleNodeSelect = (node: JourneyNode) => {
        if (node.id !== currentId) return;
        onSelectNode('');
    };

    const showSecondary = hasFork || showPartySplit;

    return (
        <div className="w-full px-3 md:px-4 pt-1.5 pb-1 print:hidden" dir="rtl">
            <div className={`max-w-6xl mx-auto ${LV_RADIUS} ${LV_INSET} ${LV_BLUR} ${LV_ELEVATION_SOFT}`}>
                <div className="flex flex-row items-stretch gap-2.5 min-h-0 min-w-0 p-2.5">
                    {showReferralButton && onOpenReferral ? (
                        <button
                            type="button"
                            onClick={onOpenReferral}
                            disabled={referralButtonDisabled}
                            className={`shrink-0 self-center order-first inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-black transition disabled:opacity-40 disabled:pointer-events-none touch-manipulation min-h-[44px] ${LV_BTN_GOLD}`}
                            title={referralButtonTitle}
                        >
                            <span>{referralButtonLabel}</span>
                        </button>
                    ) : null}
                    <div
                        className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
                        role="list"
                        aria-label="مراحل مسار الإضبارة"
                    >
                        <div
                            className="inline-flex flex-row items-center gap-1 w-max min-h-[2.75rem] py-1"
                            dir="rtl"
                        >
                            {visualNodes.map((node, index) => {
                                const isSelected = node.id === activeSelection;
                                const nextNode = visualNodes[index + 1];
                                const showConnector = Boolean(nextNode);
                                const connectorText =
                                    connectorLabel(nextNode) ?? connectorLabel(node);
                                const connectorKind =
                                    nextNode?.transitionKind ??
                                    node.transitionKind ??
                                    'forward_referral';

                                return (
                                    <Fragment key={node.id}>
                                        <div role="listitem" className="shrink-0 flex items-center">
                                            <JourneyCapsule
                                                node={node}
                                                displayLabel={node.label}
                                                isSelected={isSelected}
                                                isLiveCurrent={node.id === currentId}
                                                onSelect={
                                                    node.id === currentId
                                                        ? () => handleNodeSelect(node)
                                                        : undefined
                                                }
                                            />
                                        </div>
                                        {showConnector ? (
                                            <SegmentConnector text={connectorText} kind={connectorKind} />
                                        ) : null}
                                    </Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {showSecondary ? (
                    <div className="border-t border-white/8 px-2 pb-1.5 pt-1 min-w-0">
                        {hasFork ? (
                            <BranchSplitTracks
                                branches={forkBranches}
                                defendants={defendants}
                                selectedBranchId={selectedBranchId}
                                selectedPartyId={selectedPartyId}
                                onSelectBranch={onSelectBranch}
                                onSelectParty={onSelectParty}
                            />
                        ) : null}
                        {showPartySplit ? (
                            <ParallelSplitTracks
                                defendants={scopedDefendants.length ? scopedDefendants : defendants}
                                selectedPartyId={selectedPartyId}
                                onSelectParty={onSelectParty}
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
