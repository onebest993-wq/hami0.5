/**
 * Lighthouse على build إنتاج محلي — يشغّل preview ثم يقيس الأداء.
 * الاستخدام: node scripts/lighthouse-audit.mjs [--label=after]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;
const label = process.argv.find((a) => a.startsWith('--label='))?.split('=')[1] ?? 'run';
const outDir = path.join(ROOT, 'perf-reports');
const outJson = path.join(outDir, `lighthouse-${label}.json`);

function run(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, shell: false });
        child.on('error', reject);
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
    });
}

async function waitForServer(ms = 12000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        try {
            const res = await fetch(URL);
            if (res.ok) return;
        } catch {
            /* retry */
        }
        await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error('preview server did not become ready');
}

if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.error('[lighthouse] run npm run build first');
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    shell: false,
    stdio: 'ignore',
});

try {
    await waitForServer();
    await run('npx', [
        'lighthouse',
        URL,
        '--only-categories=performance',
        '--output=json',
        `--output-path=${outJson}`,
        '--chrome-flags=--headless --no-sandbox',
        '--quiet',
    ]);
    const report = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    const perf = Math.round((report.categories?.performance?.score ?? 0) * 100);
    const fcp = report.audits['first-contentful-paint']?.displayValue;
    const lcp = report.audits['largest-contentful-paint']?.displayValue;
    const tbt = report.audits['total-blocking-time']?.displayValue;
    const cls = report.audits['cumulative-layout-shift']?.displayValue;
    console.log(`[lighthouse:${label}] performance=${perf}`);
    console.log(`[lighthouse:${label}] FCP=${fcp} LCP=${lcp} TBT=${tbt} CLS=${cls}`);
    console.log(`[lighthouse:${label}] saved ${outJson}`);
} finally {
    preview.kill('SIGTERM');
}
