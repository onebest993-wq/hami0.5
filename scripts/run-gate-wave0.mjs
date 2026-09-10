#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const LOG_DIR = join(ROOT, '.audit');
const LOG = join(LOG_DIR, 'gate-wave0-run.log');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
writeFileSync(LOG, '', 'utf8');

function now() { return new Date().toISOString(); }
function log(msg) {
    process.stdout.write(msg + '\n');
    appendFileSync(LOG, msg + '\n', 'utf8');
}

/**
 * مصدر الحقيقة واحد: `scripts["gate:wave0"]` في package.json.
 *
 * كانت القائمة مكرّرة هنا يدوياً فتباعدت: نصّ package.json يحوي ٢٨ حارساً منها
 * `guard:architecture-boundaries`، وهذه القائمة تحوي ٢٧ بلا ذاك — والميثاق §٣
 * يجعل هذا الملفّ هو الـrunner الرسمي («لا `npm run gate:wave0` مباشر»).
 * و`guard-ci-covers-guards` يفحص نصّ package.json، أي أنّه يشهد للقائمة التي
 * **لا تُشغَّل**، بينما التي تُشغَّل لا تُفحَص. فبقي حارس الطبقات بلا تشغيلٍ في
 * أيّ مكان، وانحرف ٢٤٤ → ٢٤٨ بلا إنذار.
 *
 * والاشتقاق يجعل هذا التباعد مستحيلاً بالبناء لا بالانضباط.
 */
function readGuardsFromPackageJson() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const script = String(pkg.scripts?.['gate:wave0'] ?? '');
    const guards = [...script.matchAll(/npm run (guard:[a-z0-9:-]+)/g)].map((m) => m[1]);
    /* حاجزٌ ضدّ بوّابةٍ تنكمش صامتةً لو تغيّرت صيغة النصّ */
    if (guards.length < 20) {
        throw new Error(
            `[gate-wave0] القائمة المشتقّة قصيرة (${guards.length}) — تحقّق من scripts["gate:wave0"] في package.json`,
        );
    }
    return guards;
}

const GUARDS = readGuardsFromPackageJson();

let firstFailedIdx = -1;
let firstFailedExit = 0;

for (let i = 0; i < GUARDS.length; i++) {
    const guard = GUARDS[i];
    const idx = i + 1;
    log(`\n=== GATE[${idx}/${GUARDS.length}]: ${guard} START: ${now()} ===`);

    let exitCode = -1;
    let out = '';
    let err = '';
    try {
        const isWin = process.platform === 'win32';
        const runner = isWin ? 'npm.cmd' : 'npm';
        out = execFileSync(runner, ['run', guard], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 512 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: isWin,
        });
        exitCode = 0;
    } catch (e) {
        exitCode = e.status ?? 999;
        out = e.stdout ?? '';
        err = e.stderr ?? '';
    }
    if (out && out.trim().length > 0) log(out);
    if (err && err.trim().length > 0) log(`[STDERR]\n${err}`);
    log(`=== GATE[${idx}/${GUARDS.length}]: ${guard} END exit=${exitCode} at ${now()} ===`);

    if (exitCode !== 0) {
        firstFailedIdx = idx;
        firstFailedExit = exitCode;
        log(`\n!!! GATE-W0 FAILED at guard[${firstFailedIdx}/${GUARDS.length}]: ${guard} exit=${firstFailedExit} !!!\n`);
        process.exit(exitCode || 1);
    }
}

log(`\n===== GATE-W0 ALL ${GUARDS.length} GUARDS PASSED exit=0 T2v-5 OFFICIALLY CLOSED: ${now()} =====\n`);
process.exit(0);
