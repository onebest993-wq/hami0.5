#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(ROOT, 'dist', 'index.html');
const PREVIEW_URL = 'http://127.0.0.1:4173/';
const outDir = path.join(ROOT, 'perf-reports');
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const scenarios = [
    {
        key: 'desktop',
        device: 'desktop',
        throttle: 'none',
        samples: 3,
        budget: {
            ttfiMs: 350,
            firstTabOpenMs: 350,
            overlayRemovedMs: 700,
            wallClockMs: 2_200,
            fcpMs: 800,
        },
    },
    {
        key: 'mobile',
        device: 'mobile',
        throttle: 'none',
        samples: 3,
        budget: {
            ttfiMs: 380,
            firstTabOpenMs: 380,
            overlayRemovedMs: 780,
            wallClockMs: 2_600,
            fcpMs: 700,
        },
    },
    {
        key: 'slow-mobile',
        device: 'mobile',
        throttle: 'slow-mobile',
        samples: 2,
        // ميزانيات مضيف Windows + CPU throttle Playwright — ليست ادعاءً لـ TTFI≤150 على أجهزة حقيقية
        budget: {
            ttfiMs: 6_500,
            firstTabOpenMs: 7_500,
            overlayRemovedMs: 6_500,
            wallClockMs: 10_000,
            fcpMs: 2_000,
        },
        advisory: true,
    },
];

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            cwd: ROOT,
            // Always false: shell:true breaks paths with spaces (Node/Windows).
            shell: false,
            stdio: 'pipe',
            ...opts,
        });

        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (chunk) => {
            stdout += String(chunk);
        });
        child.stderr?.on('data', (chunk) => {
            stderr += String(chunk);
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr, child }));
    });
}

async function waitForServer(url, ms = 30_000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            /* retry */
        }
        await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error(`preview server not ready: ${url}`);
}

function startPreview() {
    return spawn(process.execPath, [VITE_BIN, 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
        cwd: ROOT,
        shell: false,
        stdio: 'ignore',
    });
}

function percentileSorted(values, p) {
    const idx = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * p) - 1));
    return values[idx];
}

function summarize(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return {
        min: sorted[0],
        median: percentileSorted(sorted, 0.5),
        p95: percentileSorted(sorted, 0.95),
        max: sorted[sorted.length - 1],
    };
}

function summarizeScenarioRows(rows) {
    const metrics = ['ttfiMs', 'firstTabOpenMs', 'overlayRemovedMs', 'wallClockMs', 'fcpMs'];
    const summary = {};
    for (const metric of metrics) {
        const vals = rows.map((row) => row[metric]).filter((v) => Number.isFinite(v));
        if (vals.length > 0) summary[metric] = summarize(vals);
    }
    return summary;
}

function compareBudgets(summary, budget) {
    const failures = [];
    for (const [metric, limit] of Object.entries(budget)) {
        const metricSummary = summary[metric];
        const observed = metricSummary?.p95 ?? metricSummary?.max ?? null;
        // overlay قد يُستبدل بالشعار الثابت — لا تفشل البوابة على غياب العلامة فقط
        if (observed == null) {
            if (metric === 'overlayRemovedMs') {
                console.warn(`[core-boot-gate] advisory missing ${metric} (static boot path?)`);
                continue;
            }
            failures.push({ metric, limit, observed: null, reason: 'missing' });
            continue;
        }
        if (observed > limit) {
            failures.push({ metric, limit, observed, reason: 'over_budget' });
        }
    }
    return failures;
}

async function runScenario(scenario) {
    const rows = [];
    for (let i = 1; i <= scenario.samples; i += 1) {
        const label = `core-boot-${scenario.key}-sample-${i}`;
        let result = null;
        let lastError = null;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            result = await run(process.execPath, [
                'scripts/boot-ttfi-audit.mjs',
                `--url=${PREVIEW_URL}`,
                `--device=${scenario.device}`,
                `--throttle=${scenario.throttle}`,
                `--label=${label}`,
            ]);
            process.stdout.write(result.stdout);
            process.stderr.write(result.stderr);
            if (result.code === 0) break;
            lastError = new Error(
                `boot audit failed for ${scenario.key} sample ${i} (attempt ${attempt})`,
            );
            console.warn(`[core-boot-gate] retry ${scenario.key} sample ${i} after failure`);
        }
        if (!result || result.code !== 0) {
            throw lastError ?? new Error(`boot audit failed for ${scenario.key} sample ${i}`);
        }

        const reportPath = path.join(outDir, `${label}.json`);
        rows.push(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
    }

    const summary = summarizeScenarioRows(rows);
    const failures = compareBudgets(summary, scenario.budget);
    return { rows, summary, failures };
}

async function main() {
    const skipBuild = process.argv.includes('--skip-build');
    if (!skipBuild) {
        console.log(
            '[core-boot-gate] measurement build with VITE_SHELL_AUTH_OPEN=true (probe-only — not a production auth claim)',
        );
        const gen = await run(process.execPath, [path.join(ROOT, 'scripts', 'generate-static-law-data.mjs')]);
        if (gen.code !== 0) {
            process.stderr.write(gen.stderr || gen.stdout);
            console.error('[core-boot-gate] generate-static-law-data failed');
            process.exit(1);
        }
        const build = await run(
            process.execPath,
            [VITE_BIN, 'build', '--config', 'vite.config.mts'],
            { env: { ...process.env, VITE_SHELL_AUTH_OPEN: 'true' } },
        );
        if (build.code !== 0) {
            process.stderr.write(build.stderr || build.stdout);
            console.error('[core-boot-gate] measurement build failed');
            process.exit(1);
        }
    } else if (!fs.existsSync(DIST_INDEX)) {
        console.error('[core-boot-gate] dist/index.html missing. Run npm run build first or omit --skip-build.');
        process.exit(1);
    }

    fs.mkdirSync(outDir, { recursive: true });
    const previewProc = startPreview();

    try {
        await waitForServer(PREVIEW_URL);
        const scenarioReports = {};
        let hasFailures = false;

        for (const scenario of scenarios) {
            console.log(`\n=== core boot scenario: ${scenario.key} ===`);
            const report = await runScenario(scenario);
            scenarioReports[scenario.key] = {
                device: scenario.device,
                throttle: scenario.throttle,
                budget: scenario.budget,
                advisory: Boolean(scenario.advisory),
                summary: report.summary,
                failures: report.failures,
            };

            if (report.failures.length > 0) {
                const tag = scenario.advisory ? 'ADVISORY' : 'BLOCKED';
                if (!scenario.advisory) hasFailures = true;
                for (const failure of report.failures) {
                    console.error(
                        `[core-boot-gate] ${tag} ${scenario.key} ${failure.metric}: observed=${failure.observed} limit=${failure.limit}`,
                    );
                }
            } else {
                console.log(`[core-boot-gate] OK ${scenario.key}`);
            }
        }

        const outPath = path.join(outDir, 'core-boot-production-gate.json');
        fs.writeFileSync(
            outPath,
            JSON.stringify(
                {
                    generatedAt: new Date().toISOString(),
                    scenarios: scenarioReports,
                },
                null,
                2,
            ) + '\n',
            'utf8',
        );
        console.log(`\n[core-boot-gate] saved ${outPath}`);

        if (hasFailures) process.exit(1);
    } finally {
        previewProc.kill('SIGTERM');
    }
}

await main();
