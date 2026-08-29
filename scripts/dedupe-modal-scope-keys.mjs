/**
 * إزالة مفاتيح مكررة من dynamic scope call (موجودة في executionModalFlags/Setters)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORE = path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts');
const DYNAMIC = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreDynamicScope.ts',
);
if (!fs.existsSync(DYNAMIC)) {
    console.log('[spent] buildExecutionDashboardCoreDynamicScope.ts — skip');
    process.exit(0);
}

function extractBalancedBlock(src, openBraceIdx) {
    let depth = 0;
    for (let i = openBraceIdx; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return { body: src.slice(openBraceIdx + 1, i), end: i + 1 };
        }
    }
    throw new Error('unbalanced');
}

function extractShorthandKeys(body) {
    return [...body.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]);
}

function extractObjectKeys(src, varName) {
    const marker = `const ${varName} = {`;
    const start = src.indexOf(marker);
    if (start < 0) return [];
    const open = start + marker.length - 1;
    const { body } = extractBalancedBlock(src, open);
    return extractShorthandKeys(body);
}

const core = fs.readFileSync(CORE, 'utf8');
const modalKeys = new Set([
    ...extractObjectKeys(core, 'executionModalFlags'),
    ...extractObjectKeys(core, 'executionModalSetters'),
]);

const lazyMarker = 'getScopeSources: () =>\n            buildExecutionDashboardChunkScopeSources(\n                buildExecutionDashboardCoreDynamicScope({';
const lazyStart = core.indexOf(lazyMarker);
const lazyOpen = lazyStart + lazyMarker.length - 1;
const lazyExtract = extractBalancedBlock(core, lazyOpen);
const scopeKeys = extractShorthandKeys(lazyExtract.body);
const deduped = scopeKeys.filter(
    (k, i, arr) =>
        !['executionModalFlags', 'executionModalSetters', 'followupScopeBag', 'coerciveScopeBag'].includes(k) &&
        !modalKeys.has(k) &&
        arr.indexOf(k) === i,
);

const scopeInputLines = deduped.map((k) => `                        ${k},`).join('\n');
const scopeReplacement = `buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
${scopeInputLines}
                })`;

const newCore =
    core.slice(0, lazyStart) +
    `getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                ${scopeReplacement}` +
    core.slice(lazyExtract.end);
fs.writeFileSync(CORE, newCore, 'utf8');

let dynamic = fs.readFileSync(DYNAMIC, 'utf8');
for (const key of modalKeys) {
    dynamic = dynamic.replace(new RegExp(`\\n\\s+${key}: input\\.${key},`, 'g'), '');
}
fs.writeFileSync(DYNAMIC, dynamic, 'utf8');

console.log('removed modal dupes from scope call:', scopeKeys.length - deduped.length);
console.log('remaining scope keys:', deduped.length);
