/** قياس إغلاق Inner / FullBoot / HomeTab بعد جراحة مسار الإقلاع. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ASSETS = 'dist/assets';
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const sources = new Map(files.map((f) => [f, fs.readFileSync(path.join(ASSETS, f), 'utf8')]));
const gzipCache = new Map();

function gzipKb(file) {
    if (!gzipCache.has(file)) {
        gzipCache.set(file, zlib.gzipSync(Buffer.from(sources.get(file), 'utf8')).length / 1024);
    }
    return gzipCache.get(file);
}

function staticDeps(file) {
    const src = sources.get(file) ?? '';
    const found = new Set();
    const re = /(?:from|import)\s*["']\.\/([A-Za-z0-9._-]+\.js)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        if (sources.has(m[1])) found.add(m[1]);
    }
    return [...found];
}

function closure(entry) {
    const seen = new Set();
    const stack = [entry];
    const parents = new Map();
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const dep of staticDeps(cur)) {
            if (!parents.has(dep)) parents.set(dep, cur);
            stack.push(dep);
        }
    }
    return { seen, parents };
}

function chainOf(file, parents) {
    const chain = [file];
    let cur = file;
    while (parents.has(cur) && chain.length < 14) {
        cur = parents.get(cur);
        chain.push(cur);
    }
    return chain.reverse().join(' -> ');
}

function findByPrefix(prefix) {
    return files.find((f) => f.startsWith(`${prefix}-`) || f.startsWith(`${prefix}.`));
}

function report(label, entry) {
    if (!entry) {
        console.log(`${label}: MISSING`);
        return;
    }
    const { seen, parents } = closure(entry);
    const rows = [...seen].map((f) => ({ file: f, kb: gzipKb(f) })).sort((a, b) => b.kb - a.kb);
    const total = rows.reduce((s, r) => s + r.kb, 0);
    const hits = (re) => rows.filter((r) => re.test(r.file));
    console.log(`\n=== ${label} ===`);
    console.log(`entry: ${entry}`);
    console.log(`chunks: ${rows.length}  gzip: ${total.toFixed(1)} KB`);
    console.log(`settings: ${hits(/HamiSettings|SettingsOverlay|SettingsApp/).map((r) => r.file).join(', ') || 'none'}`);
    console.log(`profile: ${hits(/RoyalLawyer|ProfileTabHost|SettingsProfileRuntime/).map((r) => r.file).join(', ') || 'none'}`);
    const tumors = hits(/execution-handler|archive-portal|ExecutionOverlay|ArchivePortal|vendor-supabase|minimal-boot|lawsuit-archive/);
    console.log('tumor chains:');
    for (const r of tumors) console.log(`  ${r.kb.toFixed(1)}  ${chainOf(r.file, parents)}`);
    console.log('top 15:');
    for (const r of rows.slice(0, 15)) {
        console.log(`  ${r.kb.toFixed(1).padStart(7)}  ${r.file}`);
    }
}

const html = fs.readFileSync('dist/index.html', 'utf8');
const htmlEntry = html.match(/<script[^>]+type="module"[^>]+src="\/assets\/([^"]+\.js)"/)?.[1];
report('Index HTML entry static closure', htmlEntry);
report('Inner static closure', findByPrefix('LawyerDashboardInner'));
report('FullBootPath static closure', findByPrefix('LawyerDashboardFullBootPath'));
report('HomeTabContent static closure', findByPrefix('HomeTabContent'));
report('HomePaint static closure', findByPrefix('lawyer-home-paint'));
report('HomeStemIcons static closure', findByPrefix('lawyer-home-stem-icons'));
report('MainView static closure', findByPrefix('LawyerDashboardMainView'));
report('OrchestrationHost static closure', findByPrefix('LawyerDashboardFullOrchestrationHost'));
