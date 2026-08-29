import fs from 'node:fs';

const path = 'src/app/components/lawyer/criminal-system/criminalStorePersistMigrate.ts';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const header = `/**
 * Normalizers used during criminal persist migration — extracted from criminalStorePersistMigrate.ts
 */
import type {
    InvestigationLog,
    LawyerRequest,
    LegalArticleChange,
    OtherEvidenceItem,
    StageConclusion,
    Statement,
    TimelineEvent,
} from './criminalCaseModel';
import { createCriminalId as createId } from './criminalIdUtils';
import { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import { normalizeGuarantorDetails } from './criminalGuarantorModel';
import { sanitizeContentHighlights } from './statementContentHighlights';
import { isLawyerRequestFinalStatus } from './lawyerRequestStatusMachine';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { isStageExpirationReason } from './stageExpirationReasons';
import {
    isTimelineNextDateInvalid,
    normalizeTimelineCategoryForDisplay,
    resolveTimelineEventTitle,
} from './criminalStageUtils';

`;

const body = lines.slice(124, 542).map((l) => l.replace(/^                /, '')).join('\n');
const exports = body
    .replace(/const normalizeStatements/g, 'export function normalizePersistStatements')
    .replace(/const normalizeTimeline/g, 'export function normalizePersistTimeline')
    .replace(/const normalizeInvestigationLogs/g, 'export function normalizePersistInvestigationLogs')
    .replace(/const normalizeOtherEvidenceItems/g, 'export function normalizePersistOtherEvidenceItems')
    .replace(/const normalizeLawyerRequests/g, 'export function normalizePersistLawyerRequests')
    .replace(/const normalizeLegalArticleHistory/g, 'export function normalizePersistLegalArticleHistory')
    .replace(/const normalizeFinalDecision/g, 'export function normalizePersistFinalDecision')
    .replace(/const stripLegacyComplainant/g, 'export function stripLegacyPersistComplainant');

const out = 'src/app/components/lawyer/criminal-system/criminalStorePersistMigrateNormalize.ts';
fs.writeFileSync(out, header + exports + '\n');
console.log('wrote', out, 'lines:', (header + exports).split(/\n/).length);
