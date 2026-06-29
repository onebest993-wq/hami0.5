import fs from 'node:fs';
import path from 'node:path';

const storePath = path.resolve('src/app/components/lawyer/criminal-system/criminalStore.ts');
const outPath = path.resolve('src/app/components/lawyer/criminal-system/criminalStorePersistMigrate.ts');

const lines = fs.readFileSync(storePath, 'utf8').split(/\r?\n/);

const bodyStart = lines.findIndex((l) => l.includes('migrate: (persistedState: unknown) =>')) + 1;
const bodyEnd = lines.findIndex((l, i) => i > bodyStart && l.trim() === '},' && lines[i - 1]?.includes('casesById: casesOut'));

if (bodyStart <= 0 || bodyEnd <= bodyStart) {
    console.error('Could not locate migrate block', { bodyStart, bodyEnd });
    process.exit(1);
}

const body = lines.slice(bodyStart, bodyEnd).join('\n');

const header = `// @ts-nocheck
/** ترحيل حالة Zustand persist للنظام الجزائي — مُستخرج من criminalStore */
import type {
    CrimeType,
    CriminalCase,
    CriminalCaseStage,
    CriminalDefendant,
    CriminalDossierStatus,
    InAbsentiaDetails,
    InvestigationLog,
    JudicialDecision,
    LawyerRequest,
    LegalArticleChange,
    OtherEvidenceItem,
    PhysicalLocation,
    ProceduralNode,
    SeveranceReason,
    StageConclusion,
    Statement,
    TimelineEvent,
} from '@/app/types/criminal';
import type { JourneyNode } from '@/app/types/criminal';
import { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';
import { createCriminalId as createId } from './criminalIdUtils';
import { makeInitialDraft, normalizeCriminalCaseLocation, normalizeSocialInquiryReport } from './criminalCaseDraftFactory';
import {
    coerceDefendantFullName,
    normalizeOurRepresentation,
    resolveDefendantFullName,
} from './criminalProceduralPartyUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { normalizeSeizedAssets } from './criminalSeizedAssetModel';
import { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { resolveOfficialCaseNumber, isInternalCaseIdentifier } from './criminalCaseReferenceUtils';
import { repairUnknownDefendantCaseRecord } from './criminalUnknownDefendant';
import { normalizeTrashBin } from './criminalCaseTrash';
import { sanitizeContentHighlights } from './statementContentHighlights';
import {
    migrateLegacyPathsToContainers,
    normalizeProceduralContainers,
} from './proceduralContainersEngine';
import { normalizeProceduralCanvasAudit } from './proceduralSandboxToolkit';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { isLawyerRequestFinalStatus } from './lawyerRequestStatusMachine';
import { isStageExpirationReason } from './stageExpirationReasons';
import {
    normalizeTrialSessions,
    normalizeTrialDepositions,
} from './trialSessionsEngine';
import {
    normalizeChargeModifications,
    resolveCurrentAccusationArticleFromCase,
    resolveReferralArticleFromCase,
} from './trialChargeEngine';
import {
    migrateLegacyCassationToProceeding,
} from './cassationEngine';
import {
    mergeJudicialDecisionsFromRequests,
    normalizeJudicialDecision,
} from './judicialDecisionsEngine';
import { migrateVerdictCardsOnCase } from './verdictCardsEngine';
import { normalizeInvestigationDefendantStatus } from './investigationDefendantPurge';
import {
    isInvestigationStoredStage,
    normalizeLegacyCriminalStage,
    normalizeTimelineCategoryForDisplay,
    resolveCaseStageFromRecord,
    resolveTimelineEventTitle,
    isTimelineNextDateInvalid,
} from './criminalStageUtils';
import { isSeveranceReasonValue } from './caseSeveranceView';
import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
    normalizeTrialChargeFieldsOnCase,
    resolveInvestigationCaseNumberSnapshot,
    sanitizeMergeTimelineEvents,
    sanitizeMergedCasesTexts,
} from './criminalStorePersistSupport';

export function migrateCriminalPersistState(persistedState: unknown): unknown {
${body}
}
`;

fs.writeFileSync(outPath, header, 'utf8');
console.log(`Wrote ${outPath} (${body.split('\n').length} body lines)`);
