import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { JudicialDecision } from '@/app/types/criminal';
import { formatLawyerRequestStatusLabel } from '../criminalStageUtils';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import { formatJudicialLedgerDate } from '../judicialDecisionsEngine';
import { lawyerRequestOutcomeBadgeClass } from '../lawyerRequestStatusMachine';
import type { CriminalCase } from '../criminalStore';
import {
    formatInvestigationDecisionDefendantNames,
    formatInvestigationPurgeDecisionDisplayTitle,
    isInvestigationPurgeDecisionTemplate,
} from '../investigationDefendantPurge';
import { normalizeProceduralRequestTemplate } from '../proceduralRequestTypes';
import { JourneyStageBadge } from './JourneyStageBadge';
import {
    classifyDecisionLedgerKind,
    formatDecisionLedgerKindLabel,
    resolveConcernedPartyText,
    resolveDecisionLedgerKindTheme,
    resolveLedgerDisplayArticle,
    resolveLedgerPartyRowLabel,
    shouldShowLedgerPartyMetaRow,
} from '../decisionsLedgerVisuals';
import type { JourneyNode } from '@/app/types/criminal';
import type { CaseStage } from '@/app/types/criminal';
import {
    shouldShowProceedingsBlockToggle,
    shouldShowRequestOrderAppealActions,
} from '../requestActionEngine';

const JudicialLedgerDate = ({ value }: { value: string }) => (
    <span dir="ltr" className="inline-block unicode-bidi-plaintext tabular-nums text-[#A0AEC0] text-[10px] font-light shrink-0">
        {formatJudicialLedgerDate(value)}
    </span>
);

export const RequestOutcomeBadge = ({ status }: { status: 'approved' | 'rejected' }) => (
    <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium whitespace-normal break-words ${lawyerRequestOutcomeBadgeClass(status)}`}
    >
        {formatLawyerRequestStatusLabel(status)}
    </span>
);

/** زرّ تسجيل الطعن التمييزي — أيقونة Scale صَغيرة، أنيق، يَنتمي حصراً لِشريط الـ Footer. */
type CassationAppealButtonProps = {
    onClick: () => void;
    /** عَلامة بصرية بارزة (لون ذهبيّ كامل) — للقرار الحاسم. */
    prominent?: boolean;
};

export const CassationAppealButton = ({ onClick, prominent }: CassationAppealButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={
            prominent
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/65 bg-[#E6C673]/20 px-3 py-1.5 text-[12px] font-black text-[#E6C673] hover:bg-[#E6C673]/30 transition'
                : 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/55 bg-[#E6C673]/12 px-3 py-1.5 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/22 transition'
        }
        aria-label="تسجيل طعن تمييزي"
    >
        <Scale className="w-4 h-4" aria-hidden />
        <span>تسجيل طعن تمييزي</span>
    </button>
);

export const HeaderSection = ({
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

export const BodyMetaGrid = ({
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

export function resolveDecisionBodyMeta(
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

export const PurgeDefendantScopeBadge = ({
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

export const RecordPurgeCassationResultButton = ({
    onClick,
}: {
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/65 bg-[#E6C673]/20 px-4 py-2 text-[12px] font-black text-[#E6C673] hover:bg-[#E6C673]/30 transition"
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

export function ledgerDecisionHasFooterActions(
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
export const FooterActionBar = ({ children }: { children: React.ReactNode }) => {
    if (!flattenFooterChildren(children).length) return null;
    return (
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
            {children}
        </div>
    );
};

export type AppealLifecyclePassthrough = {
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
