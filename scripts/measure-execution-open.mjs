#!/usr/bin/env node
/**
 * W4 — قياس زمن فتح مسارات التنفيذ (archive / dossier / followup).
 *
 * Usage:
 *   node scripts/measure-execution-open.mjs
 *   node scripts/measure-execution-open.mjs --live
 *
 * يفضّل أرقام e2e من test-results؛ وإلا --live (Playwright probe)؛
 * الحقول غير المتاحة تُعلَن "OPEN" صراحة — لا SLA مُختلَق.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'perf-reports', 'execution-open.json');
const live = process.argv.includes('--live');

const OPEN = 'OPEN';

/** @typedef {{ measuredAt: string; archiveOpenMs?: number | 'OPEN'; dossierOpenMs?: number | 'OPEN'; followupOpenMs?: number | 'OPEN'; source: 'e2e' | 'synthetic'; notes: string[]; mobileGapsOpen?: string[] }} ExecutionOpenReport */

/** @returns {Partial<ExecutionOpenReport>} */
function parseTestResultsDir() {
    const dir = path.join(ROOT, 'test-results');
    if (!fs.existsSync(dir)) return {};

    /** @type {Partial<ExecutionOpenReport>} */
    const found = {};
    const notes = [];

    /** @param {string} file */
    function walk(file) {
        if (fs.statSync(file).isDirectory()) {
            for (const ent of fs.readdirSync(file)) walk(path.join(file, ent));
            return;
        }
        if (!/\.(json|txt|log)$/i.test(file)) return;
        let raw;
        try {
            raw = fs.readFileSync(file, 'utf8');
        } catch {
            return;
        }
        if (!/archiveOpenMs|dossierOpenMs|followupOpenMs|execution-open/i.test(raw)) return;

        try {
            const data = JSON.parse(raw);
            const bag = data?.executionOpen ?? data?.perf ?? data;
            if (typeof bag?.archiveOpenMs === 'number') found.archiveOpenMs = bag.archiveOpenMs;
            if (typeof bag?.dossierOpenMs === 'number') found.dossierOpenMs = bag.dossierOpenMs;
            if (typeof bag?.followupOpenMs === 'number') found.followupOpenMs = bag.followupOpenMs;
            notes.push(`parsed ${path.relative(ROOT, file)}`);
        } catch {
            const archive = raw.match(/archiveOpenMs["']?\s*[:=]\s*(\d+)/);
            const dossier = raw.match(/dossierOpenMs["']?\s*[:=]\s*(\d+)/);
            const followup = raw.match(/followupOpenMs["']?\s*[:=]\s*(\d+)/);
            if (archive) found.archiveOpenMs = Number(archive[1]);
            if (dossier) found.dossierOpenMs = Number(dossier[1]);
            if (followup) found.followupOpenMs = Number(followup[1]);
            if (archive || dossier || followup) notes.push(`regex ${path.relative(ROOT, file)}`);
        }
    }

    walk(dir);
    if (notes.length) found.notes = notes;
    return found;
}

/** @returns {Promise<Partial<ExecutionOpenReport>>} */
async function runLivePlaywrightProbe() {
    const probePath = path.join(ROOT, 'e2e', 'execution-open-perf-probe.spec.ts');
    if (!fs.existsSync(probePath)) {
        return { notes: ['live probe spec missing — skipped'] };
    }

    const probeOut = path.join(ROOT, 'perf-reports', 'execution-open-probe-raw.json');
    console.log('[measure-execution-open] running live Playwright probe…');

    const result = spawnSync(
        'npx',
        [
            'playwright',
            'test',
            'e2e/execution-open-perf-probe.spec.ts',
            '--project=chromium',
            '--workers=1',
            '--retries=0',
        ],
        {
            cwd: ROOT,
            encoding: 'utf8',
            shell: process.platform === 'win32',
            stdio: 'inherit',
            env: { ...process.env, CI: '', PW_WORKERS: '1' },
            timeout: 300_000,
        },
    );

    if (result.status !== 0) {
        // لا ترمِ الأرقام الجزئية إن كُتبت قبل فشل مسار لاحق
        if (fs.existsSync(probeOut)) {
            try {
                const raw = JSON.parse(fs.readFileSync(probeOut, 'utf8'));
                return {
                    archiveOpenMs: typeof raw.archiveOpenMs === 'number' ? raw.archiveOpenMs : undefined,
                    dossierOpenMs: typeof raw.dossierOpenMs === 'number' ? raw.dossierOpenMs : undefined,
                    followupOpenMs: typeof raw.followupOpenMs === 'number' ? raw.followupOpenMs : undefined,
                    notes: [
                        `live probe exit ${result.status ?? 'unknown'} — partial timings retained`,
                        ...(Array.isArray(raw.notes) ? raw.notes.map(String) : []),
                    ],
                };
            } catch {
                /* fall through */
            }
        }
        return { notes: [`live probe exit ${result.status ?? 'unknown'}`] };
    }

    if (!fs.existsSync(probeOut)) {
        return { notes: ['live probe finished but probe-raw.json missing'] };
    }

    try {
        const raw = JSON.parse(fs.readFileSync(probeOut, 'utf8'));
        return {
            archiveOpenMs: typeof raw.archiveOpenMs === 'number' ? raw.archiveOpenMs : undefined,
            dossierOpenMs: typeof raw.dossierOpenMs === 'number' ? raw.dossierOpenMs : undefined,
            followupOpenMs: typeof raw.followupOpenMs === 'number' ? raw.followupOpenMs : undefined,
            notes: [`live probe ${probeOut}`],
        };
    } catch (e) {
        return { notes: [`probe parse error: ${String(e)}`] };
    }
}

/** @param {Partial<ExecutionOpenReport>} partial */
function finalizeReport(partial) {
    /** @type {ExecutionOpenReport} */
    const report = {
        measuredAt: new Date().toISOString(),
        source: partial.archiveOpenMs != null || partial.dossierOpenMs != null || partial.followupOpenMs != null
            ? live ? 'e2e' : 'e2e'
            : 'synthetic',
        notes: partial.notes ?? [],
        archiveOpenMs: typeof partial.archiveOpenMs === 'number' ? partial.archiveOpenMs : OPEN,
        dossierOpenMs: typeof partial.dossierOpenMs === 'number' ? partial.dossierOpenMs : OPEN,
        followupOpenMs: typeof partial.followupOpenMs === 'number' ? partial.followupOpenMs : OPEN,
        mobileGapsOpen: listMobileGapsOpen(),
    };

    if (
        report.archiveOpenMs === OPEN &&
        report.dossierOpenMs === OPEN &&
        report.followupOpenMs === OPEN
    ) {
        report.source = 'synthetic';
        report.notes.push(
            'No e2e timing captured — run `node scripts/measure-execution-open.mjs --live` after `npm run dev` or gate e2e.',
        );
    } else {
        report.source = 'e2e';
    }

    // perf budget reference (chunk only — not open SLA)
    const budgetPath = path.join(ROOT, 'scripts', 'perf-budget.json');
    if (fs.existsSync(budgetPath)) {
        try {
            const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
            const edKb = budget?.namedChunkMaxRawKb?.ExecutionDashboard;
            if (edKb) report.notes.push(`perf-budget ExecutionDashboard namedChunkMaxRawKb=${edKb} (chunk, not open-ms SLA)`);
        } catch {
            /* ignore */
        }
    }

    return report;
}

function listMobileGapsOpen() {
    /** @type {string[]} */
    const gaps = [];

    const checkFiles = [
        {
            rel: 'src/app/components/lawyer/Modal_Seized_Assets_Manager.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS', 'EXEC_MODAL_BACKDROP_SAFE_PAD'],
        },
        {
            rel: 'src/app/components/lawyer/Modal_Unified_Summons_Hub.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS', 'EXEC_MODAL_BACKDROP_SAFE_PAD'],
        },
        {
            rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionHeirsNotificationModalContainer.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS'],
        },
        {
            rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDebtorNotificationMemoModalContainer.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS'],
        },
        {
            rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionPaymentModalContainer.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS'],
        },
        {
            rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionSolidaryAndEvictionFollowupModalsContainer.tsx',
            need: ['EXEC_MODAL_CLOSE_BTN_CLASS'],
        },
    ];

    for (const { rel, need } of checkFiles) {
        const p = path.join(ROOT, rel);
        if (!fs.existsSync(p)) {
            gaps.push(`${rel}: file missing`);
            continue;
        }
        const src = fs.readFileSync(p, 'utf8');
        for (const token of need) {
            if (!src.includes(token)) gaps.push(`${rel}: missing ${token}`);
        }
    }

    gaps.push(
        'execution-open in-app perf marks (hami:execution:*): OPEN — wall-clock probe only',
        'followupOpenMs warm-cache second open: OPEN — probe measures cold path only',
        'live e2e probe blocked when dev overlay/import errors present: check vite HMR overlay before --live',
    );

    return gaps;
}

async function main() {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });

    let partial = parseTestResultsDir();

    if (live) {
        const livePartial = await runLivePlaywrightProbe();
        partial = { ...partial, ...livePartial, notes: [...(partial.notes ?? []), ...(livePartial.notes ?? [])] };
    } else if (!partial.archiveOpenMs && !partial.dossierOpenMs && !partial.followupOpenMs) {
        partial.notes = [...(partial.notes ?? []), 'test-results empty — use --live for Playwright probe'];
    }

    const report = finalizeReport(partial);
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`[measure-execution-open] wrote ${OUT}`);
    console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
