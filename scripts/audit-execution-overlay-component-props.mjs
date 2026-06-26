/**
 * يتحقق أن props المطلوبة في مكونات shell overlays مسجّلة ومربوطة في chunk scope.
 */
import fs from 'node:fs';
import { resolveExecutionChunkScopeKeys } from './lib/resolveExecutionChunkScopeKeys.mjs';

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

const shellKeys = new Set(
    extractConstKeys(fs.readFileSync(SHELL_KEYS_PATH, 'utf8'), 'EXECUTION_SHELL_OVERLAY_PROP_KEYS'),
);
const scopeKeys = resolveExecutionChunkScopeKeys(fs.readFileSync(CORE_PATH, 'utf8'));

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
