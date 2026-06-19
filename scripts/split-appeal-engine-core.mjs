/**
 * Split appealEngineCore.tsx into domain modules under utils/appeal-engine/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/utils/appealEngineCore.tsx',
);
const outDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/utils/appeal-engine');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const BASE = lines.slice(0, 27).join('\n').replace(
    /from '\.\//g,
    "from '../",
);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

const chunks = [
    {
        file: 'appealProceedings.ts',
        body: slice(29, 773),
    },
    {
        file: 'manualExecutorLedger.ts',
        body: slice(774, 1490),
    },
    {
        file: 'decisionCardFormatting.ts',
        body: slice(1491, 1511),
    },
    {
        file: 'appealDates.ts',
        body: slice(1512, 1731),
    },
    {
        file: 'appealWorkflowActors.ts',
        body: slice(1733, 2133),
    },
    {
        file: 'decisionHubPipeline.tsx',
        body: slice(2134, 2351),
    },
    {
        file: 'creditorAppealEnforcement.ts',
        body: slice(2352, 2888),
    },
    {
        file: 'creditorAppealGate.ts',
        body: slice(2890, 3251),
    },
    {
        file: 'appealsHubCatalog.ts',
        body: `${slice(3255, 3436)}\n`,
    },
];

fs.mkdirSync(outDir, { recursive: true });

const sharedImport = `import { executionDecisionAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';\n`;

for (const { file, body } of chunks) {
    const header =
        file === 'appealsHubCatalog.ts'
            ? BASE.replace(/\nimport \{[^]*?from '\.\/appealRequestOrigin';\n/, '\n') +
              sharedImport +
              `\nimport { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';\n` +
              `import {\n` +
              `    hubWithInferredAppealOrigin,\n` +
              `    inferDecisionAppealRequestOrigin,\n` +
              `    isCreditorInitiatedExecutorRequest,\n` +
              `    isDecisionLikeRow,\n` +
              `    resolveRequestProponent,\n` +
              `} from '../appealRequestOrigin';\n`
            : BASE;
    fs.writeFileSync(path.join(outDir, file), `${header}\n\n${body}\n`);
}

const index = `/** Appeal engine — domain modules (barrel) */
export * from './appealProceedings';
export * from './manualExecutorLedger';
export * from './decisionCardFormatting';
export * from './appealDates';
export * from './appealWorkflowActors';
export * from './decisionHubPipeline';
export * from './creditorAppealEnforcement';
export * from './creditorAppealGate';
export * from './appealsHubCatalog';
`;

fs.writeFileSync(path.join(outDir, 'index.ts'), index);

console.log('Split appealEngineCore into', chunks.length, 'modules under appeal-engine/');
