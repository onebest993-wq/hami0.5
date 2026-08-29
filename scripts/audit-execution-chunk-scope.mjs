/**
 * يتحقق أن كل مفاتيح phone body / shell overlays / followup snapshot
 * موجودة في chunk scope (core + ملفات scope المستخرجة).
 */
import { resolveExecutionChunkScopeKeys } from './lib/resolveExecutionChunkScopeKeys.mjs';
import { extractConstArrayKeysFromFile } from './lib/extractConstArrayKeys.mjs';

const SHELL_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const PHONE_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts';
const FOLLOW_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';

function auditRegistry(label, registry, scopeKeys) {
    const missing = registry.filter((k) => !scopeKeys.has(k));
    return { label, missing, total: registry.length };
}

const scopeKeys = resolveExecutionChunkScopeKeys();

const shell = extractConstArrayKeysFromFile(SHELL_KEYS_PATH, 'EXECUTION_SHELL_OVERLAY_PROP_KEYS');
const phone = extractConstArrayKeysFromFile(PHONE_KEYS_PATH, 'EXECUTION_PHONE_BODY_PROP_KEYS');
const follow = extractConstArrayKeysFromFile(FOLLOW_KEYS_PATH, 'EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS');

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
