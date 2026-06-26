/**
 * يتحقق أن كل مفاتيح phone body / shell overlays / followup snapshot
 * موجودة في getScopeSources (أو عبر spread معروف).
 */
import fs from 'node:fs';

const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const SHELL_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const PHONE_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts';
const FOLLOW_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';

function extractConstKeys(content, constName) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) throw new Error(`missing ${constName}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function extractScopeBlock(core) {
    const start = core.indexOf('getScopeSources: () => buildExecutionDashboardChunkScopeSources({');
    if (start < 0) throw new Error('getScopeSources block not found');
    const end = core.indexOf('\n        }),', start);
    return core.slice(start, end);
}

function extractExplicitScopeKeys(block) {
    const keys = new Set();
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) {
        keys.add(m[1]);
    }
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) {
        keys.add(m[1]);
    }
    return keys;
}

function extractSpreads(block) {
    return [...block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]);
}

function extractObjectKeys(core, varName) {
    const re = new RegExp(`const ${varName} = \\{([\\s\\S]*?)\\n    \\};`, 'm');
    const m = core.match(re);
    if (!m) return new Set();
    return new Set([...m[1].matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((x) => x[1]));
}

function resolveScopeKeys(core, block) {
    const explicit = extractExplicitScopeKeys(block);
    const spreads = extractSpreads(block);
    const resolved = new Set(explicit);

    if (spreads.includes('executionModalFlags')) {
        for (const k of extractObjectKeys(core, 'executionModalFlags')) resolved.add(k);
    }
    if (spreads.includes('executionModalSetters')) {
        for (const k of extractObjectKeys(core, 'executionModalSetters')) resolved.add(k);
    }
    if (spreads.includes('pickExecutionFollowupScopeSlice')) {
        const bagStart = core.indexOf('const followupScopeBag = {');
        const bagEnd = core.indexOf('\n    };', bagStart);
        const bagBlock = core.slice(bagStart, bagEnd);
        for (const k of extractExplicitScopeKeys(bagBlock)) resolved.add(k);
    }

    // static/runtime/ui/lazy chunk scopes merged in buildExecutionDashboardChunkScopeSources
    for (const file of [
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardStaticChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardRuntimeChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardUiChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardImportedHelpersChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/executionDashboardPhoneBodyComponentsChunkScope.ts',
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardLazyChunkScope.ts',
    ]) {
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((m) => m[1])) {
            resolved.add(k);
        }
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((m) => m[1])) {
            resolved.add(k);
        }
    }

    return resolved;
}

function auditRegistry(label, registry, scopeKeys) {
    const missing = registry.filter((k) => !scopeKeys.has(k));
    return { label, missing, total: registry.length };
}

const core = fs.readFileSync(CORE_PATH, 'utf8');
const block = extractScopeBlock(core);
const scopeKeys = resolveScopeKeys(core, block);

const shell = extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8'), 'EXECUTION_SHELL_OVERLAY_PROP_KEYS');
const phone = extractConstKeys(fs.readFileSync(PHONE_KEYS_PATH, 'utf8'), 'EXECUTION_PHONE_BODY_PROP_KEYS');
const follow = extractConstKeys(fs.readFileSync(FOLLOW_KEYS_PATH, 'utf8'), 'EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS');

const reports = [
    auditRegistry('shell-overlay', shell, scopeKeys),
    auditRegistry('phone-body', phone, scopeKeys),
    auditRegistry('followup-snapshot', follow, scopeKeys),
];

let failed = false;
for (const r of reports) {
    console.log(`[${r.label}] ${r.total - r.missing.length}/${r.total} wired`);
    if (r.missing.length) {
        failed = true;
        console.log('  MISSING:', r.missing.join(', '));
    }
}

console.log('resolved scope keys:', scopeKeys.size);
if (failed) process.exit(1);
console.log('OK — execution chunk scope fully wired');
