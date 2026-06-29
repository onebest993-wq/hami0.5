#!/usr/bin/env node
/**
 * خريطة ذاكرة للواجهات/الحاويات المهجورة أو المشبوهة — قراءة فقط، لا يحذف شيئاً.
 *
 * Usage:
 *   node scripts/discover-abandoned-surfaces.mjs
 *   node scripts/discover-abandoned-surfaces.mjs --json > reports/abandoned-surfaces.json
 *   node scripts/discover-abandoned-surfaces.mjs --markdown
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const args = new Set(process.argv.slice(2));
const asMarkdown = args.has('--markdown');
const asJson = args.has('--json') || (!asMarkdown && !args.has('--stdout'));

/** مسارات مؤجّلة صراحةً — لا تُصنَّف كزومبي */
const DEFERRED_PATH_FRAGMENTS = [
    'ExecutionDashboard',
    'ExecutionCreation',
    'criminal',
    'Criminal',
    'LawsuitsWorkspace',
    'ArchivePortal',
    'lawsuits',
];

const SKIP_FILE = (rel) =>
    rel.includes('__tests__') ||
    rel.endsWith('.test.ts') ||
    rel.endsWith('.test.tsx') ||
    rel.endsWith('.spec.ts');

function isDeferred(rel) {
    return DEFERRED_PATH_FRAGMENTS.some((f) => rel.includes(f));
}

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules') continue;
            walk(p, out);
        } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
            out.push(p);
        }
    }
    return out;
}

const allFiles = walk(SRC);
const fileTexts = new Map();
for (const f of allFiles) {
    try {
        fileTexts.set(f, fs.readFileSync(f, 'utf8'));
    } catch {
        /* skip */
    }
}

const corpus = [...fileTexts.values()].join('\n');

/** 1 — حالات overlay بـ useState(false) بدون فتح فعلي */
const statePattern =
    /(?:const|let)\s+\[(\w+),\s*(set\1)\]\s*=\s*useState(?:<[^>]+>)?\(\s*false\s*\)/g;

const zombieOverlays = [];
const warmOverlays = [];

for (const [file, text] of fileTexts) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (SKIP_FILE(rel)) continue;

    let m;
    statePattern.lastIndex = 0;
    while ((m = statePattern.exec(text)) !== null) {
        const [, flag, setter] = m;
        if (!/^show|^is[A-Z]|Open$|open$/.test(flag) && !/Modal|Overlay|Sheet|Hub|Dashboard|Workspace|Panel/.test(flag)) {
            continue;
        }

        const openCalls = [];
        const openRe = new RegExp(`${setter}\\(\\s*true\\s*\\)`, 'g');
        for (const [other, otherText] of fileTexts) {
            const otherRel = path.relative(ROOT, other).replace(/\\/g, '/');
            if (SKIP_FILE(otherRel)) continue;
            if (openRe.test(otherText)) {
                openCalls.push(otherRel);
            }
            openRe.lastIndex = 0;
        }

        const primeMount = new RegExp(`prime\\w*Mount[\\s\\S]{0,120}${setter}\\(\\s*true`, 'm').test(corpus);
        const onlySelfPrime =
            openCalls.length === 1 &&
            openCalls[0] === rel &&
            /prime\w*Mount|ShellMounted|shellMounted/i.test(text);

        const entry = {
            flag,
            setter,
            declaredIn: rel,
            openCallSites: openCalls,
            deferred: isDeferred(rel),
            primeMountOnly: onlySelfPrime || (openCalls.length === 0 && primeMount),
        };

        if (openCalls.length === 0) {
            zombieOverlays.push({ ...entry, confidence: 'high' });
        } else if (onlySelfPrime) {
            zombieOverlays.push({ ...entry, confidence: 'medium' });
        } else if (openCalls.length === 1 && openCalls[0] === rel) {
            warmOverlays.push(entry);
        }
    }
}

/** 2 — @deprecated في التعليقات */
const deprecated = [];
const depRe = /@deprecated[^\n*]*\n[^*]*?(?:export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)|\/\/\s*(.+))/g;
for (const [file, text] of fileTexts) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!text.includes('@deprecated')) continue;
    const blockRe = /\/\*\*[\s\S]*?@deprecated[\s\S]*?\*\//g;
    let b;
    while ((b = blockRe.exec(text)) !== null) {
        deprecated.push({
            file: rel,
            snippet: b[0].replace(/\s+/g, ' ').slice(0, 160),
            deferred: isDeferred(rel),
        });
    }
}

/** 3 — lazy exports غير مستوردة من lazyComponents */
const lazyFile = path.join(SRC, 'app/utils/lazyComponents.tsx');
const lazyExports = [];
if (fs.existsSync(lazyFile)) {
    const lazyText = fs.readFileSync(lazyFile, 'utf8');
    const exportRe = /export\s+const\s+(Lazy\w+)\s*=/g;
    let le;
    while ((le = exportRe.exec(lazyText)) !== null) {
        const name = le[1];
        const usedElsewhere = [...fileTexts.entries()].some(([f, t]) => {
            if (f === lazyFile) return false;
            return t.includes(name);
        });
        if (!usedElsewhere) {
            lazyExports.push({ export: name, confidence: 'high' });
        }
    }
}

/** 4 — يتامى مفلترون (من find-orphan-modules بمنطق مبسّط) */
function moduleKeys(filePath) {
    const rel = path.relative(SRC, filePath).replace(/\\/g, '/');
    const noExt = rel.replace(/\.(tsx?|jsx?)$/, '');
    const base = path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
    return [`@/${noExt}`, `@/app/${noExt.replace(/^app\//, '')}`, base];
}

const orphanCandidates = [];
for (const file of allFiles) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (SKIP_FILE(rel)) continue;
    if (isDeferred(rel)) continue;

    const keys = moduleKeys(file);
    let refs = 0;
    for (const [other, text] of fileTexts) {
        if (other === file) continue;
        if (keys.some((k) => k.length >= 4 && text.includes(k))) {
            refs++;
            break;
        }
    }
    if (refs === 0) {
        orphanCandidates.push({
            file: rel,
            bucket: rel.includes('shared/Optimized') ? 'optimized-shared' : rel.includes('services/') ? 'legacy-service' : 'other',
        });
    }
}

/** 5 — إشارات toast/placeholder في التنبيهات */
const placeholderRoutes = [];
const placeholderRe = /(?:case\s+['"`])(\w+)['"`]\s*:[\s\S]{0,200}?(?:toast|placeholder|قريب|محاكاة|TODO)/gi;
for (const [file, text] of fileTexts) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!/notification|alert|toast/i.test(rel) && !/handleNotification|onNotification/i.test(text)) continue;
    let pm;
    const localRe = /['"`](\w+)['"`]\s*:\s*[\s\S]{0,80}(?:toast|SmartToast|placeholder)/g;
    while ((pm = localRe.exec(text)) !== null) {
        placeholderRoutes.push({ route: pm[1], file: rel });
    }
}

const report = {
    generatedAt: new Date().toISOString(),
    note: 'قراءة فقط — راجع confidence قبل أي حذف. التنفيذ/الدعاوى/الأرشيف مستثناة من orphanCandidates.',
    summary: {
        zombieOverlays: zombieOverlays.filter((z) => !z.deferred).length,
        zombieOverlaysDeferred: zombieOverlays.filter((z) => z.deferred).length,
        deprecatedComments: deprecated.length,
        unusedLazyExports: lazyExports.length,
        orphanCandidates: orphanCandidates.length,
        placeholderNotificationRoutes: placeholderRoutes.length,
    },
    zombieOverlays: zombieOverlays.filter((z) => !z.deferred),
    zombieOverlaysDeferred: zombieOverlays.filter((z) => z.deferred),
    warmOverlaysSingleFile: warmOverlays,
    deprecated,
    unusedLazyExports: lazyExports,
    orphanCandidates: orphanCandidates.slice(0, 80),
    orphanCandidatesTruncated: orphanCandidates.length > 80,
    placeholderNotificationRoutes: placeholderRoutes,
};

const outDir = path.join(ROOT, 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'abandoned-surfaces.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

if (asJson && !asMarkdown) {
    console.log(JSON.stringify(report.summary, null, 2));
    console.error(`\nFull report: ${path.relative(ROOT, jsonPath)}`);
} else if (asMarkdown) {
    console.log('# خريطة الذاكرة — واجهات مهجورة أو مشبوهة\n');
    console.log(`> ${report.note}\n`);
    console.log('## ملخص\n');
    for (const [k, v] of Object.entries(report.summary)) {
        console.log(`- **${k}**: ${v}`);
    }
    console.log('\n## زومبي overlays (لوحة المحامي — عالي/متوسط)\n');
    for (const z of report.zombieOverlays.slice(0, 25)) {
        console.log(`- \`${z.flag}\` في \`${z.declaredIn}\` — ثقة: ${z.confidence}, فتح: ${z.openCallSites.length}`);
    }
    console.log('\n## Lazy exports غير مستخدمة\n');
    for (const l of report.unusedLazyExports) {
        console.log(`- \`${l.export}\``);
    }
    console.log('\n## يتامى (أول 25)\n');
    for (const o of report.orphanCandidates.slice(0, 25)) {
        console.log(`- \`${o.file}\` (${o.bucket})`);
    }
    console.log(`\nالتقرير الكامل: \`${path.relative(ROOT, jsonPath)}\``);
} else {
    console.log(JSON.stringify(report, null, 2));
}
