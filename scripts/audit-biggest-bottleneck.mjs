/**
 * جرد حي لأكبر ثلاثة أثقال: CSS الحرج، مصادر Tailwind الأضابير، وحدات التنفيذ.
 *
 *   node scripts/audit-biggest-bottleneck.mjs
 *   node scripts/audit-biggest-bottleneck.mjs --save
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toPosix = (p) => p.split(path.sep).join('/');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];

function walkFiles(dir, pred, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === 'dist') continue;
            walkFiles(p, pred, out);
        } else if (pred(ent.name, p)) out.push(p);
    }
    return out;
}

function isTestFile(rel) {
    return (
        /(^|\/)(__tests__|__mocks__)\//.test(rel) ||
        /\.(test|spec)\.(ts|tsx)$/.test(rel)
    );
}

function fileKb(abs) {
    try {
        return fs.statSync(abs).size / 1024;
    } catch {
        return 0;
    }
}

function countLines(text) {
    if (!text) return 0;
    return text.split(/\r?\n/).length;
}

/** 1) تشريح lawyerHomeFx-critical.css */
function auditHomeCriticalCss() {
    const rel = 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css';
    const abs = path.join(ROOT, rel);
    const css = fs.readFileSync(abs, 'utf8');
    const lines = css.split(/\r?\n/);
    const buckets = {
        overlayLock: 0,
        headerDockHome: 0,
        hubCard: 0,
        profileScheduleKeepAlive: 0,
        homeEntrance: 0,
        other: 0,
    };
    let mode = 'headerDockHome';
    for (const line of lines) {
        if (
            line.includes("data-hami-settings-open") ||
            line.includes("data-hami-forum-open") ||
            line.includes("data-hami-transactions-open") ||
            line.includes("data-hami-global-search-open") ||
            line.includes("data-hami-notifications-open") ||
            line.includes("data-hami-repository-open") ||
            line.includes("data-hami-tasks-manager-open") ||
            line.includes("data-hami-field-tasks-open")
        ) {
            mode = 'overlayLock';
        } else if (line.includes('hami-home-slot-enter') || line.includes('data-hami-home-entrance')) {
            mode = 'homeEntrance';
        } else if (
            line.includes('data-hami-profile-open') ||
            line.includes('data-hami-schedule-open') ||
            line.includes('hami-dashboard-tab-preserve') ||
            line.includes('hami-forum-overlay-layer')
        ) {
            mode = 'profileScheduleKeepAlive';
        } else if (
            line.includes('home-hub-card') ||
            line.includes('hami-hub-') ||
            line.includes('hub-archive')
        ) {
            mode = 'hubCard';
        } else if (
            line.includes('hami-lawyer-header') ||
            line.includes('hami-home-') ||
            line.includes('home-main-grid') ||
            line.includes('hami-dock')
        ) {
            mode = 'headerDockHome';
        }
        buckets[mode] += 1;
    }
    return {
        rel,
        bytes: fs.statSync(abs).size,
        kb: Number(fileKb(abs).toFixed(1)),
        lines: lines.length,
        buckets,
        overlayMotion: auditOverlayMotionCss(),
    };
}

function auditOverlayMotionCss() {
    const rel = 'src/app/components/lawyer/dashboard/lawyerHomeFx-overlayMotion.css';
    const abs = path.join(ROOT, rel);
    const css = fs.readFileSync(abs, 'utf8');
    return {
        rel,
        bytes: fs.statSync(abs).size,
        kb: Number(fileKb(abs).toFixed(1)),
        lines: countLines(css),
    };
}

function auditHomeTabIsolation() {
    const files = [
        'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
        'src/app/components/lawyer/dashboard/HomeTabContent.tsx',
        'src/app/components/lawyer/dashboard/useHomeTabContentModel.ts',
        'src/app/components/lawyer/dashboard/HomeMainGridFirstPaint.tsx',
        'src/app/runtime/homeTabContentLoader.ts',
    ];
    const banned = ['ExecutionDashboard', 'criminal-system', 'smart-modal', 'FinancialOperationsCenter'];
    const hits = [];
    for (const rel of files) {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        for (const b of banned) {
            if (src.includes(b)) hits.push({ rel, banned: b });
        }
    }
    return { files, bannedHits: hits };
}

function globSourceFiles(sourceSpec) {
    const cleaned = sourceSpec.replace(/^\.\.\//, 'src/').replace(/\\/g, '/');
    const absBase = path.join(ROOT, cleaned.replace(/\/\*\*$/, '').replace(/\/\*$/, ''));
    if (cleaned.endsWith('/**')) {
        return walkFiles(absBase, (name) => /\.(ts|tsx|js|jsx)$/.test(name)).map((p) =>
            toPosix(path.relative(ROOT, p)),
        );
    }
    if (fs.existsSync(absBase) && fs.statSync(absBase).isFile()) {
        return [toPosix(path.relative(ROOT, absBase))];
    }
    return [];
}

/** 2) مصادر Tailwind dossiers / admin / workspace */
function auditTailwindSources() {
    const files = {
        dossiers: 'src/styles/tailwind-features-dossiers.css',
        admin: 'src/styles/tailwind-features-admin.css',
        workspace: 'src/styles/tailwind-features-workspace.css',
        boot: 'src/styles/tailwind.css',
    };
    const result = {};
    for (const [key, rel] of Object.entries(files)) {
        const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        const sources = [...text.matchAll(/@source\s+'([^']+)'/g)].map((m) => m[1]);
        const includes = sources.filter((s) => !s.startsWith('not ') && !text.includes(`@source not '${s}'`));
        const explicitIncludes = [...text.matchAll(/^@source '((?!not ).*)';/gm)].map((m) => m[1]);
        const groups = [];
        for (const spec of explicitIncludes) {
            const matched = globSourceFiles(spec);
            const prod = matched.filter((f) => !isTestFile(f));
            const tests = matched.filter((f) => isTestFile(f));
            groups.push({
                spec,
                files: matched.length,
                production: prod.length,
                tests: tests.length,
                kb: Number(
                    matched.reduce((sum, f) => sum + fileKb(path.join(ROOT, f)), 0).toFixed(1),
                ),
            });
        }
        result[key] = {
            rel,
            hasTestExclusion: text.includes('@source not') && text.includes('__tests__'),
            hasAdmin: /AdminDashboard|admin\/\*\*/.test(text),
            groups,
            productionFiles: groups.reduce((n, g) => n + g.production, 0),
            testFiles: groups.reduce((n, g) => n + g.tests, 0),
        };
    }
    return result;
}

function stripCommentsAndStringsLight(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function readAllSpecs(src) {
    const cleaned = stripCommentsAndStringsLight(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/^\s*import\s*['"]([^'"]+)/gm)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    return specs;
}

function resolveSpec(fromRel, spec) {
    let base;
    if (spec.startsWith('@/app/')) base = path.join(ROOT, 'src/app', spec.slice('@/app/'.length));
    else if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.resolve(ROOT, path.dirname(fromRel), spec);
    else return null;
    const cands = [];
    if (path.extname(base)) {
        cands.push(base, base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
    }
    for (const e of EXTS) cands.push(base + e);
    for (const e of EXTS) cands.push(path.join(base, `index${e}`));
    for (const c of cands) {
        try {
            if (fs.statSync(c).isFile()) return toPosix(path.relative(ROOT, c));
        } catch {
            /* next */
        }
    }
    return null;
}

/** 3) وحدات ExecutionDashboard: إنتاج مقابل اختبار فقط */
function auditExecutionDeadweight() {
    const execRoot = path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard');
    const execFiles = walkFiles(execRoot, (name) => /\.(ts|tsx)$/.test(name)).map((p) =>
        toPosix(path.relative(ROOT, p)),
    );
    const srcFiles = walkFiles(path.join(ROOT, 'src'), (name) => /\.(ts|tsx)$/.test(name)).map((p) =>
        toPosix(path.relative(ROOT, p)),
    );

    const graph = new Map();
    for (const rel of srcFiles) {
        let text;
        try {
            text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        } catch {
            continue;
        }
        const edges = new Set();
        for (const spec of readAllSpecs(text)) {
            const t = resolveSpec(rel, spec);
            if (t && t !== rel) edges.add(t);
        }
        graph.set(rel, edges);
    }

    const prodSeeds = srcFiles.filter((f) => !isTestFile(f) && (
        f === 'src/index.tsx' ||
        f.startsWith('src/boot/') ||
        f.startsWith('src/app/runtime/') ||
        f.startsWith('src/vite-plugins/')
    ));
    const allSeeds = srcFiles.filter((f) => isTestFile(f)).concat(prodSeeds);

    function reachableFrom(seeds) {
        const seen = new Set();
        const stack = [...seeds];
        while (stack.length) {
            const cur = stack.pop();
            if (!cur || seen.has(cur)) continue;
            seen.add(cur);
            for (const nxt of graph.get(cur) ?? []) if (!seen.has(nxt)) stack.push(nxt);
        }
        return seen;
    }

    const prodReach = reachableFrom(prodSeeds);
    const allReach = reachableFrom(allSeeds);

    const testOnly = [];
    const unreachable = [];
    for (const f of execFiles) {
        if (isTestFile(f)) continue;
        if (!allReach.has(f)) unreachable.push(f);
        else if (!prodReach.has(f)) testOnly.push(f);
    }

    return {
        executionFiles: execFiles.length,
        productionFiles: execFiles.filter((f) => !isTestFile(f)).length,
        testFiles: execFiles.filter((f) => isTestFile(f)).length,
        testOnlyProductionModules: testOnly.sort(),
        unreachableEvenFromTests: unreachable.sort(),
    };
}

const report = {
    savedAt: new Date().toISOString(),
    homeCriticalCss: auditHomeCriticalCss(),
    homeTabIsolation: auditHomeTabIsolation(),
    tailwindSources: auditTailwindSources(),
    executionDeadweight: auditExecutionDeadweight(),
};

const outRel = '.audit/biggest-bottleneck-live.json';
if (process.argv.includes('--save')) {
    fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, outRel), `${JSON.stringify(report, null, 2)}\n`);
}

function print() {
    const c = report.homeCriticalCss;
    console.log(`[home-critical] ${c.rel}  ${c.kb} KB  ${c.lines} lines`);
    console.log('  buckets', JSON.stringify(c.buckets));
    if (c.overlayMotion) {
        console.log(`[overlay-motion] ${c.overlayMotion.rel}  ${c.overlayMotion.kb} KB  ${c.overlayMotion.lines} lines`);
    }
    const iso = report.homeTabIsolation;
    console.log(`[home-tab] banned hits: ${iso.bannedHits.length}`);
    for (const h of iso.bannedHits) console.log(`  ${h.rel} → ${h.banned}`);

    for (const [key, block] of Object.entries(report.tailwindSources)) {
        console.log(
            `[tailwind:${key}] prodFiles=${block.productionFiles} testFiles=${block.testFiles} testExclusion=${block.hasTestExclusion} admin=${block.hasAdmin}`,
        );
        const top = [...block.groups].sort((a, b) => b.files - a.files).slice(0, 8);
        for (const g of top) {
            console.log(
                `    ${String(g.production).padStart(4)} prod / ${String(g.tests).padStart(3)} test  ${g.spec}`,
            );
        }
    }

    const d = report.executionDeadweight;
    console.log(
        `[execution] files=${d.executionFiles} prod=${d.productionFiles} tests=${d.testFiles} test-only=${d.testOnlyProductionModules.length} unreachable=${d.unreachableEvenFromTests.length}`,
    );
    for (const f of d.unreachableEvenFromTests.slice(0, 30)) console.log(`  UNREACHABLE ${f}`);
    for (const f of d.testOnlyProductionModules.slice(0, 40)) console.log(`  TEST-ONLY ${f}`);
    if (d.testOnlyProductionModules.length > 40) {
        console.log(`  … +${d.testOnlyProductionModules.length - 40} more test-only`);
    }
}

print();
if (process.argv.includes('--save')) console.log(`saved ${outRel}`);
