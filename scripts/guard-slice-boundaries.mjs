/**
 * HWCAC W2 — حارس حدود الشرائح.
 *
 * يمنع deep-import من مجلدات خارج الشريحة إلى داخلها
 * إلا عبر `@/app/slices/<slice>/public` أو allowlist صريح (loaders/tests).
 *
 * الاستخدام: node scripts/guard-slice-boundaries.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** شرائح محمية: جذر داخلي → مسار الـ public */
const SLICES = [
    {
        id: 'execution',
        roots: [
            'src/app/components/lawyer/ExecutionDashboard/',
            'src/app/components/lawyer/dashboard/ExecutionDashboardPortal',
            'src/app/components/lawyer/dashboard/executionDashboardPortalLazy',
        ],
        publicModule: '@/app/slices/execution/public',
        allowImporters: [
            /^src\/app\/slices\/execution\//,
            /^src\/app\/components\/lawyer\/ExecutionDashboard\//,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/runtime\/execution/,
            /^src\/app\/hooks\/lawyerDashboard\//,
            /^src\/app\/components\/lawyer\/LawyerDashboardParts\//,
            /^src\/app\/utils\/execution/,
            /^src\/app\/domain\/execution\//,
            /^src\/app\/application\/execution\//,
            // سطح التنفيذ الشقيق (لوحة فرعية + إنشاء + قرارات)
            /^src\/app\/components\/lawyer\/execution\//,
            /^src\/app\/components\/lawyer\/ExecutionCreationView\//,
            /^src\/app\/components\/lawyer\/DecisionsAndAppealsEngine\//,
            /^src\/app\/components\/lawyer\/ArchivePortal\//,
            /^src\/app\/components\/lawyer\/FinancialOperationsCenter/,
            /^src\/app\/utils\/financialCenterTimeline/,
            /^src\/app\/hooks\//,
            /^src\/app\/utils\/(personalCoercive|syncPersonalCoercive|syncExecutor|specificDelivery|lawyerCassation)/,
            /^src\/app\/utils\/lawyerCassationEntry/,
            /^src\/app\/utils\/personalCoerciveAppealSync/,
            /^src\/app\/utils\/specificDeliveryMovableValuationRequest/,
            /^src\/app\/utils\/syncExecutorDecisionResolution/,
            /^src\/app\/utils\/syncPersonalCoerciveAppealClosure/,
            /^src\/app\/hooks\/useDecisionDispatcher/,
        ],
    },
    {
        id: 'criminal',
        roots: ['src/app/components/lawyer/criminal-system/'],
        publicModule: '@/app/slices/criminal/public',
        allowImporters: [
            /^src\/app\/slices\/criminal\//,
            /^src\/app\/components\/lawyer\/criminal-system\//,
            /^src\/app\/runtime\/criminal/,
            /^src\/app\/runtime\/primeCriminal/,
            /^src\/app\/hooks\/lawyerDashboard\//,
            /^src\/app\/hooks\//,
            /^src\/app\/utils\/lazyComponents/,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/components\/lawyer\/ArchivePortal\//,
            /^src\/app\/services\/caseShare\//,
            /^src\/app\/services\/alertDossierRegistry/,
            /^src\/app\/services\/dossier-notes\//,
            /^src\/app\/constants\//,
            /^src\/app\/components\/lawyer\/smart-modal\//,
            /^src\/app\/components\/lawyer\/personal-status\//,
            /^src\/app\/components\/admin\//,
            /^src\/app\/components\/lawyer\/LawyerNewCase/,
        ],
    },
    {
        id: 'financial',
        roots: [
            'src/app/components/lawyer/FinancialOperationsCenter/',
            'src/app/components/lawyer/FinancialOperationsCenter.tsx',
        ],
        publicModule: '@/app/slices/financial/public',
        allowImporters: [
            /^src\/app\/slices\/financial\//,
            /^src\/app\/components\/lawyer\/FinancialOperationsCenter/,
            /^src\/app\/components\/lawyer\/ExecutionDashboard\//,
            /^src\/app\/components\/lawyer\/AlimonyFinancialBlock/,
            /^src\/app\/components\/lawyer\/Modal_Guarantor_Registration/,
            /^src\/app\/utils\/alimony/,
            /^src\/app\/utils\/financial/,
            /^src\/app\/components\/lawyer\/ArchivePortal\//,
            /^src\/app\/components\/lawyer\/LawyerNewCase/,
            /^src\/app\/components\/lawyer\/smart-modal\//,
            /^src\/app\/components\/lawyer\/execution\//,
        ],
    },
    {
        id: 'community',
        roots: [
            'src/app/components/lawyer/CommunityScreen/',
            'src/app/components/lawyer/CommunityScreen.tsx',
        ],
        publicModule: '@/app/slices/community/public',
        allowImporters: [
            /^src\/app\/slices\/community\//,
            /^src\/app\/components\/lawyer\/CommunityScreen/,
            /^src\/app\/runtime\/community/,
            /^src\/app\/hooks\/lawyerDashboard\//,
            /^src\/app\/hooks\//,
            /^src\/app\/services\/forum\//,
            /^src\/app\/utils\/lazyComponents/,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/runtime\/radar/,
        ],
    },
    {
        id: 'schedule',
        roots: [
            'src/app/components/lawyer/dashboard/LawyerDashboardScheduleTab',
            'src/app/components/lawyer/SmartLegalRadar',
            'src/app/components/lawyer/SmartLegalRadar.tsx',
        ],
        publicModule: '@/app/slices/schedule/public',
        allowImporters: [
            /^src\/app\/slices\/schedule\//,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/components\/lawyer\/SmartLegalRadar/,
            /^src\/app\/runtime\/schedule/,
            /^src\/app\/runtime\/radar/,
            /^src\/app\/hooks\/lawyerDashboard\//,
            /^src\/app\/hooks\/useCalendarData/,
            /^src\/app\/hooks\//,
            /^src\/app\/components\/lawyer\/hooks\//,
            /^src\/app\/services\/calendar/,
            /^src\/app\/utils\/lazyComponents/,
        ],
    },
    {
        id: 'repository',
        roots: ['src/app/components/lawyer/SmartRepository/'],
        publicModule: '@/app/slices/repository/public',
        allowImporters: [
            /^src\/app\/slices\/repository\//,
            /^src\/app\/components\/lawyer\/SmartRepository\//,
            /^src\/app\/components\/lawyer\/SmartVaultModal\//,
            /^src\/app\/components\/lawyer\/dossier-notes\//,
            /^src\/app\/components\/lawyer\/hooks\//,
            /^src\/app\/runtime\/repository/,
            /^src\/app\/hooks\/lawyerDashboard\//,
            /^src\/app\/utils\/lazyComponents/,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/components\/lawyer\/ActionModals\//,
        ],
    },
    {
        id: 'home',
        roots: ['src/app/components/lawyer/dashboard/LawyerDashboardHomeTab'],
        publicModule: '@/app/slices/home/public',
        allowImporters: [
            /^src\/app\/slices\/home\//,
            /^src\/app\/components\/lawyer\/dashboard\//,
            /^src\/app\/runtime\/home/,
            /^src\/app\/hooks\/lawyerDashboard\//,
        ],
    },
];

const IMPORT_RE =
    /(?:from|import)\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;

function walk(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === 'dist') continue;
            walk(p, acc);
        } else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
            acc.push(p);
        }
    }
    return acc;
}

function toPosix(p) {
    return p.split(path.sep).join('/');
}

function resolveImport(fromFile, spec) {
    if (spec.startsWith('@/')) {
        return toPosix(path.join('src', spec.slice(2)));
    }
    if (!spec.startsWith('.')) return null;
    const base = path.posix.join(toPosix(path.dirname(fromFile)), spec);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
    for (const c of candidates) {
        if (fs.existsSync(path.join(ROOT, c))) return c;
    }
    return base;
}

function matchesRoot(resolved, roots) {
    const r = resolved.replace(/\\/g, '/');
    return roots.some((root) => {
        if (root.endsWith('/')) return r.startsWith(root) || r.startsWith(root.slice(0, -1));
        return r === root || r.startsWith(`${root}.`) || r.startsWith(`${root}/`);
    });
}

function isAllowedImporter(relFile, allowImporters) {
    const f = relFile.replace(/\\/g, '/');
    if (f.includes('/__tests__/') || f.endsWith('.test.ts') || f.endsWith('.test.tsx')) return true;
    return allowImporters.some((re) => re.test(f));
}

const files = walk(SRC);
const violations = [];

for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    if (!fs.existsSync(abs)) continue;
    let text;
    try {
        text = fs.readFileSync(abs, 'utf8');
    } catch {
        continue;
    }
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(text))) {
        const spec = m[1] || m[2] || m[3];
        if (!spec || spec.endsWith('.css') || spec.endsWith('.json')) continue;
        // type-only: تقريب — سطر فيه import type
        const lineStart = text.lastIndexOf('\n', m.index) + 1;
        const line = text.slice(lineStart, text.indexOf('\n', m.index));
        if (/import\s+type\s/.test(line) || /import\s*\{[^}]*\btype\b/.test(line)) continue;

        const resolved = resolveImport(rel, spec);
        if (!resolved) continue;

        for (const slice of SLICES) {
            if (!matchesRoot(resolved, slice.roots)) continue;
            // داخل الشريحة أو عبر public — مسموح
            if (spec === slice.publicModule || spec.startsWith(`${slice.publicModule}`)) continue;
            if (isAllowedImporter(rel, slice.allowImporters)) continue;
            // المستورد نفسه داخل جذر الشريحة
            if (matchesRoot(rel, slice.roots)) continue;

            violations.push({
                file: rel,
                import: spec,
                resolved,
                slice: slice.id,
                hint: `استخدم ${slice.publicModule} أو أضف المسار إلى allowlist مؤقت`,
            });
        }
    }
}

if (violations.length) {
    console.error(`[guard-slice-boundaries] FAIL — ${violations.length} deep-import(s):`);
    for (const v of violations.slice(0, 40)) {
        console.error(`  ${v.file}`);
        console.error(`    → ${v.import}  [${v.slice}]`);
        console.error(`    ${v.hint}`);
    }
    if (violations.length > 40) console.error(`  … +${violations.length - 40} more`);
    process.exit(1);
}

console.log('[guard-slice-boundaries] PASS');
console.log(`  slices=${SLICES.map((s) => s.id).join(',')}`);
console.log(`  scanned=${files.length} files`);
