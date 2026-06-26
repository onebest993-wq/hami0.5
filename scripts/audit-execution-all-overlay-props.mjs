/**
 * Phase A — فحص شامل لكل shell overlay chunks:
 * - s.* في ملفات overlays
 * - props مطلوبة من export interface/type
 * - SEIZED_PROPERTY_PORTAL_PROP_KEYS مقابل scope
 */
import fs from 'node:fs';

const ROOT = 'src/app/components/lawyer/ExecutionDashboard';
const SHELL_KEYS_PATH = `${ROOT}/hooks/executionShellOverlayPropKeys.ts`;
const CORE_PATH = `${ROOT}/hooks/useExecutionDashboardCore.ts`;
const PORTAL_KEYS_PATH = `${ROOT}/hooks/pickSeizedPropertyPortalProps.ts`;

const OVERLAY_S_FILES = [
    `${ROOT}/components/ExecutionDashboardHeavyModals.tsx`,
    `${ROOT}/components/ExecutionDashboardEditOverlays.tsx`,
    `${ROOT}/components/ExecutionDashboardExecutorWorkflowOverlays.tsx`,
    `${ROOT}/components/ExecutionDashboardSolidaryEvictionOverlays.tsx`,
];

const TYPED_OVERLAY_SOURCES = [
    {
        label: 'notes-appointment-modals',
        file: `${ROOT}/components/ExecutionNotesAndAppointmentModals.tsx`,
        typeName: 'ExecutionNotesAndAppointmentModalsProps',
    },
    {
        label: 'edit-overlays',
        file: `${ROOT}/components/ExecutionDashboardEditOverlays.tsx`,
        typeName: 'ExecutionDashboardEditOverlaysProps',
    },
];

function extractConstKeys(content, constName) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) throw new Error(`missing ${constName}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function extractRequiredTypeProps(src, typeName) {
    const iface = src.match(new RegExp(`export interface ${typeName} \\{([\\s\\S]*?)\\n\\}`));
    const typeAlias = src.match(new RegExp(`export type ${typeName} = \\{([\\s\\S]*?)\\n\\};`));
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

function resolveScopeKeys(core) {
    const start = core.indexOf('getScopeSources: () => buildExecutionDashboardChunkScopeSources({');
    const end = core.indexOf('\n        }),', start);
    const block = core.slice(start, end);
    const keys = new Set();
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) keys.add(m[1]);
    for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):/gm)) keys.add(m[1]);
    for (const spread of block.matchAll(/\.\.\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
        const name = spread[1];
        if (name === 'executionModalFlags' || name === 'executionModalSetters') {
            const objStart = core.indexOf(`const ${name} = {`);
            const objEnd = core.indexOf('\n    };', objStart);
            for (const k of core.slice(objStart, objEnd).matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*),/gm)) {
                keys.add(k[1]);
            }
        }
        if (name === 'pickExecutionFollowupScopeSlice') {
            const bagStart = core.indexOf('const followupScopeBag = {');
            const bagEnd = core.indexOf('\n    };', bagStart);
            const bagBlock = core.slice(bagStart, bagEnd);
            for (const k of bagBlock.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*)(?::|,)/gm)) keys.add(k[1]);
        }
    }
    for (const file of [
        `${ROOT}/executionDashboardStaticChunkScope.ts`,
        `${ROOT}/executionDashboardRuntimeChunkScope.ts`,
        `${ROOT}/executionDashboardUiChunkScope.ts`,
        `${ROOT}/executionDashboardImportedHelpersChunkScope.ts`,
        `${ROOT}/executionDashboardPhoneBodyComponentsChunkScope.ts`,
        `${ROOT}/hooks/executionDashboardLazyChunkScope.ts`,
    ]) {
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const k of [...src.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*)(?::|,)/gm)].map((m) => m[1])) keys.add(k);
    }
    return keys;
}

function collectSProps(files) {
    const used = new Set();
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/\bs\.([a-zA-Z_][a-zA-Z0-9_]*)/g)) used.add(m[1]);
    }
    return used;
}

const shellKeys = new Set(
    extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8'), 'EXECUTION_SHELL_OVERLAY_PROP_KEYS'),
);
const portalKeys = extractConstKeys(
    fs.readFileSync(PORTAL_KEYS_PATH, 'utf8'),
    'SEIZED_PROPERTY_PORTAL_PROP_KEYS',
);
const core = fs.readFileSync(CORE_PATH, 'utf8');
const scopeKeys = resolveScopeKeys(core);

let failed = false;

const sUsed = collectSProps(OVERLAY_S_FILES);
const sMissingRegistry = [...sUsed].filter((k) => !shellKeys.has(k)).sort();
const sMissingScope = sMissingRegistry.filter((k) => !scopeKeys.has(k));
console.log(`[overlay-s-props] ${sUsed.size} s.* usages across ${OVERLAY_S_FILES.length} files`);
if (sMissingRegistry.length) {
    failed = true;
    console.log('  MISSING registry:', sMissingRegistry.join(', '));
}
if (sMissingScope.length) {
    failed = true;
    console.log('  MISSING scope:', sMissingScope.join(', '));
}
if (!sMissingRegistry.length && !sMissingScope.length) console.log('  OK');

for (const source of TYPED_OVERLAY_SOURCES) {
    const src = fs.readFileSync(source.file, 'utf8');
    const required = extractRequiredTypeProps(src, source.typeName);
    const missingRegistry = required.filter((k) => !shellKeys.has(k));
    const missingScope = required.filter((k) => !scopeKeys.has(k));
    console.log(`[${source.label}] ${required.length} required typed props`);
    if (missingRegistry.length) {
        failed = true;
        console.log('  MISSING registry:', missingRegistry.join(', '));
    }
    if (missingScope.length) {
        failed = true;
        console.log('  MISSING scope:', missingScope.join(', '));
    }
    if (!missingRegistry.length && !missingScope.length) console.log('  OK');
}

const portalMissingScope = portalKeys.filter((k) => !scopeKeys.has(k));
console.log(`[seized-property-portals] ${portalKeys.length} portal keys`);
if (portalMissingScope.length) {
    failed = true;
    console.log('  MISSING scope:', portalMissingScope.join(', '));
} else {
    console.log('  OK');
}

if (failed) process.exit(1);
console.log('OK — all execution shell overlay chunks audited');
