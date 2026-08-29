import React from 'react';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JourneyNode } from '@/app/types/criminal';
import {
    getPendingCassationAppealForResult,
    latestConcludedAppealWithBeneficiary,
} from '../judicialDecisionsEngine';
import { isDetentionDecisionTemplate } from '../proceduralRequestTypes';
import type { CriminalCase, LawyerRequest } from '../criminalStore';
import { normalizeProceduralRequestTemplate } from '../proceduralRequestTypes';
import { LawyerRequestUxBlock } from './LawyerRequestUxAddons';
import { RequestProceduralLinkStrip } from './RequestProceduralLinkStrip';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import { DecisionCassationAppealsPanel } from './DecisionCassationAppealsPanel';
import { DecisionInterventionCassationPanel } from './DecisionInterventionCassationPanel';
import { RequestActionComponent } from './RequestActionComponent';
import { DecisionCardTrashButton } from './DecisionCardTrashButton';
import { resolveRecordJourneyStage } from '../casePhaseFilterEngine';
import { journeyStageSpineClass } from '../journeyStageVisuals';
import {
    resolveLedgerEffectiveReadOnly,
    resolveLedgerPurgeAppealFlags,
    resolveShowCassationAppealButton,
} from '../judicialDecisionsLedgerEngine';
import {
    BodyMetaGrid,
    CassationAppealButton,
    FooterActionBar,
    HeaderSection,
    PurgeDefendantScopeBadge,
    RecordPurgeCassationResultButton,
    RequestOutcomeBadge,
    ledgerDecisionHasFooterActions,
    resolveDecisionBodyMeta,
    type AppealLifecyclePassthrough,
} from './JudicialDecisionsLedgerCardShared';

/* ──────────────────────────── DispositiveCard ──────────────────────────── */

export const DispositiveCard = ({
    decision,
    linkedRequest,
    partyLabel,
    readOnly,
    onAppeal,
    onResult,
    onAddRequestMargin,
    onToggleRequestStar,
    proceduralRefsForRequest,
    onNavigateProcedural,
    investigationPurgeCase,
    investigationDossierSealed,
    stageJourney,
    caseStage,
    crimeTypeLabel,
    userRole,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRequestOrderProceedingsBlockChange,
    onMoveToTrash,
    activeCaseArticle,
}: {
    decision: JudicialDecision;
    linkedRequest?: LawyerRequest;
    partyLabel: (id: string) => string;
    readOnly?: boolean;
    investigationDossierSealed?: boolean;
    onAppeal: () => void;
    onResult: (appeal: JudicialDecisionAppeal) => void;
    onAddRequestMargin?: (requestId: string, text: string) => void;
    onToggleRequestStar?: (requestId: string) => void;
    proceduralRefsForRequest?: (requestId: string) => ProceduralLinkReference[];
    onNavigateProcedural?: (target: ProceduralNavTarget) => void;
    investigationPurgeCase?: CriminalCase;
    stageJourney?: JourneyNode[];
    activeCaseArticle?: string;
} & AppealLifecyclePassthrough) => {
    const recordStage = resolveRecordJourneyStage(
        { issuedAt: decision.issuedAt, proceduralNodeId: decision.proceduralNodeId },
        stageJourney,
    );
    const cassationResultBadge = latestConcludedAppealWithBeneficiary(decision);
    const pendingAppeal = getPendingCassationAppealForResult(decision);
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    const { isPurgeDecision, isPurgeAppealable } = resolveLedgerPurgeAppealFlags(
        decision,
        investigationPurgeCase,
    );
    const effectiveReadOnly = resolveLedgerEffectiveReadOnly({
        readOnly,
        investigationDossierSealed,
        isPurgeAppealable,
    });
    const showRecordResult = isPurgeAppealable
        ? !readOnly && pendingAppeal
        : !effectiveReadOnly && pendingAppeal;
    const appealCtx = {
        caseStage,
        crimeTypeLabel,
        userRole,
        decisionRecordStage: recordStage,
    };
    const showAppealButton = isPurgeAppealable
        ? resolveShowCassationAppealButton(decision, readOnly, investigationPurgeCase, appealCtx)
        : resolveShowCassationAppealButton(decision, effectiveReadOnly, investigationPurgeCase, appealCtx);
    const showFooterActions = ledgerDecisionHasFooterActions(decision, {
        isPurgeAppealable,
        showAppealButton,
        showRecordResult,
        caseStage,
        recordStage,
    });
    const isDetentionCard = isDetentionDecisionTemplate(decision.proceduralTemplate ?? decision.title);
    const proceduralRefs =
        linkedRequest && proceduralRefsForRequest ? proceduralRefsForRequest(linkedRequest.id) : [];

    const { partyRow, article, partyMetaVisible } = resolveDecisionBodyMeta(
        decision,
        partyLabel,
        activeCaseArticle,
    );

    const chips = (
        <>
            {decision.requestOutcomeStatus ? (
                <RequestOutcomeBadge status={decision.requestOutcomeStatus} />
            ) : decision.isLocked && isDetentionCard ? (
                <span className="inline-block rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-black text-sky-100">
                    قرار نافذ
                </span>
            ) : null}
        </>
    );

    return (
        <div className="relative mr-5 rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.22)] ring-1 ring-[#E6C673]/10">
            {!effectiveReadOnly && onMoveToTrash ? (
                <DecisionCardTrashButton onClick={() => onMoveToTrash(decision)} />
            ) : null}
            <span
                className={`absolute -right-0.5 top-2 bottom-2 w-0.5 rounded-full ${journeyStageSpineClass(recordStage)}`}
                aria-hidden
            />
            <div
                className={`flex flex-wrap items-start justify-between gap-1.5${!effectiveReadOnly && onMoveToTrash ? ' pl-11' : ''}`}
            >
                <HeaderSection
                    decision={decision}
                    chips={chips}
                    stageJourney={stageJourney}
                />
            </div>

            <div className="mt-1.5 space-y-1.5">
                <PurgeDefendantScopeBadge
                    decision={decision}
                    investigationPurgeCase={investigationPurgeCase}
                    partyLabel={partyLabel}
                    hideWhenPartyMetaVisible={partyMetaVisible}
                />
                {partyRow || article ? (
                    <BodyMetaGrid
                        partyRow={partyRow}
                        article={article}
                    />
                ) : null}
                {linkedRequest && onAddRequestMargin && onToggleRequestStar ? (
                    <LawyerRequestUxBlock
                        request={linkedRequest}
                        readOnly={effectiveReadOnly}
                        onAddMargin={(text) => onAddRequestMargin(linkedRequest.id, text)}
                        onToggleStar={() => onToggleRequestStar(linkedRequest.id)}
                    />
                ) : null}
                {proceduralRefs.length > 0 && onNavigateProcedural ? (
                    <RequestProceduralLinkStrip references={proceduralRefs} onNavigate={onNavigateProcedural} />
                ) : null}
                {!isPurgeAppealable ? (
                    <>
                        <DecisionInterventionCassationPanel
                            decision={decision}
                            partyLabel={partyLabel}
                            readOnly={effectiveReadOnly}
                            onRecordResult={onResult}
                        />
                        <DecisionCassationAppealsPanel decision={decision} partyLabel={partyLabel} />
                    </>
                ) : null}
            </div>

            {/* Footer */}
            {showFooterActions ? (
                <FooterActionBar>
                    {isPurgeAppealable ? (
                        <>
                            {showAppealButton ? (
                                <CassationAppealButton onClick={onAppeal} prominent />
                            ) : null}
                            {showRecordResult ? (
                                <RecordPurgeCassationResultButton onClick={() => onResult(pendingAppeal!)} />
                            ) : null}
                        </>
                    ) : (
                        <RequestActionComponent
                            decision={decision}
                            caseStage={caseStage}
                            decisionRecordStage={recordStage}
                            crimeTypeLabel={crimeTypeLabel}
                            readOnly={effectiveReadOnly}
                            userRole={userRole}
                            onProceedingsBlockChange={
                                onRequestOrderProceedingsBlockChange
                                    ? (blocks) => onRequestOrderProceedingsBlockChange(decision, blocks)
                                    : undefined
                            }
                            onCassationAppeal={onAppeal}
                            onInterventionCassation={() => onInterventionCassation?.(decision)}
                            onCassationCorrection={() => onCassationCorrection?.(decision)}
                            onDeclareJudgmentFinal={() => onDeclareJudgmentFinal?.(decision)}
                            onRecordAppealResult={
                                showRecordResult && pendingAppeal ? () => onResult(pendingAppeal) : undefined
                            }
                            prominentCassation={isPurgeDecision}
                        />
                    )}
                </FooterActionBar>
            ) : null}
        </div>
    );
};
