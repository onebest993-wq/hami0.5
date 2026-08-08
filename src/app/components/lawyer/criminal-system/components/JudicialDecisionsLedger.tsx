import React from 'react';
import { Scale } from '@/app/components/ui/lucideIcons';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from '../criminalStageUtils';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import { formatLawyerRequestStatusLabel } from '../criminalStageUtils';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import {
    getPendingCassationAppealForResult,
    formatJudicialLedgerDate,
    formatRectificationBadge,
    latestConcludedAppealWithBeneficiary,
    sortJudicialDecisionsChronologically,
    sortJudicialDecisionsNewestFirst,
} from '../judicialDecisionsEngine';
import { lawyerRequestOutcomeBadgeClass } from '../lawyerRequestStatusMachine';
import {
    cassationResultMarkClass,
    formatCassationResultShortLabel,
    normalizeCassationAppealResult,
} from '../cassationJudicialForm';
import { isDefendantBailTemplate, isDetentionDecisionTemplate } from '../proceduralRequestTypes';
import { isActiveDetentionCard } from '../detentionEngine';
import { isLiveOrderEnforcementCard } from '../orderEnforcementEngine';
import type { CriminalCase, LawyerRequest } from '../criminalStore';
import {
    formatInvestigationDecisionDefendantNames,
    formatInvestigationPurgeDecisionDisplayTitle,
    isInvestigationPurgeDecisionTemplate,
} from '../investigationDefendantPurge';
import { normalizeProceduralRequestTemplate } from '../proceduralRequestTypes';
import { judicialDecisionMatchesPartyScope } from '../juvenileInvestigationRules';
import type { CriminalDefendant } from '../criminalStore';
import { LawyerRequestUxBlock } from './LawyerRequestUxAddons';
import { RequestProceduralLinkStrip } from './RequestProceduralLinkStrip';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';
import {
    classifyDecisionLedgerKind,
    formatDecisionLedgerKindLabel,
    formatJudicialDecisionDetentionMetaRows,
    resolveConcernedPartyText,
    resolveDecisionLedgerKindTheme,
    resolveJudicialDecisionBailSummary,
    resolveLedgerDisplayArticle,
    resolveLedgerPartyRowLabel,
    shouldShowLedgerPartyMetaRow,
} from '../decisionsLedgerVisuals';
import type { JourneyNode } from '@/app/types/criminal';
import { JourneyStageBadge } from './JourneyStageBadge';
import { DecisionCassationAppealsPanel } from './DecisionCassationAppealsPanel';
import { DecisionInterventionCassationPanel } from './DecisionInterventionCassationPanel';
import { RequestActionComponent } from './RequestActionComponent';
import {
    shouldShowProceedingsBlockToggle,
    shouldShowRequestOrderAppealActions,
} from '../requestActionEngine';
import { LawyerRequestCard } from './LawyerRequestCard';
import { buildLawyerMotionUnifiedFeed } from '../lawyerMotionFeedEngine';
import { DecisionCardTrashButton } from './DecisionCardTrashButton';
import { resolveRecordJourneyStage } from '../casePhaseFilterEngine';
import { journeyStageSpineClass } from '../journeyStageVisuals';
import type { CaseStage } from '@/app/types/criminal';
import {
    applyDecisionsLedgerKindFilter,
    resolveDecisionsLedgerEmptyLabel,
    resolveLedgerEffectiveReadOnly,
    resolveLedgerPurgeAppealFlags,
    resolveLinkedLawyerRequest,
    resolveShowCassationAppealButton,
    type DecisionsLedgerKindFilter,
} from '../judicialDecisionsLedgerEngine';

export type { DecisionsLedgerKindFilter };

/** تاريخ السجل بصيغة ISO ثابتة (تُلغي انقلاب RTL). */
const JudicialLedgerDate = ({ value }: { value: string }) => (
    <span dir="ltr" className="inline-block unicode-bidi-plaintext tabular-nums text-[#A0AEC0] text-[10px] font-light shrink-0">
        {formatJudicialLedgerDate(value)}
    </span>
);

const RequestOutcomeBadge = ({ status }: { status: 'approved' | 'rejected' }) => (
    <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium whitespace-normal break-words ${lawyerRequestOutcomeBadgeClass(status)}`}
    >
        {formatLawyerRequestStatusLabel(status)}
    </span>
);

/** شارة نتيجة الطعن التمييزي المُختصرة بأيقونة Scale (لا إيموجي). */
type CassationResultMarkProps = {
    appeal: JudicialDecisionAppeal;
    partyLabel: (id: string) => string;
    decisionTitle: string;
};

const CassationResultMark = ({ appeal, partyLabel, decisionTitle }: CassationResultMarkProps) => {
    const result = normalizeCassationAppealResult(typeof appeal.result === 'string' ? appeal.result : undefined);
    const label = formatCassationResultShortLabel(result);
    if (!label) return null;
    const tooltip = formatRectificationBadge(appeal, partyLabel, decisionTitle) ?? label;
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black whitespace-normal break-words ${cassationResultMarkClass(result)}`}
            title={tooltip}
        >
            <Scale className="w-3.5 h-3.5" aria-hidden />
            <span>{label}</span>
        </span>
    );
};

/** زرّ تسجيل الطعن التمييزي — أيقونة Scale صَغيرة، أنيق، يَنتمي حصراً لِشريط الـ Footer. */
type CassationAppealButtonProps = {
    onClick: () => void;
    /** عَلامة بصرية بارزة (لون ذهبيّ كامل) — للقرار الحاسم. */
    prominent?: boolean;
};

const CassationAppealButton = ({ onClick, prominent }: CassationAppealButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={
            prominent
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/65 bg-[#E6C673]/20 px-3 py-1.5 text-[12px] font-black text-[#E6C673] hover:bg-[#E6C673]/30 transition shadow-[0_0_10px_rgba(230,198,115,0.25)]'
                : 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/55 bg-[#E6C673]/12 px-3 py-1.5 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/22 transition'
        }
        aria-label="تسجيل طعن تمييزي"
    >
        <Scale className="w-4 h-4" aria-hidden />
        <span>تسجيل طعن تمييزي</span>
    </button>
);

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

/* ────────────── Card sub-sections (Header / Body / Footer) ─────────────── */

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

/* ────────────── Card sub-sections (Header / Body / Footer) ─────────────── */

const HeaderSection = ({
    decision,
    chips,
    stageJourney,
}: {
    decision: JudicialDecision;
    chips: React.ReactNode;
    stageJourney?: JourneyNode[];
}) => {
    const displayTitle = formatInvestigationPurgeDecisionDisplayTitle(decision.title);
    const ledgerKind = classifyDecisionLedgerKind(decision);
    const kindTheme = resolveDecisionLedgerKindTheme(decision);
    const ledgerKindLabel = formatDecisionLedgerKindLabel(ledgerKind);
    return (
        <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold whitespace-normal break-words ${kindTheme.chipBg} ${kindTheme.chipText}`}
                >
                    {ledgerKindLabel}
                </span>
                {stageJourney?.length ? (
                    <JourneyStageBadge
                        stageJourney={stageJourney}
                        item={{
                            issuedAt: decision.issuedAt,
                            proceduralNodeId: decision.proceduralNodeId,
                        }}
                    />
                ) : null}
                <JudicialLedgerDate value={decision.issuedAt} />
                {chips}
            </div>
            <span className="text-white font-medium text-[12px] leading-snug whitespace-normal break-words block">
                {displayTitle}
            </span>
        </div>
    );
};

const BodyMetaRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
        <span className="text-[#A0AEC0] text-[10px] font-light shrink-0">{label}</span>
        <span className="text-white/95 text-[11px] font-medium text-left whitespace-normal break-words min-w-0">
            {value}
        </span>
    </div>
);

const BodyMetaGrid = ({
    partyRow,
    article,
    bailDetail,
    extraRows = [],
}: {
    partyRow?: { label: string; value: string } | null;
    article?: string;
    bailDetail?: { label: string; value: string } | null;
    extraRows?: Array<{ label: string; value: string }>;
}) => {
    if (!partyRow && !article && !bailDetail && !extraRows.length) return null;
    return (
        <div className="space-y-0.5 border-t border-white/[0.06] pt-1.5 mt-1">
            {partyRow ? <BodyMetaRow label={partyRow.label} value={partyRow.value} /> : null}
            {article ? <BodyMetaRow label="المادة" value={article} /> : null}
            {bailDetail ? <BodyMetaRow label={bailDetail.label} value={bailDetail.value} /> : null}
            {extraRows.map((row) => (
                <BodyMetaRow key={row.label} label={row.label} value={row.value} />
            ))}
        </div>
    );
};

function resolveDecisionBodyMeta(
    decision: JudicialDecision,
    partyLabel: (id: string) => string,
    activeCaseArticle?: string,
) {
    const displayTitle = formatInvestigationPurgeDecisionDisplayTitle(decision.title);
    const partyText = resolveConcernedPartyText(decision, partyLabel, { nameOnly: true });
    const partyRow = shouldShowLedgerPartyMetaRow(partyText, displayTitle)
        ? resolveLedgerPartyRowLabel(decision, partyText)
        : null;
    const article = resolveLedgerDisplayArticle(decision, activeCaseArticle);
    return { partyRow, article, partyMetaVisible: Boolean(partyRow) };
}

const PurgeDefendantScopeBadge = ({
    decision,
    investigationPurgeCase,
    partyLabel,
    hideWhenPartyMetaVisible,
}: {
    decision: JudicialDecision;
    investigationPurgeCase?: CriminalCase;
    partyLabel: (id: string) => string;
    hideWhenPartyMetaVisible?: boolean;
}) => {
    if (hideWhenPartyMetaVisible) return null;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (!investigationPurgeCase || !isInvestigationPurgeDecisionTemplate(template)) return null;
    const names = formatInvestigationDecisionDefendantNames(investigationPurgeCase, decision, partyLabel);
    if (!names) return null;
    return (
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/12 px-2.5 py-1 text-[11px] font-black text-sky-100 whitespace-normal break-words">
            القرار يخص: {names}
        </span>
    );
};

const RecordPurgeCassationResultButton = ({
    onClick,
}: {
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/65 bg-[#E6C673]/20 px-4 py-2 text-[12px] font-black text-[#E6C673] hover:bg-[#E6C673]/30 transition shadow-[0_0_10px_rgba(230,198,115,0.2)]"
    >
        <Scale className="w-4 h-4" aria-hidden />
        <span>تسجيل نتيجة الطعن التمييزي</span>
    </button>
);

function flattenFooterChildren(node: React.ReactNode): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    React.Children.forEach(node, (child) => {
        if (child == null || child === false) return;
        if (React.isValidElement(child) && child.type === React.Fragment) {
            out.push(...flattenFooterChildren(child.props.children));
            return;
        }
        out.push(child);
    });
    return out;
}

function ledgerDecisionHasFooterActions(
    decision: JudicialDecision,
    options: {
        isPurgeAppealable: boolean;
        showAppealButton: boolean;
        showRecordResult: boolean;
        caseStage?: CaseStage;
        recordStage?: CaseStage;
    },
): boolean {
    if (options.isPurgeAppealable) {
        return options.showAppealButton || options.showRecordResult;
    }
    return (
        shouldShowProceedingsBlockToggle(decision, options.caseStage, options.recordStage) ||
        shouldShowRequestOrderAppealActions(decision, options.caseStage, options.recordStage)
    );
}

/**
 * شَريط الـ Footer المُستقل — أزرار التَفاعل فقط، مَفصول بِـ border-top رفيع.
 * لا يُرسم في حال عَدم وجود أزرار (Empty state).
 */
const FooterActionBar = ({ children }: { children: React.ReactNode }) => {
    if (!flattenFooterChildren(children).length) return null;
    return (
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
            {children}
        </div>
    );
};

type AppealLifecyclePassthrough = {
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
    userRole?: CriminalCaseUserRole;
    onInterventionCassation?: (decision: JudicialDecision) => void;
    onCassationCorrection?: (decision: JudicialDecision) => void;
    onDeclareJudgmentFinal?: (decision: JudicialDecision) => void;
    onRequestOrderProceedingsBlockChange?: (
        decision: JudicialDecision,
        blocksProceedings: boolean,
    ) => void;
    onMoveToTrash?: (decision: JudicialDecision) => void;
};

/* ──────────────────────────── PreparatoryCard ──────────────────────────── */

const PreparatoryCard = ({
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

/* ──────────────────────────── DispositiveCard ──────────────────────────── */

const DispositiveCard = ({
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
        <div className="relative mr-5 rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.22)] ring-1 ring-[#E6C673]/10">
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
