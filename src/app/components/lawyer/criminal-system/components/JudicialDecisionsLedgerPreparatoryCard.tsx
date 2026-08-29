import React from 'react';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JourneyNode } from '@/app/types/criminal';
import {
    getPendingCassationAppealForResult,
    latestConcludedAppealWithBeneficiary,
} from '../judicialDecisionsEngine';
import { isDefendantBailTemplate, isDetentionDecisionTemplate } from '../proceduralRequestTypes';
import type { CriminalCase, LawyerRequest } from '../criminalStore';
import { normalizeProceduralRequestTemplate } from '../proceduralRequestTypes';
import { LawyerRequestUxBlock } from './LawyerRequestUxAddons';
import { RequestProceduralLinkStrip } from './RequestProceduralLinkStrip';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import {
    formatJudicialDecisionDetentionMetaRows,
    resolveDecisionLedgerKindTheme,
    resolveJudicialDecisionBailSummary,
} from '../decisionsLedgerVisuals';
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

/* ──────────────────────────── PreparatoryCard ──────────────────────────── */

export const PreparatoryCard = ({
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
    const proceduralRefs =
        linkedRequest && proceduralRefsForRequest ? proceduralRefsForRequest(linkedRequest.id) : [];

    const kindTheme = resolveDecisionLedgerKindTheme(decision);
    const { partyRow, article, partyMetaVisible } = resolveDecisionBodyMeta(
        decision,
        partyLabel,
        activeCaseArticle,
    );
    const bailDetail = isDefendantBailTemplate(template)
        ? resolveJudicialDecisionBailSummary(decision, linkedRequest?.defendantBail)
        : null;
    const detentionRows = isDetentionDecisionTemplate(template)
        ? formatJudicialDecisionDetentionMetaRows(decision)
        : [];

    const chips = (
        <>
            {decision.requestOutcomeStatus ? (
                <RequestOutcomeBadge status={decision.requestOutcomeStatus} />
            ) : null}
        </>
    );

    return (
        <div
            className={`relative mr-5 rounded-lg border p-2.5 ${kindTheme.background} ${kindTheme.border} ${kindTheme.glow}`}
        >
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
                {partyRow || article || bailDetail || detentionRows.length ? (
                    <BodyMetaGrid
                        partyRow={partyRow}
                        article={article}
                        bailDetail={bailDetail}
                        extraRows={detentionRows}
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

            {/* Footer — زر التمييز والطعون */}
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
