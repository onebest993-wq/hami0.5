/**
 * حارس: بناء المقر (dist-hq) يحمل مدخل المقر لا لوحة المحامي.
 * يُشغَّل بعد npm run build:hq / build:hq:vercel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_HQ = path.join(ROOT, 'dist-hq');

const FORBIDDEN_ASSET_NAMES =
    /(LawyerDashboardInner|LawyerDashboardGate|LawyerHomeHub|ExecutionDashboard|CommunityScreenHost|CriminalDashboard|DecisionsScopeFilterBar|HamiSettingsHost|caseLinkCriminalPeers|settingsInstantPaint|criminalStore|executionDashboardStore)[-.]/i;

/** أسماء وحدات عمل المحامي — تطابق بداية اسم الملف لا البدائل hqOmit* */
const FORBIDDEN_LAWYER_WORK_ASSETS =
    /^(applicationWipe|executionWipeRegistry|storageCache|dossierBackupStore|dossierStorageKeys|dossier-storage-keys|protectedBackupService|protectedStorageKeys|localOnlyNetworkIsolation|settingsSecurityRuntime|calendarTombstones|cloudSyncEngine|caseStore|executionFilesStorage|lawsuitFilesStorage)[-.]/i;

const FORBIDDEN_SUBSTRINGS = [
    'data-testid="lawyer-gate-warm-fallback"',
    'data-testid="lawyer-dashboard"',
    'LawyerDashboardStemInstantBridge',
];

function read(rel) {
    return fs.readFileSync(path.join(DIST_HQ, rel), 'utf8');
}

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
    if (!fs.existsSync(DIST_HQ)) {
        console.error('[guard-dist-hq-runtime] dist-hq missing — run build:hq first');
        process.exit(1);
    }

    const indexPath = path.join(DIST_HQ, 'index.html');
    const hqPath = path.join(DIST_HQ, 'hq.html');
    if (!fs.existsSync(indexPath) && !fs.existsSync(hqPath)) {
        console.error('[guard-dist-hq-runtime] FAIL — neither index.html nor hq.html in dist-hq');
        process.exit(1);
    }

    const html = fs.existsSync(indexPath) ? read('index.html') : read('hq.html');
    if (html.includes('/src/index.tsx') && !html.includes('hq')) {
        console.error('[guard-dist-hq-runtime] FAIL — lawyer entry leaked into dist-hq HTML');
        process.exit(1);
    }

    const robotsPath = path.join(DIST_HQ, 'robots.txt');
    if (!fs.existsSync(robotsPath) || !fs.readFileSync(robotsPath, 'utf8').includes('Disallow: /')) {
        console.error('[guard-dist-hq-runtime] FAIL — dist-hq/robots.txt must disallow all crawlers');
        process.exit(1);
    }

    const assetsDir = path.join(DIST_HQ, 'assets');
    if (!fs.existsSync(assetsDir)) {
        console.error('[guard-dist-hq-runtime] FAIL — dist-hq/assets missing');
        process.exit(1);
    }

    const errors = [];
    const files = walkFiles(DIST_HQ);
    for (const file of files) {
        const rel = path.relative(DIST_HQ, file).replace(/\\/g, '/');
        const base = path.basename(file);
        if (rel.startsWith('assets/') && FORBIDDEN_ASSET_NAMES.test(base)) {
            errors.push(`forbidden lawyer UI asset: ${rel}`);
        }
        if (rel.startsWith('assets/') && FORBIDDEN_LAWYER_WORK_ASSETS.test(base)) {
            errors.push(`forbidden lawyer work store: ${rel}`);
        }
        const ext = path.extname(file).toLowerCase();
        if (ext !== '.js' && ext !== '.html' && ext !== '.css') continue;
        let text = '';
        try {
            text = fs.readFileSync(file, 'utf8');
        } catch {
            continue;
        }
        for (const needle of FORBIDDEN_SUBSTRINGS) {
            if (text.includes(needle)) {
                errors.push(`${rel} contains ${needle}`);
            }
        }
    }

    const js = fs
        .readdirSync(assetsDir)
        .filter((name) => name.endsWith('.js'))
        .map((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8'))
        .join('\n');

    const hasHqUi =
        js.includes('data-testid="hq-end-session"') ||
        js.includes('hq-end-session') ||
        html.includes('hq-end-session');
    if (!hasHqUi) {
        errors.push('HQ shell testid missing from dist-hq');
    }

    if (errors.length) {
        console.error('[guard-dist-hq-runtime] FAIL — lawyer phone UI leaked into dist-hq:');
        for (const err of errors.slice(0, 24)) console.error(`  - ${err}`);
        if (errors.length > 24) console.error(`  … +${errors.length - 24} more`);
        process.exit(1);
    }

    console.log('[guard-dist-hq-runtime] OK — dist-hq is the headquarters product');
}

main();
