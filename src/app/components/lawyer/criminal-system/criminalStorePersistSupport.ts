/** دوال مساعدة مشتركة بين criminalStore وترحيل persist */
import type { JourneyNode, ProceduralNode } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, TimelineEvent } from './criminalCaseModel';
import type { TrialChargeModification } from './trialChargeEngine';
import { normalizeInvestigationDefendantStatus } from './investigationDefendantPurge';
import { coerceDefendantFullName, resolveDefendantFullName } from './criminalUnknownDefendant';
import {
    defaultPersonalStage,
} from './partyPersonalStage';
import {
    normalizeChargeModifications,
    resolveCurrentAccusationArticleFromCase,
    resolveReferralArticleFromCase,
} from './trialChargeEngine';
import { resolveOfficialCaseNumber, isInternalCaseIdentifier } from './criminalCaseReferenceUtils';
import {
    buildInitialStageJourney,
    formatJourneyPathDisplayLabel,
    getCurrentJourneyNode,
    migrateProceduralNodesToStageJourney,
    repairSameCourtRemandJourneyNodes,
    sanitizeJourneyNodeLabelsForJuvenileScope,
} from './stageJourney';
import {
    resolveCaseStageFromRecord,
    shouldUseJuvenileTrialJourneyLabels,
    syncStoredStageFromJourneyCaseStage,
} from './criminalStageUtils';

export function normalizeDefendantPersonalFields(d: CriminalDefendant): CriminalDefendant {
    const withName = coerceDefendantFullName(d);
    const ps = withName.personalStage ?? defaultPersonalStage();
    const isUnderSeven = Boolean((withName as CriminalDefendant).isUnderSeven);
    return {
        ...withName,
        isJuvenile: isUnderSeven ? false : Boolean((withName as CriminalDefendant).isJuvenile),
        isUnderSeven,
        personalStage: ps,
        investigationStatus: normalizeInvestigationDefendantStatus(d.investigationStatus),
        isPartyRecordLocked:
            d.isPartyRecordLocked === true ||
            ps === 'lawsuit_dropped_death' ||
            ps === 'lawsuit_dropped',
    };
}

export function normalizeTrialChargeFieldsOnCase(c: CriminalCase): {
    referralArticle?: string;
    currentAccusationArticle?: string;
    chargeModifications?: TrialChargeModification[];
} {
    const chargeModifications = normalizeChargeModifications(c.chargeModifications);
    const referralArticle = resolveReferralArticleFromCase({
        referralArticle: c.referralArticle,
        legalArticleHistory: c.legalArticleHistory,
        basicsLegalArticle: c.basics?.legalArticle,
    });
    const currentAccusationArticle = resolveCurrentAccusationArticleFromCase({
        currentAccusationArticle: c.currentAccusationArticle,
        chargeModifications,
        referralArticle: c.referralArticle,
        legalArticleHistory: c.legalArticleHistory,
        basicsLegalArticle: c.basics?.legalArticle,
    });
    return {
        referralArticle: referralArticle || undefined,
        currentAccusationArticle: currentAccusationArticle || undefined,
        chargeModifications: chargeModifications.length ? chargeModifications : undefined,
    };
}

export function resolveInvestigationCaseNumberSnapshot(c: CriminalCase): string {
    const dossier = String(c.location?.investigationDossierNumber ?? '').trim();
    if (dossier) return dossier;
    const reg = String(c.location?.baseRegisterNumberAndDate ?? '').trim();
    if (reg) return reg;
    const stored = String(c.investigationCaseNumber ?? '').trim();
    if (stored) return stored;
    const num = String(c.location?.caseNumber ?? '').trim();
    return num || '—';
}

function buildMergeTimelineDescription(childCaseNumber: string, mergeReason: string): string {
    const num = childCaseNumber && childCaseNumber !== '—' ? childCaseNumber : 'غير مسجّل';
    const reason = String(mergeReason ?? '').trim() || '—';
    return `تم ضم الإضبارة رقم ${num} ضمن هذه الإضبارة الأم. السبب: ${reason}`;
}

export function sanitizeMergedCasesTexts(texts: string[]): string[] {
    return texts
        .map((x) => String(x ?? '').trim())
        .filter((x) => x.length > 0 && !isInternalCaseIdentifier(x));
}

export function sanitizeMergeTimelineEvents(
    events: TimelineEvent[],
    mergedChildIds: string[],
    casesById: Record<string, CriminalCase | undefined>,
): TimelineEvent[] {
    if (!mergedChildIds.length) return events;
    let changed = false;
    const next = events.map((ev) => {
        if (ev.category !== 'ضم وإغلاق إضبارة') return ev;
        const desc = String(ev.description ?? '');
        const reasonMatch = desc.match(/السبب:\s*([\s\S]+)$/);
        const reason = reasonMatch?.[1]?.trim() || '—';
        for (const childId of mergedChildIds) {
            const childNum = resolveOfficialCaseNumber(casesById[childId]);
            const leakedId = desc.includes(childId) || isInternalCaseIdentifier(desc);
            if (!leakedId) continue;
            changed = true;
            return { ...ev, description: buildMergeTimelineDescription(childNum, reason) };
        }
        return ev;
    });
    return changed ? next : events;
}

function applyJuvenileTrialJourneyLabelSanitize(c: CriminalCase, nodes: JourneyNode[]): JourneyNode[] {
    const courtNum = String(c.courtCaseNumber ?? c.location?.caseNumber ?? '').trim();
    const withJuvenile = sanitizeJourneyNodeLabelsForJuvenileScope(
        nodes,
        (node) =>
            shouldUseJuvenileTrialJourneyLabels(Array.isArray(c.defendants) ? c.defendants : [], {
                defendantIds: node.defendantIds,
                storedStage: c.basics?.stage,
            }),
        courtNum,
    );
    let changed = false;
    const next = withJuvenile.map((n) => {
        const label = formatJourneyPathDisplayLabel(n);
        if (label === n.label) return n;
        changed = true;
        return { ...n, label };
    });
    return changed ? next : withJuvenile;
}

export function ensureStageJourneyOnCase(c: CriminalCase): CriminalCase {
    if (Array.isArray(c.stageJourney) && c.stageJourney.length > 0) {
        let repairedJourney = repairSameCourtRemandJourneyNodes(c.stageJourney);
        repairedJourney = applyJuvenileTrialJourneyLabelSanitize(c, repairedJourney);
        const currentNode = getCurrentJourneyNode(repairedJourney);
        const resolvedStage = currentNode?.stage ?? c.caseStage ?? resolveCaseStageFromRecord(c);
        const stored = syncStoredStageFromJourneyCaseStage(resolvedStage, c.basics?.stage);
        const journeyChanged = JSON.stringify(repairedJourney) !== JSON.stringify(c.stageJourney);
        const stageChanged = c.caseStage !== resolvedStage || c.basics?.stage !== stored;
        if (!journeyChanged && !stageChanged) return c;
        return {
            ...c,
            stageJourney: repairedJourney,
            caseStage: resolvedStage,
            basics: { ...c.basics, stage: stored },
        };
    }
    const legacy = (c as CriminalCase & { proceduralNodes?: ProceduralNode[] }).proceduralNodes;
    const journey =
        Array.isArray(legacy) && legacy.length > 0
            ? migrateProceduralNodesToStageJourney(legacy)
            : buildInitialStageJourney();
    return {
        ...c,
        stageJourney: journey,
        caseStage: c.caseStage ?? resolveCaseStageFromRecord(c),
    };
}
