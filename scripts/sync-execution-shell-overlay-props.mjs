/**
 * يُزامِن registry + getScopeSources مع كل s.* المستخدمة في shell overlay chunks.
 * الاستخدام: node scripts/sync-execution-shell-overlay-props.mjs
 */
import fs from 'node:fs';

const SHELL_KEYS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const IMPORTED_HELPERS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/executionDashboardImportedHelpersChunkScope.ts';

const OVERLAY_FILES = [
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardEditOverlays.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardExecutorWorkflowOverlays.tsx',
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardSolidaryEvictionOverlays.tsx',
];

/** دوال مستوردة — تُوفَّر عبر chunk scope ثابت لا عبر core */
const IMPORTED_OVERLAY_PROPS = new Set(['getLocalTodayYmd', 'mergeSimilarRecentTimelineEvent']);

function collectOverlayPropUsage() {
    const used = new Set();
    for (const file of OVERLAY_FILES) {
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/\bs\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) used.add(m[1]);
    }
    return used;
}

function readShellKeys() {
    const content = fs.readFileSync(SHELL_KEYS_PATH, 'utf8');
    const m = content.match(/export const EXECUTION_SHELL_OVERLAY_PROP_KEYS = \[([\s\S]*?)\] as const/);
    return { content, keys: [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) };
}

function writeShellKeys(content, keys) {
    const sorted = [...new Set(keys)].sort((a, b) => a.localeCompare(b));
    const body = sorted.map((k) => `    '${k}',`).join('\n');
    const next = content.replace(
        /export const EXECUTION_SHELL_OVERLAY_PROP_KEYS = \[[\s\S]*?\] as const/,
        `export const EXECUTION_SHELL_OVERLAY_PROP_KEYS = [\n${body}\n] as const`,
    );
    fs.writeFileSync(SHELL_KEYS_PATH, next);
    return sorted;
}

function collectBoundIdentifiers(text) {
    const bound = new Set(['queueMicrotask', 'onUpdate']);
    for (const m of text.matchAll(/\b(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g)) bound.add(m[1]);
    for (const m of text.matchAll(/\b(?:const|let|var)\s+\{([^}]+)\}/g)) {
        for (const part of m[1].split(',')) {
            const chunk = part.trim();
            if (!chunk || chunk.startsWith('...')) continue;
            const renamed = chunk.includes(':')
                ? chunk.split(':')[1].split('=')[0].trim()
                : chunk.split('=')[0].trim();
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(renamed)) bound.add(renamed);
        }
    }
    for (const m of text.matchAll(/\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) bound.add(m[1]);
    return bound;
}

function ensureImportedHelpers(keys) {
    let src = fs.readFileSync(IMPORTED_HELPERS_PATH, 'utf8');
    let changed = false;
    if (keys.has('getLocalTodayYmd') && !src.includes('getLocalTodayYmd')) {
        src = src.replace(
            "import { EXEC_MODAL_Z } from './executionDashboardConstants';",
            "import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';\nimport { mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';\nimport { EXEC_MODAL_Z } from './executionDashboardConstants';",
        );
        src = src.replace(
            '    formatUnifiedLedgerDate,',
            '    formatUnifiedLedgerDate,\n    getLocalTodayYmd,\n    mergeSimilarRecentTimelineEvent,',
        );
        changed = true;
    }
    if (changed) fs.writeFileSync(IMPORTED_HELPERS_PATH, src);
}

const overlayUsed = collectOverlayPropUsage();
const { content: shellContent, keys: shellKeys } = readShellKeys();
const mergedKeys = writeShellKeys(shellContent, [...shellKeys, ...overlayUsed]);
const addedRegistry = mergedKeys.length - shellKeys.length;

let core = fs.readFileSync(CORE_PATH, 'utf8');
const scopeStart = core.indexOf('getScopeSources: () => buildExecutionDashboardChunkScopeSources({');
const scopeEnd = core.indexOf('\n        }),', scopeStart);
const preScope = core.slice(0, scopeStart);
const scopeBlock = core.slice(scopeStart, scopeEnd);
const bound = collectBoundIdentifiers(preScope);

const scopeKeys = new Set([...scopeBlock.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]));

const toAddScope = [...overlayUsed]
    .filter((k) => !IMPORTED_OVERLAY_PROPS.has(k))
    .filter((k) => bound.has(k) && !scopeKeys.has(k))
    .sort();

if (toAddScope.length) {
    const additions = toAddScope.map((k) => `            ${k},`).join('\n') + '\n';
    const marker = '...executionModalSetters,';
    const insertPos = core.indexOf(marker);
    const lineEnd = core.indexOf('\n', insertPos) + 1;
    core = core.slice(0, lineEnd) + additions + core.slice(lineEnd);
    fs.writeFileSync(CORE_PATH, core);
}

ensureImportedHelpers(overlayUsed);

console.log(`overlay s.* props: ${overlayUsed.size}`);
console.log(`registry keys: ${shellKeys.length} → ${mergedKeys.length} (+${addedRegistry})`);
console.log(`scope keys added: ${toAddScope.length}`);
if (toAddScope.length) console.log(toAddScope.join(', '));
