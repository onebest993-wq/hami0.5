import React, { useState } from 'react';
import { AppealOriginBadge } from './AppealOriginBadge';
import GlowingDot from './GlowingDot';
import { DECISION_GLASS_CARD } from '../utils';
import { DecisionDebtorFateLine } from './DecisionDebtorFateLine';
import {
    AppealWorkflowCardActionsPanel,
    AppealWorkflowCardDetailsSection,
} from './AppealWorkflowCardSections';
import { useAppealWorkflowCardDerivedState } from './useAppealWorkflowCardDerivedState';
import type { AppealWorkflowCardProps } from './appealWorkflowCardTypes';

function AppealWorkflowCard({
    decision,
    appealCardRank = 0,
    appealCardsTotal = 1,
    appealPerspective = 'creditor_agent',
    ...rest
}: AppealWorkflowCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const derived = useAppealWorkflowCardDerivedState({
        decision,
        decisions: rest.decisions,
        appealPerspective,
        requestNeedsExecutorOutcome: rest.requestNeedsExecutorOutcome,
        buildDecisionCardStatus: rest.buildDecisionCardStatus,
        canShowAppealInitialForDecision: rest.canShowAppealInitialForDecision,
    });

    const {
        titleClean,
        phaseLabel,
        isAppealCopy,
        compactAppealCopyChrome,
        statusPillEl,
        dateStr,
        underlyingHub,
        requestFiler,
        debtorFateLine,
        enforcementState,
        hubTitleClean,
        showHubLink,
        appealPerspective: perspective,
    } = derived;

    return (
        <div
            id={`hami-appeal-card-${decision.id}`}
            className={`${DECISION_GLASS_CARD} ${
                appealCardRank === 0 ? 'ring-1 ring-amber-400/30 shadow-[0_0_24px_rgba(251,191,36,0.08)]' : ''
            }`}
            dir="rtl"
        >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {!compactAppealCopyChrome ? (
                    <div className="mb-1 flex flex-wrap items-center justify-end gap-1.5">
                        {appealCardRank === 0 && appealCardsTotal > 1 ? (
                            <span className="rounded-md border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
                                الأحدث
                            </span>
                        ) : null}
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                            {phaseLabel}
                        </span>
                        {isAppealCopy ? (
                            <span className="rounded-md border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-100">
                                نسخة طعن
                            </span>
                        ) : null}
                    </div>
                ) : appealCardRank === 0 && appealCardsTotal > 1 ? (
                    <div className="mb-1 flex flex-wrap items-center justify-end gap-1.5">
                        <span className="rounded-md border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
                            الأحدث
                        </span>
                    </div>
                ) : null}
                <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-right">
                        <GlowingDot
                            status={decision.appealStatus}
                            outcome={decision.executorOutcome}
                            origin={decision.appealRequestOrigin}
                            perspective={perspective}
                            requestFiler={requestFiler}
                        />
                        <h3 className="break-words text-sm font-bold text-slate-100">
                            الطلب: {titleClean}
                        </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">{statusPillEl}</div>
                </div>

                {!compactAppealCopyChrome ? (
                    <div className="mb-2 flex flex-col gap-1.5 text-[10px] text-slate-400">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span>{dateStr}</span>
                                <AppealOriginBadge decision={underlyingHub} perspective={perspective} />
                            </div>
                        </div>
                        {debtorFateLine ? (
                            <DecisionDebtorFateLine
                                enforcementState={enforcementState}
                                fateLine={debtorFateLine}
                            />
                        ) : null}
                        {showHubLink ? (
                            <p className="text-[10px] leading-relaxed text-slate-500">
                                القرار الأصلي:{' '}
                                <span className="font-semibold text-slate-300">{hubTitleClean}</span>
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <AppealWorkflowCardDetailsSection
                    appealPerspective={perspective}
                    derived={derived}
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails((v) => !v)}
                />
            </div>

            <AppealWorkflowCardActionsPanel decision={decision} derived={derived} {...rest} />
        </div>
    );
}

export default React.memo(AppealWorkflowCard);
export type { AppealWorkflowCardProps } from './appealWorkflowCardTypes';
