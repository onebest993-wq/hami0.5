/**
 * يتحقق أن props المطلوبة في مكونات shell overlays مسجّلة في EXECUTION_SHELL_OVERLAY_PROP_KEYS
 * ومربوطة في getScopeSources (عبر audit-execution-chunk-scope resolver).
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const SHELL_KEYS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const CORE_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';

const OVERLAY_PROP_SOURCES = [
    {
        label: 'notes-appointment-modals',
        file: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesAndAppointmentModals.tsx',
        interfaceName: 'ExecutionNotesAndAppointmentModalsProps',
    },
    {
        label: 'edit-overlays',
        file: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardEditOverlays.tsx',
        interfaceName: 'ExecutionDashboardEditOverlaysProps',
    },
];

function extractConstKeys(content, constName) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) throw new Error(`missing ${constName}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function extractRequiredInterfaceProps(src, interfaceName) {
    const iface = src.match(new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`));
    const typeAlias = src.match(new RegExp(`export type ${interfaceName} = \\{([\\s\\S]*?)\\n\\};`));
    const body = iface?.[1] ?? typeAlias?.[1];
    if (!body) return [];
    const required = [];
    for (const line of body.split('\n')) {
        const hit = line.match(/^    ([a-zA-Z_][a-zA-Z0-9_]*)(\?)?:/);
        if (!hit || hit[2] === '?') continue;
        required.push(hit[1]);
    }
    return required;
}

function resolveScopeKeysFromAudit() {
    const out = execSync('node scripts/audit-execution-chunk-scope.mjs', { encoding: 'utf8' });
    if (!/resolved scope keys:/.test(out)) {
        throw new Error('chunk scope audit failed');
    }
    const core = fs.readFileSync(CORE_PATH, 'utf8');
    const blockStart = core.indexOf('getScopeSources: () => buildExecutionDashboardChunkScopeSources({');
    const blockEnd = core.indexOf('\n        }),', blockStart);
    const block = core.slice(blockStart, blockEnd);

    const keys = new Set();
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(m[1]);
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    for (const spread of block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
        const name = spread[1];
        if (name === 'executionModalFlags' || name === 'executionModalSetters') {
            const objStart = core.indexOf(`const ${name} = {`);
            const objEnd = core.indexOf('\n    };', objStart);
            const objBlock = core.slice(objStart, objEnd);
            for (const k of objBlock.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(k[1]);
        }
        if (name === 'pickExecutionFollowupScopeSlice') {
            const bagStart = core.indexOf('const followupScopeBag = {');
            const bagEnd = core.indexOf('\n    };', bagStart);
            const bagBlock = core.slice(bagStart, bagEnd);
            for (const k of bagBlock.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(k[1]);
            for (const k of bagBlock.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(k[1]);
        }
    }
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
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)].map((x) => x[1])) keys.add(k);
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)].map((x) => x[1])) keys.add(k);
    }
    return keys;
}

const shellKeys = new Set(
    extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8'), 'EXECUTION_SHELL_OVERLAY_PROP_KEYS'),
);
const scopeKeys = resolveScopeKeysFromAudit();

let failed = false;
for (const source of OVERLAY_PROP_SOURCES) {
    const src = fs.readFileSync(source.file, 'utf8');
    const required = extractRequiredInterfaceProps(src, source.interfaceName);
    const missingRegistry = required.filter((k) => !shellKeys.has(k));
    const missingScope = required.filter((k) => !scopeKeys.has(k));
    console.log(`[${source.label}] ${required.length} required props`);
    if (missingRegistry.length) {
        failed = true;
        console.log('  MISSING registry:', missingRegistry.join(', '));
    }
    if (missingScope.length) {
        failed = true;
        console.log('  MISSING scope:', missingScope.join(', '));
    }
    if (!missingRegistry.length && !missingScope.length) {
        console.log('  OK');
    }
}

if (failed) process.exit(1);
console.log('OK — overlay component props wired');
