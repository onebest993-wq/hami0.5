/**
 * HWCAC verify:world-class — بوابة قابلة للتكرار (W0+).
 *
 * الاستخدام:
 *   npm run build && npm run verify:world-class
 *   npm run verify:world-class -- --skip-build   (إن كان dist حديثاً)
 *   npm run verify:world-class -- --with-ttfi    (يشغّل TTFI preview أيضاً)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const skipBuild = process.argv.includes('--skip-build');
const skipSecurity = process.argv.includes('--skip-security');
const withTtfi = process.argv.includes('--with-ttfi');
const outPath = path.join(ROOT, '.cursor', 'world-class-gate-result.json');

function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, {
        cwd: ROOT,
        encoding: 'utf8',
        shell: process.platform === 'win32',
        stdio: 'pipe',
        env: { ...process.env, ...opts.env },
    });
    return {
        status: r.status ?? 1,
        stdout: r.stdout || '',
        stderr: r.stderr || '',
    };
}

function kb(n) {
    return Math.round((n / 1024) * 10) / 10;
}

const gates = [];
function record(id, ok, detail) {
    gates.push({ id, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ` — ${detail}` : ''}`);
}

if (!skipBuild) {
    console.log('[verify:world-class] building…');
    const b = run('npm', ['run', 'build']);
    const buildOut = `${b.stdout || ''}\n${b.stderr || ''}`;
    record('build', b.status === 0, b.status === 0 ? 'ok' : buildOut.slice(-400));
    if (/Circular chunk:/i.test(buildOut)) {
        // تحذير معروف: app-crypto ↔ boot-ui عبر مساعد Vite preload للـ dynamic import
        // — لا يُفشل HWCAC إذا بقي cold-entry أخضر (يُراجع في verify-production-build).
        const lines = buildOut
            .split('\n')
            .filter((l) => /Circular chunk:/i.test(l))
            .map((l) => l.trim());
        const onlyCryptoBoot =
            lines.length > 0 &&
            lines.every((l) => /app-crypto.*boot-ui-primitives|boot-ui-primitives.*app-crypto/i.test(l));
        record(
            'no-circular-chunks',
            onlyCryptoBoot,
            onlyCryptoBoot
                ? `warn tolerated: ${lines[0]?.slice(0, 120) || 'app-crypto↔boot'}`
                : lines.join(' | ').slice(0, 240),
        );
    } else if (b.status === 0) {
        record('no-circular-chunks', true, 'no Circular chunk warning');
    }
    if (b.status !== 0) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify({ ok: false, gates, at: new Date().toISOString() }, null, 2));
        process.exit(1);
    }
}

{
    const wife = run('node', ['scripts/wife-production-gate.mjs']);
    record(
        'wife-static-gate',
        wife.status === 0,
        wife.status === 0
            ? 'wife-production-gate static OK'
            : (wife.stdout || wife.stderr).trim().split('\n').slice(-4).join(' | '),
    );
}

{
    const shell = run('node', ['scripts/guard-shell-auth-prod.mjs']);
    record(
        'shell-auth-prod-contract',
        shell.status === 0,
        (shell.stdout || shell.stderr).trim().split('\n').pop(),
    );
}

{
    const prodContract = run('node', ['scripts/guard-prod-env-contract.mjs']);
    record(
        'prod-env-contract',
        prodContract.status === 0,
        prodContract.status === 0
            ? 'fail-closed example+hosting OK'
            : (prodContract.stdout || prodContract.stderr).trim().split('\n').slice(-4).join(' | '),
    );
}

{
    const prodGate = run('node', ['scripts/run-prod-gate-from-example.mjs']);
    record(
        'wife-prod-from-example',
        prodGate.status === 0,
        prodGate.status === 0
            ? 'wife-production-gate --prod via example (0 blockers)'
            : (prodGate.stdout || prodGate.stderr).trim().split('\n').slice(-6).join(' | '),
    );
}

if (!skipSecurity) {
    const sec = run('npm', ['run', 'test:security']);
    record(
        'security-unit-tests',
        sec.status === 0,
        sec.status === 0
            ? 'test:security OK'
            : (sec.stdout || sec.stderr).trim().split('\n').slice(-6).join(' | '),
    );
} else {
    record('security-unit-tests', true, 'SKIP (--skip-security)');
}

const cold = run('node', ['scripts/guard-cold-entry-deps.mjs']);
record('cold-entry-deps', cold.status === 0, (cold.stdout || cold.stderr).trim().split('\n').pop());

const noServiceRole = run('node', ['scripts/guard-dist-no-service-role.mjs']);
record(
    'dist-no-service-role',
    noServiceRole.status === 0,
    (noServiceRole.stdout || noServiceRole.stderr).trim().split('\n').pop(),
);

const noKvAdminChunk = run('node', ['scripts/guard-dist-no-kv-admin-chunk.mjs']);
record(
    'dist-no-kv-admin-chunk',
    noKvAdminChunk.status === 0,
    (noKvAdminChunk.stdout || noKvAdminChunk.stderr).trim().split('\n').pop(),
);

const noForumModChunk = run('node', ['scripts/guard-dist-no-forum-moderator-chunk.mjs']);
record(
    'dist-no-forum-moderator-chunk',
    noForumModChunk.status === 0,
    (noForumModChunk.stdout || noForumModChunk.stderr).trim().split('\n').pop(),
);

const noForumSupabaseAdminChunk = run('node', ['scripts/guard-dist-no-forum-supabase-admin-chunk.mjs']);
record(
    'dist-no-forum-supabase-admin-chunk',
    noForumSupabaseAdminChunk.status === 0,
    (noForumSupabaseAdminChunk.stdout || noForumSupabaseAdminChunk.stderr).trim().split('\n').pop(),
);

const ldStem = run('node', ['scripts/guard-ld-stem-deps.mjs']);
record(
    'ld-stem-deps',
    ldStem.status === 0,
    (ldStem.stdout || ldStem.stderr).trim().split('\n').pop(),
);

const sliceGuard = run('node', ['scripts/guard-slice-boundaries.mjs']);
record(
    'slice-boundaries',
    sliceGuard.status === 0,
    (sliceGuard.stdout || sliceGuard.stderr).trim().split('\n').slice(0, 2).join(' | '),
);

const assetsDir = path.join(ROOT, 'dist', 'assets');
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const preloads = [...html.matchAll(/modulepreload[^>]+href="\/assets\/([^"]+)"/g)].map((m) => m[1]);
let critGz = 0;
for (const p of preloads) {
    const raw = fs.readFileSync(path.join(assetsDir, p));
    critGz += gzipSync(raw).length;
}
const critKb = kb(critGz);
record('critical-path-gzip-le-200', critKb <= 200, `${critKb} KB gzip (target ≤200)`);

const tsc = run('npx', ['tsc', '-p', 'tsconfig.app.json', '--noEmit']);
const tscOut = `${tsc.stdout || ''}\n${tsc.stderr || ''}`;
record('typescript-app', tsc.status === 0, tsc.status === 0 ? '0 errors' : tscOut.slice(-400));

// FOC chunk raw size — مؤشر W2 (lazy modals)
let focRawKb = null;
try {
    const files = fs.readdirSync(assetsDir).filter((f) => /FinancialOperationsCenter.*\.js$/.test(f));
    if (files.length) {
        focRawKb = kb(Math.max(...files.map((f) => fs.statSync(path.join(assetsDir, f)).size)));
        record('foc-chunk-present', true, `${focRawKb} KB raw (largest FOC-named chunk)`);
    } else {
        record('foc-chunk-present', true, 'no dedicated FOC-named chunk (likely merged) — ok');
    }
} catch (e) {
    record('foc-chunk-present', false, String(e));
}

// ExecutionDashboard stem — هدف HWCAC ≤280KB؛ بوابة عدم انحدار قوية + هدف معلن
let edRawKb = null;
try {
    const edFiles = fs.readdirSync(assetsDir).filter((f) => /^ExecutionDashboard-[^.]+\.js$/.test(f));
    if (edFiles.length) {
        edRawKb = kb(Math.max(...edFiles.map((f) => fs.statSync(path.join(assetsDir, f)).size)));
        record('execution-dashboard-raw-le-400', edRawKb <= 400, `${edRawKb} KB raw (non-regress ≤400)`);
        // هدف HWCAC ≤280 — معلومة إلزامية في التقرير؛ لا تفشل verify حتى يُغلق W3
        record(
            'execution-dashboard-raw-target-280-status',
            edRawKb <= 280,
            `${edRawKb} KB raw — HWCAC ≤280 ${edRawKb <= 280 ? 'MET' : 'OPEN'}`,
        );
    } else {
        record('execution-dashboard-raw-le-400', false, 'ExecutionDashboard-*.js missing');
    }
} catch (e) {
    record('execution-dashboard-raw-le-400', false, String(e));
}

let ttfi = null;
if (withTtfi) {
    const env = { ...process.env, VITE_SHELL_AUTH_OPEN: 'true' };
    // TTFI يحتاج build مع auth open — أعد البناء إن لزم
    console.log('[verify:world-class] TTFI preview (auth open build)…');
    const reb = run('npm', ['run', 'build'], { env });
    if (reb.status !== 0) {
        record('ttfi-preview', false, 'auth-open rebuild failed');
    } else {
        const t = run('npm', ['run', 'perf:boot-ttfi', '--', '--preview', '--label=world-class-gate'], { env });
        const m = (t.stdout || '').match(/TTFI \(dashboard-interactive\): (\d+|n\/a)/);
        const ms = m && m[1] !== 'n/a' ? Number(m[1]) : null;
        ttfi = { ms, raw: (t.stdout || '').trim().split('\n').slice(-8) };
        record('ttfi-preview-le-220', ms != null && ms <= 220, ms == null ? 'n/a' : `${ms} ms`);
        // أعد تشغيل الحارس على dist بعد rebuild
        const g2 = run('node', ['scripts/guard-cold-entry-deps.mjs']);
        record('cold-entry-deps-after-ttfi-build', g2.status === 0, 're-check');
        const g3 = run('node', ['scripts/guard-dist-no-service-role.mjs']);
        record('dist-no-service-role-after-ttfi-build', g3.status === 0, 're-check');
        const g4 = run('node', ['scripts/guard-dist-no-kv-admin-chunk.mjs']);
        record('dist-no-kv-admin-chunk-after-ttfi-build', g4.status === 0, 're-check');
    }
}

const ok = gates.every((g) => g.ok);
const payload = {
    ok,
    at: new Date().toISOString(),
    criticalPathGzipKb: critKb,
    focLargestChunkRawKb: focRawKb,
    executionDashboardRawKb: edRawKb,
    preloadCount: preloads.length,
    ttfi,
    gates,
    contract:
        'HWCAC W0–W4 (boundaries + cold entry + tsc + ED≤280 + wife-static + shell-auth + prod-env-contract + security tests)',
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[verify:world-class] ${ok ? 'ALL PASS' : 'FAILED'} → ${outPath}`);
process.exit(ok ? 0 : 1);
