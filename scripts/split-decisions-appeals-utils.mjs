/**
 * Split utils.ts — independent helpers + monolithic core (tight coupling) + presentation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const engineDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine');
const backupPath = path.join(engineDir, 'utils.full.bak.ts');
const srcPath = path.join(engineDir, 'utils.ts');
const utilsDir = path.join(engineDir, 'utils');

const raw = fs.readFileSync(backupPath, 'utf8');
const lines = raw.split(/\r?\n/);

const BASE_IMPORTS = lines.slice(0, 16).join('\n');
const GRAPH_IMPORTS = `import type { Decision } from '../types';\n`;

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

const chunks = [
    {
        file: 'decisionTextUtils.ts',
        header: `import { stripEmojisFromText } from '@/app/utils/timelineSmartDisplay';\n\n`,
        body: slice(18, 87),
    },
    {
        file: 'decisionGraphUtils.ts',
        header: GRAPH_IMPORTS + '\n',
        body: slice(2461, 2476),
    },
    {
        file: 'appealEngineCore.tsx',
        header:
            BASE_IMPORTS +
            `\nimport { parseDecisionPayloadJson, resolveUnderlyingDecisionHub } from './decisionGraphUtils';\n\n`,
        body: `${slice(88, 2460)}\n\n${slice(2477, 3596)}`,
    },
    {
        file: 'decisionPresentation.ts',
        header:
            BASE_IMPORTS +
            `\nimport { appealPipelineRowForCard } from './appealEngineCore';\n\n`,
        body: `${slice(3597, 3598)}\n${slice(3599, 3631)}`,
    },
];

fs.rmSync(utilsDir, { recursive: true, force: true });
fs.mkdirSync(utilsDir, { recursive: true });

for (const { file, header, body } of chunks) {
    fs.writeFileSync(path.join(utilsDir, file), `${header}${body}\n`);
}

const barrel = `/** Barrel — domain modules under ./utils/* */
export * from './utils/decisionTextUtils';
export * from './utils/decisionGraphUtils';
export * from './utils/appealEngineCore';
export * from './utils/decisionPresentation';
`;

fs.writeFileSync(srcPath, barrel);

for (const file of fs.readdirSync(utilsDir)) {
    const p = path.join(utilsDir, file);
    let t = fs.readFileSync(p, 'utf8');
    t = t
        .replaceAll("from './types'", "from '../types'")
        .replaceAll("from './decisionCardGlassShell'", "from '../decisionCardGlassShell'")
        .replaceAll("from './appealUiLabels'", "from '../appealUiLabels'");
    fs.writeFileSync(p, t);
}

// decisionPresentation uses resolveCreditorDecisionEnforcementState from core — same module after merge
const presPath = path.join(utilsDir, 'decisionPresentation.ts');
let pres = fs.readFileSync(presPath, 'utf8');
pres = pres.replace(
    `import { appealPipelineRowForCard } from './appealEngineCore';\n\n`,
    `import {\n    appealPipelineRowForCard,\n    resolveCreditorDecisionEnforcementState,\n} from './appealEngineCore';\n\n`,
);
fs.writeFileSync(presPath, pres);

console.log('Split: text + graph + core + presentation');
