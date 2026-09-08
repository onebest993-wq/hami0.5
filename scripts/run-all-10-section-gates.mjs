#!/usr/bin/env node
/**
 * ROYAL TIER-1 OFFICIAL ORCHESTRATOR — 10 Section Production Gates
 * Runs all 10 gates SEQUENTIALLY in exact dependency order.
 * Prints per-gate summary + cumulative aggregate table.
 * Exit(0) ONLY if ALL 10 gates exit=0 AND every last-stdout-line === "=== Gate result === PASSED".
 *
 * Usage:
 *   node scripts/run-all-10-section-gates.mjs
 *
 * Execution Order (exact, never reorder):
 *   1. settings
 *   2. global-search
 *   3. notifications
 *   4. profile
 *   5. tasks
 *   6. forum
 *   7. calendar
 *   8. litigation
 *   9. repository
 *   10. execution
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const SCRIPTS_DIR = __dirname;

const REQUIRED_LAST_STDOUT = '=== Gate result === PASSED';

const GATES = [
    { name: 'SETTINGS',        script: 'settings-production-gate.mjs' },
    { name: 'GLOBAL-SEARCH',   script: 'global-search-production-gate.mjs' },
    { name: 'NOTIFICATIONS',   script: 'notifications-production-gate.mjs' },
    { name: 'PROFILE',         script: 'profile-production-gate.mjs' },
    { name: 'TASKS',           script: 'tasks-production-gate.mjs' },
    { name: 'FORUM',           script: 'forum-production-gate.mjs' },
    { name: 'CALENDAR',        script: 'calendar-production-gate.mjs' },
    { name: 'LITIGATION',      script: 'litigation-production-gate.mjs' },
    { name: 'REPOSITORY',      script: 'repository-production-gate.mjs' },
    { name: 'EXECUTION',       script: 'execution-production-gate.mjs' },
];

const SPAWN_OPTS = {
    shell: true,
    maxBuffer: 500 * 1024 * 1024,
    timeout: 600_000,
    windowsHide: true,
    cwd: PROJECT_ROOT,
};

const results = [];
let totalFailures = 0;
let startTs = Date.now();

function padR(s, len) {
    s = String(s);
    while (s.length < len) s = s + ' ';
    return s;
}
function padL(s, len) {
    s = String(s);
    while (s.length < len) s = ' ' + s;
    return s;
}
function lastNonEmptyLine(text) {
    const lines = (text || '').split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.length > 0 ? lines[lines.length - 1] : '';
}
function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}m${ss.toString().padStart(2, '0')}s`;
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║     ROYAL 10-SECTION TIER-1 PRODUCTION GATES ORCHESTRATOR START     ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`Project Root : ${PROJECT_ROOT}`);
console.log(`Order        : ${GATES.map(g => g.name).join(' → ')}`);
console.log(`Total gates  : ${GATES.length}`);
console.log(`Requirement  : ALL ${GATES.length} must exit=0 + last stdout="${REQUIRED_LAST_STDOUT}"`);
console.log('');

function parseSubsetSpec(spec) {
    const indices = new Set();
    if (!spec) return indices;
    for (const part of spec.split(',')) {
        const p = part.trim();
        if (/^\d+$/.test(p)) {
            const n = parseInt(p, 10);
            if (n >= 1 && n <= GATES.length) indices.add(n);
        } else if (p) {
            const low = p.toLowerCase();
            const i = GATES.findIndex(g => g.name.toLowerCase() === low);
            if (i >= 0) indices.add(i + 1);
        }
    }
    return indices;
}

const SUBSET_ENV = process.env.RUN_ONLY_SUBSET || '';
const SUBSET_ARG = process.argv.slice(2).find(a => a.startsWith('--subset=')) || '';
const SUBSET_ARG_VALUE = SUBSET_ARG ? SUBSET_ARG.slice('--subset='.length) : '';
const EXPLICIT_FULL_ARG = process.argv.includes('--full') || process.argv.includes('--all');

let subsetIndices = new Set();
if (EXPLICIT_FULL_ARG) {
    subsetIndices = new Set();
    console.log('ℹ EXPLICIT FULL MODE (--full): running ALL 10 gates regardless of RUN_ONLY_SUBSET env');
    console.log('');
} else if (SUBSET_ARG_VALUE) {
    subsetIndices = parseSubsetSpec(SUBSET_ARG_VALUE);
    console.log(`ℹ CLI SUBSET MODE (--subset=${SUBSET_ARG_VALUE}): overriding any env RUN_ONLY_SUBSET`);
    console.log('');
} else if (SUBSET_ENV) {
    subsetIndices = parseSubsetSpec(SUBSET_ENV);
}
const effectiveGates = subsetIndices.size > 0
    ? GATES.filter((_, i) => subsetIndices.has(i + 1))
    : GATES;
if (subsetIndices.size > 0) {
    console.log(`ℹ SUBSET MODE (RUN_ONLY_SUBSET=${SUBSET_ENV}): only running ${effectiveGates.map(g => g.name).join(' + ')}`);
    console.log('');
}

let idx = 0;
for (const gate of effectiveGates) {
    idx++;
    const gateStart = Date.now();
    const scriptPath = resolve(SCRIPTS_DIR, gate.script);
    const total = subsetIndices.size > 0 ? effectiveGates.length : GATES.length;
    const tag = `[${idx}/${total}] ${gate.name}`;

    console.log(`┌──────────────────────────────────────────────────────────────────────┐`);
    console.log(`│ ${padR(tag, 68)} │`);
    console.log(`│ Script: ${padR(gate.script, 60)} │`);
    console.log(`└──────────────────────────────────────────────────────────────────────┘`);

    const safeScriptPath = `"${scriptPath.replace(/"/g, '\\"')}"`;
    const res = spawnSync(`node ${safeScriptPath}`, [], SPAWN_OPTS);
    const exitCode = res.status ?? (res.error ? 127 : -1);
    const stdout = res.stdout?.toString() ?? '';
    const stderr = res.stderr?.toString() ?? '';
    const lastStdout = lastNonEmptyLine(stdout);
    const lastStderr = lastNonEmptyLine(stderr);
    const stdoutMatches = lastStdout.trim() === REQUIRED_LAST_STDOUT.trim();
    const dur = Date.now() - gateStart;

    const gateFailed = exitCode !== 0 || !stdoutMatches;
    if (gateFailed) totalFailures++;

    const status = gateFailed ? '✗ FAIL' : '✓ PASS';
    console.log(`  Result         : ${status}`);
    console.log(`  Exit code      : ${exitCode}`);
    if (res.error) console.log(`  Spawn error    : ${res.error.message}`);
    console.log(`  Last stdout    : ${lastStdout || '(empty)'}`);
    console.log(`  Stdout matches : ${stdoutMatches ? 'YES' : `NO (expected: "${REQUIRED_LAST_STDOUT}")`}`);
    if (lastStderr) console.log(`  Last stderr    : ${lastStderr}`);
    if (gateFailed && !lastStderr && stderr) {
        const fullStderr = stderr.split(/\r?\n/).filter(l => l.trim()).slice(-5);
        if (fullStderr.length) console.log(`  Tail stderr (${fullStderr.length}):\n    ${fullStderr.join('\n    ')}`);
    }
    console.log(`  Duration       : ${formatDuration(dur)}`);
    console.log('');

    results.push({
        idx,
        name: gate.name,
        script: gate.script,
        exitCode,
        lastStdout,
        lastStderr,
        stdoutMatches,
        durationMs: dur,
        passed: !gateFailed,
        reason: exitCode !== 0 ? `exit=${exitCode}` : (!stdoutMatches ? `stdout mismatch` : ''),
    });

    if (gateFailed) {
        console.error(`  ⚠ GATE FAILURE DETECTED. Continuing remaining gates for full report...`);
        console.log('');
    }
}

const totalDur = Date.now() - startTs;
const passCount = results.filter(r => r.passed).length;
const failCount = results.length - passCount;

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║                    ROYAL 10-SECTION TIER-1 PRODUCTION GATES — CUMULATIVE SUMMARY                   ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`  #  ${padR('SECTION', 16)}  EXIT  STDOUT-MATCH  STATUS  DURATION  NOTE`);
console.log(`  ${'─'.repeat(3)}  ${'─'.repeat(16)}  ${'─'.repeat(4)}  ${'─'.repeat(12)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(30)}`);
for (const r of results) {
    const statusCol = r.passed ? 'PASS  ' : 'FAIL  ';
    const exitCol = padL(r.exitCode, 4);
    const matchCol = r.stdoutMatches ? padR('YES', 12) : padR('NO', 12);
    const durCol = padR(formatDuration(r.durationMs), 8);
    const noteCol = r.reason || '-';
    const idxCol = padL(r.idx, 2);
    console.log(`  ${idxCol}  ${padR(r.name, 16)}  ${exitCol}  ${matchCol}  ${statusCol}  ${durCol}  ${noteCol}`);
}
console.log('');
const totalGates = effectiveGates.length;
console.log(`  TOTAL : ${totalGates} gates  |  PASS: ${passCount}  |  FAIL: ${failCount}  |  TOTAL DURATION: ${formatDuration(totalDur)}`);
console.log('');

const allPass = passCount === totalGates;
const failedList = results.filter(r => !r.passed);

if (allPass) {
    const banner = totalGates === GATES.length
        ? '     ★★★  ALL 10 ROYAL TIER-1 PRODUCTION GATES PASSED — ZERO FAILURES — FULL DEPLOYMENT READY  ★★★   '
        : `     ★★★  ALL ${totalGates}/${GATES.length} SUBSET GATES PASSED — ZERO FAILURES — CONTINUE TO FULL RUN  ★★★    `;
    console.log('╔════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║${banner}║`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log(`=== Orchestrator result === ALL ${totalGates} PASSED`);
    process.exit(0);
} else {
    const failedNames = failedList.map(r => `${r.name}(${r.reason})`).join(', ');
    console.error('╔════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.error('║     ✗✗✗  SOME ROYAL TIER-1 PRODUCTION GATES FAILED — DEPLOYMENT BLOCKED — SEE DETAILS ABOVE  ✗✗✗    ║');
    console.error('╚════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.error(`Failed gates (${failCount}/${totalGates}): ${failedNames}`);
    console.error(`=== Orchestrator result === ${failCount} FAILED (${failedNames})`);
    process.exit(1);
}
