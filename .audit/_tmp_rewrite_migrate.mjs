import fs from 'node:fs';

const path = 'src/app/components/lawyer/criminal-system/criminalStorePersistMigrate.ts';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const headerEnd = lines.findIndex((l) => l.startsWith('export function migrateCriminalPersistState'));
const header = lines.slice(0, headerEnd);

const bodyStart = 555; // line 556 in 1-indexed = nextDraft
const bodyLines = lines.slice(bodyStart, -1); // exclude final `}`

const dedent = (line) => line.replace(/^                /, '    ');

const newImports = `import {
    normalizePersistFinalDecision,
    normalizePersistInvestigationLogs,
    normalizePersistLawyerRequests,
    normalizePersistLegalArticleHistory,
    normalizePersistOtherEvidenceItems,
    normalizePersistStatements,
    normalizePersistTimeline,
    stripLegacyPersistComplainant,
} from './criminalStorePersistMigrateNormalize';
import { migratePendingSeveranceContext } from './criminalStorePersistMigrateSeverance';
`;

const replacements = [
    [/\bnormalizeStatements\(/g, 'normalizePersistStatements('],
    [/\bnormalizeTimeline\(/g, 'normalizePersistTimeline('],
    [/\bnormalizeInvestigationLogs\(/g, 'normalizePersistInvestigationLogs('],
    [/\bnormalizeOtherEvidenceItems\(/g, 'normalizePersistOtherEvidenceItems('],
    [/\bnormalizeLawyerRequests\(/g, 'normalizePersistLawyerRequests('],
    [/\bnormalizeLegalArticleHistory\(/g, 'normalizePersistLegalArticleHistory('],
    [/\bnormalizeFinalDecision\(/g, 'normalizePersistFinalDecision('],
    [/\bstripLegacyComplainant\b/g, 'stripLegacyPersistComplainant'],
];

let body = bodyLines.map(dedent).join('\n');
for (const [from, to] of replacements) {
    body = body.replace(from, to);
}

// Drop unused imports from header
const dropImports = new Set([
    'isCorruptTimelineEvent',
    'sanitizeContentHighlights',
    'isLawyerRequestFinalStatus',
    'isStageExpirationReason',
    'normalizeTimelineCategoryForDisplay',
    'resolveTimelineEventTitle',
    'isTimelineNextDateInvalid',
    'InvestigationLog',
    'LawyerRequest',
    'LegalArticleChange',
    'OtherEvidenceItem',
    'StageConclusion',
    'Statement',
]);

const cleanedHeader = header
    .filter((line) => {
        for (const sym of dropImports) {
            if (line.includes(sym) && (line.includes('import') || line.trim().startsWith(sym))) {
                // keep if multi-import line - handle below
            }
        }
        return true;
    })
    .join('\n');

// Manual header cleanup - read original and remove specific unused imports
const headerText = lines.slice(0, headerEnd).join('\n');
const cleaned = headerText
    .replace(/import \{ isCorruptTimelineEvent \} from '\.\/criminalCaseTimelineUtils';\n/, '')
    .replace(/import \{ sanitizeContentHighlights \} from '\.\/statementContentHighlights';\n/, '')
    .replace(/import \{ isLawyerRequestFinalStatus \} from '\.\/lawyerRequestStatusMachine';\n/, '')
    .replace(/import \{ isStageExpirationReason \} from '\.\/stageExpirationReasons';\n/, '')
    .replace(
        /    normalizeTimelineCategoryForDisplay,\n    resolveTimelineEventTitle,\n    isTimelineNextDateInvalid,\n/g,
        '',
    )
    .replace(/    InvestigationLog,\n    LawyerRequest,\n    LegalArticleChange,\n    OtherEvidenceItem,\n/, '')
    .replace(/    StageConclusion,\n    Statement,\n    TimelineEvent,\n/, '    TimelineEvent,\n');

const fn = `export function migrateCriminalPersistState(persistedState: unknown): unknown {
    if (!persistedState || typeof persistedState !== 'object') return persistedState as any;
    const s = persistedState as any;

    migratePendingSeveranceContext(s);

${body}
}
`;

fs.writeFileSync(path, `${cleaned}\n${newImports}\n${fn}`);
console.log('done, lines:', (cleaned + newImports + fn).split(/\n/).length);
