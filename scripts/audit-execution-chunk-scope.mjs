/**
 * يتحقق أن كل مفاتيح phone body / shell overlays / followup snapshot
 * موجودة في chunk scope (core + ملفات scope المستخرجة).
 */
import fs from 'node:fs';
import { resolveExecutionChunkScopeKeys } from './lib/resolveExecutionChunkScopeKeys.mjs';

const SHELL_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionShellOverlayPropKeys.ts';
const PHONE_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionPhoneBodyPropKeys.ts';
const FOLLOW_KEYS_PATH = 'src/app/components/lawyer/ExecutionDashboard/followupSnapshotFieldKeys.ts';

function extractConstKeys(content, constName) {
    const m = content.match(new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`));
    if (!m) throw new Error(`missing ${constName}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function auditRegistry(label, registry, scopeKeys) {
    const missing = registry.filter((k) => !scopeKeys.has(k));
    return { label, missing, total: registry.length };
}

const scopeKeys = resolveExecutionChunkScopeKeys();

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
