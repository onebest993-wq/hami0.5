/**
 * يُزامِن getScopeSources مع مفاتيح shell overlay المربوطة في core.
 * الاستخدام: node scripts/sync-execution-chunk-scope.mjs
 */
import fs from 'node:fs';

const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const SHELL_KEYS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';

function extractConstKeys(content, constName) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) throw new Error(`missing ${constName}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function extractScopeKeys(block) {
    return new Set([...block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]));
}

function extractSpreads(block) {
    return [...block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]);
}

function extractObjectKeys(block) {
    return new Set([...block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1]));
}

function collectBoundIdentifiers(text) {
    const bound = new Set(['queueMicrotask']);

    for (const m of text.matchAll(/\b(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g)) {
        bound.add(m[1]);
    }
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
    for (const m of text.matchAll(/\b(?:const|let|var)\s+\[([^\]]+)\]/g)) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split('=')[0].trim();
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) bound.add(name);
        }
    }
    for (const m of text.matchAll(/\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) {
        bound.add(m[1]);
    }

    return bound;
}

function resolveScopeKeys(core, block) {
    const resolved = extractScopeKeys(block);
    for (const spread of extractSpreads(block)) {
        if (spread === 'pickExecutionFollowupScopeSlice') {
            const bagStart = core.indexOf('const followupScopeBag = {');
            const bagEnd = core.indexOf('\n    };', bagStart);
            for (const k of extractObjectKeys(core.slice(bagStart, bagEnd))) resolved.add(k);
            continue;
        }
        const objStart = core.indexOf(`const ${spread} = {`);
        if (objStart >= 0) {
            const objEnd = core.indexOf('\n    };', objStart);
            for (const k of extractObjectKeys(core.slice(objStart, objEnd))) resolved.add(k);
        }
    }
    return resolved;
}

const core = fs.readFileSync(CORE_PATH, 'utf8');
const shellKeys = extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8'), 'EXECUTION_SHELL_OVERLAY_PROP_KEYS');

const scopeStart = core.indexOf('getScopeSources: () => buildExecutionDashboardChunkScopeSources({');
const scopeEnd = core.indexOf('\n        }),', scopeStart);
const scopeBlock = core.slice(scopeStart, scopeEnd);
const preScope = core.slice(0, scopeStart);

const bound = collectBoundIdentifiers(preScope);
const scopeKeys = resolveScopeKeys(core, scopeBlock);

const toAdd = shellKeys.filter((k) => bound.has(k) && !scopeKeys.has(k)).sort();

if (!toAdd.length) {
    console.log('OK — no shell keys to sync');
    process.exit(0);
}

const additions = toAdd.map((k) => `            ${k},`).join('\n') + '\n';
const marker = '...executionModalSetters,';
const insertPos = core.indexOf(marker);
if (insertPos < 0) {
    console.error('insert marker not found');
    process.exit(1);
}
const lineEnd = core.indexOf('\n', insertPos);
if (lineEnd < 0) {
    console.error('line end not found');
    process.exit(1);
}
const afterSetters = lineEnd + 1;
const newCore = core.slice(0, afterSetters) + additions + core.slice(afterSetters);

fs.writeFileSync(CORE_PATH, newCore);
console.log(`Added ${toAdd.length} shell scope keys:`);
console.log(toAdd.join(', '));
