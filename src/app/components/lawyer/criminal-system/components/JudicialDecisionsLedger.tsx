import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from '../criminalStageUtils';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import {
    sortJudicialDecisionsChronologically,
    sortJudicialDecisionsNewestFirst,
} from '../judicialDecisionsEngine';
import { isActiveDetentionCard } from '../detentionEngine';
import { isLiveOrderEnforcementCard } from '../orderEnforcementEngine';
import type { CriminalCase, LawyerRequest } from '../criminalStore';
import type { CriminalDefendant } from '../criminalStore';
import { LawyerRequestCard } from './LawyerRequestCard';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import type { JourneyNode } from '@/app/types/criminal';
import type { CaseStage } from '@/app/types/criminal';
import { buildLawyerMotionUnifiedFeed } from '../lawyerMotionFeedEngine';
import {
    applyDecisionsLedgerKindFilter,
    resolveDecisionsLedgerEmptyLabel,
    resolveLinkedLawyerRequest,
    type DecisionsLedgerKindFilter,
} from '../judicialDecisionsLedgerEngine';
import { PreparatoryCard } from './JudicialDecisionsLedgerPreparatoryCard';
import { DispositiveCard } from './JudicialDecisionsLedgerDispositiveCard';

export type { DecisionsLedgerKindFilter };

export type LiveDetentionCardRenderContext = {
    decision: JudicialDecision;
    allDecisions: JudicialDecision[];
    partyLabel: (id: string) => string;
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
    onAppeal: () => void;
    onResult: (appeal: JudicialDecisionAppeal) => void;
    onInterventionCassation: () => void;
    onCassationCorrection: () => void;
    onDeclareJudgmentFinal: () => void;
    onMoveToTrash?: () => void;
};

export type LiveArrestSummonCardRenderContext = {
    decision: JudicialDecision;
    partyLabel: (id: string) => string;
    onAppeal: () => void;
    onResult: (appeal: JudicialDecisionAppeal) => void;
    onMoveToTrash?: () => void;
};

export type JudicialDecisionsLedgerProps = {
    decisions: JudicialDecision[];
    parties: CriminalActionParty[];
    /** مطلوب لفلترة تبويبي البالغين/الأحداث في التحقيق. */
    defendants?: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile'>>;
    lawyerRequests?: LawyerRequest[];
    userRole?: CriminalCaseUserRole;
    readOnly?: boolean;
    /**
     * فلتر العَرض — يُحدِّد أيّ مَسار من السجل سَيظهر:
     *   • `all`           : كل السجلات.
     *   • `judicial`     : قَرارات قضائية فقط.
     *   • `lawyer_motion`: قَرارات صادرة عن طلب محامٍ فقط.
     */
    kindFilter?: DecisionsLedgerKindFilter;
    onFileAppeal: (decision: JudicialDecision) => void;
    onRecordAppealResult: (decision: JudicialDecision, appeal: JudicialDecisionAppeal) => void;
    onAddRequestMargin?: (requestId: string, text: string) => void;
    onToggleRequestStar?: (requestId: string) => void;
    proceduralRefsForRequest?: (requestId: string) => ProceduralLinkReference[];
    onNavigateProcedural?: (target: ProceduralNavTarget) => void;
    /** بطاقة التوقيف الحية — تُمرَّر من CriminalDashboard. */
    renderLiveDetentionCard?: (ctx: LiveDetentionCardRenderContext) => React.ReactNode;
    /** بطاقة استقدام/قبض الحية — تُمرَّر من CriminalDashboard. */
    renderLiveArrestSummonCard?: (ctx: LiveArrestSummonCardRenderContext) => React.ReactNode;
    /** إضبارة التحقيق — لتفعيل أزرار تصفية الخصوم على قرارات الغلق. */
    investigationPurgeCase?: CriminalCase;
    /** إضبارة مختومة — تُجمّد التفاعل ما عدا بطاقات قرار الغلق/التمييز. */
    investigationDossierSealed?: boolean;
    stageJourney?: JourneyNode[];
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
    onInterventionCassation?: (decision: JudicialDecision) => void;
    onCassationCorrection?: (decision: JudicialDecision) => void;
    onDeclareJudgmentFinal?: (decision: JudicialDecision) => void;
    /** تبديل «منع/وقف سير الدعوى» على أوامر طلبات المحامين (جنح/جنايات). */
    onRequestOrderProceedingsBlockChange?: (
        decision: JudicialDecision,
        blocksProceedings: boolean,
    ) => void;
    /** طلبات قيد النظر — تُدمَج مع السجل في تبويب طلبات المحامي دون تكرار. */
    pendingLawyerRequests?: LawyerRequest[];
    onRecordJudgeMargin?: (request: LawyerRequest) => void;
    onMoveRequestToTrash?: (request: LawyerRequest) => void;
    /** نقل بطاقة القرار إلى سلة المهملات. */
    onMoveToTrash?: (decision: JudicialDecision) => void;
    /** مادة الاتهام الحالية — لإخفاء تكرار «المادة» على البطاقة. */
    activeCaseArticle?: string;
};

const resolveLinkedRequest = resolveLinkedLawyerRequest;

/* ─────────────────────── Ledger root + Empty state ─────────────────────── */

/** سجل زمني قضائي موحد — تايم لاين عمودي متسلسل. */
export const JudicialDecisionsLedger = ({
    decisions,
    parties,
    defendants = [],
    lawyerRequests,
    readOnly,
    kindFilter,
    onFileAppeal,
    onRecordAppealResult,
    onAddRequestMargin,
    onToggleRequestStar,
    proceduralRefsForRequest,
    onNavigateProcedural,
    renderLiveDetentionCard,
    renderLiveArrestSummonCard,
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
    pendingLawyerRequests,
    onRecordJudgeMargin,
    onMoveRequestToTrash,
    activeCaseArticle,
}: JudicialDecisionsLedgerProps) => {
    const sorted = sortJudicialDecisionsChronologically(decisions);
    const visible = sortJudicialDecisionsNewestFirst(applyDecisionsLedgerKindFilter(sorted, kindFilter));
    const unifiedLawyerFeed =
        kindFilter === 'lawyer_motion' && pendingLawyerRequests !== undefined
            ? buildLawyerMotionUnifiedFeed(pendingLawyerRequests, visible)
            : null;
    const partyLabel = (id: string) => {
        const p = parties.find((x) => x.id === id);
        return p ? formatConcernedPartyLabel(p) : '—';
    };

    const renderDecisionEntry = (decision: JudicialDecision, index: number) => {
        const linkedRequest = resolveLinkedRequest(decision, lawyerRequests);
        return (
            <li key={decision.id} className="relative">
                <div
                    className="absolute right-0 top-4 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-[9px] font-medium text-white/60"
                    aria-hidden
                >
                    {index + 1}
                </div>
                {decision.decisionType === 'dispositive' ? (
                    <DispositiveCard
                        decision={decision}
                        linkedRequest={linkedRequest}
                        partyLabel={partyLabel}
                        readOnly={readOnly}
                        investigationDossierSealed={investigationDossierSealed}
                        onAppeal={() => onFileAppeal(decision)}
                        onResult={(a) => onRecordAppealResult(decision, a)}
                        onAddRequestMargin={onAddRequestMargin}
                        onToggleRequestStar={onToggleRequestStar}
                        proceduralRefsForRequest={proceduralRefsForRequest}
                        onNavigateProcedural={onNavigateProcedural}
                        investigationPurgeCase={investigationPurgeCase}
                        stageJourney={stageJourney}
                        caseStage={caseStage}
                        crimeTypeLabel={crimeTypeLabel}
                        userRole={userRole}
                        onInterventionCassation={onInterventionCassation}
                        onCassationCorrection={onCassationCorrection}
                        onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                        onRequestOrderProceedingsBlockChange={onRequestOrderProceedingsBlockChange}
                        onMoveToTrash={onMoveToTrash}
                        activeCaseArticle={activeCaseArticle}
                    />
                ) : isActiveDetentionCard(decision) && renderLiveDetentionCard ? (
                    renderLiveDetentionCard({
                        decision,
                        allDecisions: sorted,
                        partyLabel,
                        caseStage,
                        crimeTypeLabel,
                        onAppeal: () => onFileAppeal(decision),
                        onResult: (a) => onRecordAppealResult(decision, a),
                        onInterventionCassation: () => onInterventionCassation?.(decision),
                        onCassationCorrection: () => onCassationCorrection?.(decision),
                        onDeclareJudgmentFinal: () => onDeclareJudgmentFinal?.(decision),
                        onMoveToTrash:
                            !readOnly && onMoveToTrash ? () => onMoveToTrash(decision) : undefined,
                    })
                ) : isLiveOrderEnforcementCard(decision) && renderLiveArrestSummonCard ? (
                    renderLiveArrestSummonCard({
                        decision,
                        partyLabel,
                        onAppeal: () => onFileAppeal(decision),
                        onResult: (a) => onRecordAppealResult(decision, a),
                        onMoveToTrash:
                            !readOnly && onMoveToTrash ? () => onMoveToTrash(decision) : undefined,
                    })
                ) : (
                    <PreparatoryCard
                        decision={decision}
                        linkedRequest={linkedRequest}
                        partyLabel={partyLabel}
                        readOnly={readOnly}
                        investigationDossierSealed={investigationDossierSealed}
                        onAppeal={() => onFileAppeal(decision)}
                        onResult={(a) => onRecordAppealResult(decision, a)}
                        onAddRequestMargin={onAddRequestMargin}
                        onToggleRequestStar={onToggleRequestStar}
                        proceduralRefsForRequest={proceduralRefsForRequest}
                        onNavigateProcedural={onNavigateProcedural}
                        investigationPurgeCase={investigationPurgeCase}
                        stageJourney={stageJourney}
                        caseStage={caseStage}
                        crimeTypeLabel={crimeTypeLabel}
                        userRole={userRole}
                        onInterventionCassation={onInterventionCassation}
                        onCassationCorrection={onCassationCorrection}
                        onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                        onRequestOrderProceedingsBlockChange={onRequestOrderProceedingsBlockChange}
                        onMoveToTrash={onMoveToTrash}
                        activeCaseArticle={activeCaseArticle}
                    />
                )}
            </li>
        );
    };

    if (unifiedLawyerFeed) {
        if (!unifiedLawyerFeed.length) {
            const label = resolveDecisionsLedgerEmptyLabel(kindFilter);
            return (
                <div className="flex justify-center py-3 print:hidden">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white/80 text-xs font-bold whitespace-normal break-words">
                        <Scale className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        <span>{label}</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3 print:hidden" dir="rtl">
                <div className="text-white/70 text-xs font-black whitespace-normal break-words">طلبات المحامي</div>
                <div className="relative pr-3">
                    <div className="absolute right-2 top-1 bottom-1 w-px bg-white/10" aria-hidden />
                    <ul className="space-y-2.5 list-none m-0 p-0">
                        {unifiedLawyerFeed.map((row, index) =>
                            row.kind === 'pending_request' ? (
                                <li key={row.id} className="relative">
                                    <div
                                        className="absolute right-0 top-4 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-[9px] font-medium text-white/60"
                                        aria-hidden
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="mr-5">
                                        <LawyerRequestCard
                                            request={row.request}
                                            parties={parties}
                                            stageJourney={stageJourney}
                                            readOnly={readOnly}
                                            onRecordJudgeMargin={onRecordJudgeMargin}
                                            onMoveToTrash={onMoveRequestToTrash}
                                            onAddRequestMargin={(requestId, text) =>
                                                onAddRequestMargin?.(requestId, text)
                                            }
                                            onToggleRequestStar={(requestId) =>
                                                onToggleRequestStar?.(requestId)
                                            }
                                            proceduralRefsForRequest={proceduralRefsForRequest}
                                            onNavigateProcedural={onNavigateProcedural}
                                        />
                                    </div>
                                </li>
                            ) : (
                                renderDecisionEntry(row.decision, index)
                            ),
                        )}
                    </ul>
                </div>
            </div>
        );
    }

    if (!visible.length) {
        const label = resolveDecisionsLedgerEmptyLabel(kindFilter);
        return (
            <div className="flex justify-center py-3 print:hidden">
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white/80 text-xs font-bold whitespace-normal break-words">
                    <Scale className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span>{label}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative pr-3" dir="rtl">
            <div className="absolute right-2 top-1 bottom-1 w-px bg-white/10" aria-hidden />
            <ul className="space-y-2.5 list-none m-0 p-0">
                {visible.map((decision, index) => renderDecisionEntry(decision, index))}
            </ul>
        </div>
    );
};
