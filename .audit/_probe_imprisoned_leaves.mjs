/**
 * جرد أوراق غير مسمّاة في manualChunks يستوردها نطاق التنفيذ وأقسام أخرى.
 * تلك الأوراق هي ما يمتصّه Rollup داخل execution-dashboard-persist-pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const vite = fs.readFileSync(path.join(ROOT, 'vite.config.mts'), 'utf8');

function walk(dir, out = []) {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, name.name);
        if (name.isDirectory()) {
            if (name.name === '__tests__' || name.name === 'node_modules') continue;
            walk(p, out);
            continue;
        }
        if (/\.(ts|tsx)$/.test(name.name) && !/\.test\.|\.spec\./.test(name.name)) out.push(p);
    }
    return out;
}

function stripComments(src) {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function staticImports(src) {
    const cleaned = stripComments(src);
    const specs = [];
    for (const m of cleaned.matchAll(/(?:^|[\s;}])import\s+(?:type\s+)?(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        if (m[0].includes('import type') || m[0].includes('import type ')) continue;
        specs.push(m[1]);
    }
    return specs;
}

function resolveSpec(fromFile, spec) {
    if (!spec.startsWith('@/') && !spec.startsWith('.')) return null;
    let abs;
    if (spec.startsWith('@/')) abs = path.join(SRC, spec.slice(2));
    else abs = path.resolve(path.dirname(fromFile), spec);
    const candidates = [
        abs,
        `${abs}.ts`,
        `${abs}.tsx`,
        path.join(abs, 'index.ts'),
        path.join(abs, 'index.tsx'),
    ];
    return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

function namedInVite(file) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const fragments = [
        rel,
        rel.replace(/^src\//, '/src/'),
        rel.replace(/\.(ts|tsx)$/, ''),
        path.basename(file).replace(/\.(ts|tsx)$/, ''),
    ];
    return fragments.some((f) => f.length > 8 && vite.includes(f));
}

function worldOf(file) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel.includes('/ExecutionDashboard/')) return 'execution';
    if (rel.includes('/CommunityScreen/') || rel.includes('/forum')) return 'forum';
    if (rel.includes('/bootstrap/lawyerAuth') || rel.includes('/services/auth/')) return 'auth';
    if (rel.includes('/HamiSettings/') || rel.includes('/services/settings/')) return 'settings';
    if (rel.includes('/SmartLegalRadar/') || rel.includes('/calendar')) return 'calendar';
    if (rel.includes('/CriminalDashboard/') || rel.includes('/criminal')) return 'criminal';
    if (rel.includes('/FinancialOperationsCenter/')) return 'finance';
    if (rel.includes('/ArchivePortal/')) return 'archive';
    if (rel.includes('/dashboard/')) return 'dashboard';
    if (rel.includes('/NotificationPanel/') || rel.includes('/notifications/')) return 'notifications';
    return 'other';
}

const files = walk(SRC);
const importersByTarget = new Map();

for (const file of files) {
    let src;
    try {
        src = fs.readFileSync(file, 'utf8');
    } catch {
        continue;
    }
    for (const spec of staticImports(src)) {
        const target = resolveSpec(file, spec);
        if (!target) continue;
        if (!importersByTarget.has(target)) importersByTarget.set(target, new Set());
        importersByTarget.get(target).add(file);
    }
}

const rows = [];
for (const [target, importers] of importersByTarget) {
    const worlds = new Set([...importers].map(worldOf));
    const hasExecution = worlds.has('execution');
    const foreign = [...worlds].filter((w) => w !== 'execution' && w !== 'other');
    if (!hasExecution || foreign.length === 0) continue;
    if (namedInVite(target)) continue;
    const size = fs.statSync(target).size;
    rows.push({
        file: path.relative(ROOT, target).split(path.sep).join('/'),
        bytes: size,
        worlds: [...worlds].sort().join(','),
        importerCount: importers.size,
        named: false,
    });
}

rows.sort((a, b) => b.importerCount - a.importerCount);
console.log('unnamed leaves imported by execution AND at least one other world:\n');
console.log('importers\tbytes\tworlds\tfile');
for (const r of rows.slice(0, 60)) {
    console.log(`${String(r.importerCount).padStart(4)}\t${String(r.bytes).padStart(6)}\t${r.worlds}\t${r.file}`);
}
console.log(`\nTOTAL unnamed cross-world: ${rows.length}`);
