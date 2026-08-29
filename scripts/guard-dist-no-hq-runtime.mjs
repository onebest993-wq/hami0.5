/**
 * حارس: حزمة المحامي (dist) لا تحمل مدخل المقر ولا واجهته.
 * يُشغَّل بعد npm run build — جزء من guard:dist-secrets.
 *
 * dist-hq بناء منفصل ولا يُفحص هنا.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const FORBIDDEN_NAMES = /^(hq\.html)$/i;
const FORBIDDEN_ASSET_NAMES =
    /(AdminDashboard|HqRuntimeShell|hqDoorSession|AdminHeadquartersAccess|HqCourtStatsPanel|headquartersHiddenDoor)/i;
const FORBIDDEN_SUBSTRINGS = [
    'data-testid="hq-end-session"',
    'data-testid="hq-directory"',
    'data-testid="hq-verification-queue"',
    'data-testid="hq-stats-monitor"',
    'markHqDocumentEntry',
    'admin-hq-shell',
];

function walkFiles(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            walkFiles(full, acc);
            continue;
        }
        acc.push(full);
    }
    return acc;
}

function main() {
    if (!fs.existsSync(DIST)) {
        console.error('[guard-dist-no-hq-runtime] dist missing — run build first');
        process.exit(1);
    }

    const errors = [];
    const files = walkFiles(DIST);

    for (const file of files) {
        const rel = path.relative(DIST, file).replace(/\\/g, '/');
        const base = path.basename(file);
        if (FORBIDDEN_NAMES.test(base) || FORBIDDEN_NAMES.test(rel)) {
            errors.push(`forbidden file: ${rel}`);
        }
        if (rel.startsWith('assets/') && FORBIDDEN_ASSET_NAMES.test(base)) {
            errors.push(`forbidden HQ asset: ${rel}`);
        }
    }

    const scanExt = new Set(['.js', '.html', '.css', '.json']);
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!scanExt.has(ext)) continue;
        let text = '';
        try {
            text = fs.readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        const rel = path.relative(DIST, file).replace(/\\/g, '/');
        for (const needle of FORBIDDEN_SUBSTRINGS) {
            if (text.includes(needle)) {
                errors.push(`${rel} contains ${needle}`);
            }
        }
        if (rel === 'index.html' && (text.includes('hq.html') || text.includes('/src/hq/'))) {
            errors.push('index.html references HQ entry');
        }
    }

    if (errors.length) {
        console.error('[guard-dist-no-hq-runtime] FAIL — HQ runtime leaked into lawyer dist:');
        for (const err of errors.slice(0, 24)) console.error(`  - ${err}`);
        if (errors.length > 24) console.error(`  … +${errors.length - 24} more`);
        process.exit(1);
    }

    console.log('[guard-dist-no-hq-runtime] OK — lawyer dist has no HQ HTML/runtime traces');
}

main();
