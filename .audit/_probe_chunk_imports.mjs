/** Dump compiled static imports + distinctive strings for boot tumor chunks. */
import fs from 'node:fs';
import path from 'node:path';

const dir = 'dist/assets';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const sources = new Map(files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));

function find(prefix) {
    return files.find((f) => f.startsWith(`${prefix}-`) || f.startsWith(`${prefix}.`));
}

function staticFrom(file) {
    const src = sources.get(file) ?? '';
    const re = /(?:from|import)\s*["']\.\/([A-Za-z0-9._-]+\.js)["']/g;
    const out = [];
    let m;
    while ((m = re.exec(src))) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        out.push(m[1]);
    }
    return [...new Set(out)];
}

function importersOf(target) {
    const hits = [];
    for (const [file, src] of sources) {
        if (file === target) continue;
        if (!src.includes(`./${target}`)) continue;
        const before = src.split(`./${target}`)[0].slice(-20);
        hits.push({ file, dyn: /import\s*\(/.test(before) });
    }
    return hits;
}

const needles = [
    'LawyerDashboardShell',
    'DashboardTabSurface',
    'AppLockOverlay',
    'SafeView',
    'LocalStorageRepository',
    'lawyerSettings',
    'useThemeStyles',
    'HomeMainGrid',
    'QuantumTasks',
    'prepareAgendaTasks',
    'normalizeArabicSearch',
    'SecureStoreService',
    'ArchiveVirtualGrid',
    'ExecutionSmartCard',
    'LawsuitArchive',
    'ProfileAvatar',
    'useAuthUser',
    'inertProps',
    'shellAuth',
    'LawyerVerification',
    'DashboardWallpaper',
    'HAMI_SHELL_CONTAINER',
    'FUSE_ENGINE',
    'Fingerprint',
];

const prefixes = [
    'lawyer-dashboard-minimal-boot',
    'archive-portal-execution',
    'archive-portal-lite',
    'lawsuit-archive-grid',
    'lawyer-home-paint',
    'lawyer-quantum-lite',
    'lawyer-orchestration-lite',
    'Header',
    'HomeTabContent',
    'LawyerDashboardMainView',
    'LawyerDashboardFullBootPath',
    'LawyerDashboardShell',
    'globalSearchLoader',
    'globalSearchFuse',
    'readGlobalSearchRecentSearchesSync',
    'hami-shell-lite',
    'vendor-ui',
    'vendor-misc',
    'RouteTile',
    'AppLockOverlay',
];

for (const prefix of prefixes) {
    const f = find(prefix);
    console.log(`\n======== ${prefix} => ${f ?? 'MISSING'} ========`);
    if (!f) continue;
    console.log('static imports:');
    for (const d of staticFrom(f)) console.log('  ', d);
    const src = sources.get(f);
    const hits = needles.filter((n) => src.includes(n));
    console.log('needles:', hits.join(', ') || '(none)');
}

console.log('\n\n===== importers of tumors =====');
for (const prefix of [
    'archive-portal-execution',
    'lawyer-dashboard-minimal-boot',
    'lawsuit-archive-grid',
    'archive-portal-lite',
    'lawyer-quantum-lite',
]) {
    const f = find(prefix);
    if (!f) continue;
    console.log(`\n-- ${f} --`);
    for (const { file, dyn } of importersOf(f)) {
        console.log(`  ${dyn ? 'dyn' : 'stat'}  ${file}`);
    }
}
