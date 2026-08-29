/**
 * يتحقق أن props المطلوبة في مكونات shell overlays مسجّلة ومربوطة في chunk scope.
 */
import fs from 'node:fs';
import { resolveExecutionChunkScopeKeys } from './lib/resolveExecutionChunkScopeKeys.mjs';
import { isExecutionShellExplicitCloseProp } from './lib/executionShellExplicitCloseProps.mjs';
import { extractConstArrayKeysFromFile } from './lib/extractConstArrayKeys.mjs';

const SHELL_KEYS_PATH =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';

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
    extractConstArrayKeysFromFile(SHELL_KEYS_PATH, 'EXECUTION_SHELL_OVERLAY_PROP_KEYS'),
);
const scopeKeys = resolveExecutionChunkScopeKeys();

let failed = false;
for (const source of OVERLAY_PROP_SOURCES) {
    const src = fs.readFileSync(source.file, 'utf8');
    const required = extractRequiredInterfaceProps(src, source.interfaceName);
    const missingRegistry = required.filter(
        (k) => !shellKeys.has(k) && !isExecutionShellExplicitCloseProp(k),
    );
    const missingScope = required.filter(
        (k) => !scopeKeys.has(k) && !isExecutionShellExplicitCloseProp(k),
    );
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
