#!/usr/bin/env node
/**
 * حارس الضريبة المشتركة لأول فتح قسم.
 *
 * أوراق بلا اعتمادية (parseJsonResponse، SecureAPIClient، overlayMotionRuntime)
 * كانت تُسكَن داخل execution-dashboard-persist-pipeline. بعدها أي قسم يستورد
 * الورقة يدفع ~1.2 م.ب. الحارس يثبّت الأوراق المسماة ويمنع عودة OTP/forumApi
 * إلى خطوط أنابيب التنفيذ.
 *
 *   npm run build && node scripts/guard-first-open-shared-tax.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');

const REQUIRED_LEAVES = [
    'bff-json-leaf',
    'local-ymd',
    'calendar-cloud-runtime',
    'calendarCloudLoader',
    'calendar-events-cache',
    'calendar-storage-keys',
    'calendar-radar-48h',
    'home-hub-radar-peek',
    'notification-model',
    'notification-peek-lite',
    'kv-proxy-key-ownership',
    'cloud-sync-env',
    'lawyer-work-cloud-gate',
    'hami-uuidv4',
    'criminal-cases-storage',
    'execution-appeal-engine',
    'executor-seizure-decision-queue',
    'schedule-chrome-lite',
    'app-state-events',
    'overlay-motion-runtime',
    'overlay-portal',
    'device-performance-tier',
    'hami-debug',
    'secure-api-client',
    'wife-hmac-signing',
    'sentry-build-policy',
    'perf-sentry-reporting',
    'tx-input-security',
    'secure-json-legacy',
    'lawyer-repository-cloud',
    'hami-dialog-lite',
    'storage-encryption-error',
    'tx-secure-persist',
    'transactions-threading-store',
];

const FORBIDDEN_PIPELINE = /^(execution-dashboard-(persist|boot|claim|workspace)-pipeline)-/;

const FORBIDDEN_IMPORTERS = [
    'LawyerAuthOtpPanel-',
    'forumApiService-',
    'useForumNotificationStream-',
    'LawyerDashboardMainView-',
    'ScheduleTabHost-',
    'CommunityScreen-',
    'calendarPerfMetrics-',
    'AccountSection-',
    'AddTaskBottomSheet-',
];

const WATCH_IMPORTERS = [];

if (!fs.existsSync(ASSETS)) {
    console.error('[first-open-shared-tax] missing dist/assets — run npm run build first');
    process.exit(1);
}

const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));

function findByPrefix(prefix) {
    return files.filter((f) => f.startsWith(prefix));
}

function staticImports(file) {
    const src = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    const found = [];
    const re = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        found.push(m[1]);
    }
    return found;
}

const failures = [];

for (const leaf of REQUIRED_LEAVES) {
    if (findByPrefix(`${leaf}-`).length === 0 && !files.includes(`${leaf}.js`)) {
        failures.push(`missing named leaf chunk ${leaf}-*.js`);
    }
}

const iconChunks = files.filter((f) => f.startsWith('ui-icon-'));
if (iconChunks.length > 0) {
    failures.push(`ui-icon-* chunks must not exist (found ${iconChunks.length}) — lucide follows the importer`);
}

for (const prefix of FORBIDDEN_IMPORTERS) {
    const matches = findByPrefix(prefix).filter((f) => {
        if (prefix === 'CommunityScreen-') {
            return !f.startsWith('CommunityScreenHost-') && !f.startsWith('CommunityScreenContent-');
        }
        return true;
    });
    if (matches.length === 0) {
        failures.push(`missing importer chunk ${prefix}*.js`);
        continue;
    }
    for (const file of matches) {
        const deps = staticImports(file);
        const dirty = deps.filter((d) => FORBIDDEN_PIPELINE.test(d));
        if (dirty.length) {
            failures.push(`${file} statically imports ${dirty.join(', ')}`);
        }
    }
}

const persistFiles = files.filter((f) => f.startsWith('execution-dashboard-persist-pipeline-'));
let persistImporters = 0;
if (persistFiles.length) {
    const persistSet = new Set(persistFiles);
    for (const file of files) {
        if (persistSet.has(file)) continue;
        if (staticImports(file).some((d) => persistSet.has(d))) persistImporters += 1;
    }
}

const communityChunks = findByPrefix('CommunityScreen-').filter(
    (f) => !f.startsWith('CommunityScreenHost-') && !f.startsWith('CommunityScreenContent-'),
);
for (const file of communityChunks) {
    const deps = staticImports(file);
    const supabaseHits = deps.filter(
        (d) => d.startsWith('vendor-supabase-') || d.startsWith('supabase-browser-client-'),
    );
    if (supabaseHits.length) {
        failures.push(`${file} statically imports ${supabaseHits.join(', ')}`);
    }
    const motionHits = deps.filter((d) => d.startsWith('vendor-motion-'));
    if (motionHits.length) {
        failures.push(`${file} statically imports ${motionHits.join(', ')}`);
    }
    const taxHits = deps.filter(
        (d) =>
            d.startsWith('lazyComponents-') ||
            d.startsWith('executionDashboardLoader-') ||
            d.startsWith('forumIntentWarm-'),
    );
    if (taxHits.length) {
        failures.push(`${file} statically imports ${taxHits.join(', ')}`);
    }
    const peekHits = deps.filter((d) => d.startsWith('lawyer-boot-peek-lite-'));
    if (peekHits.length) {
        console.log(
            `[first-open-shared-tax] watch ${file} still side-imports ${peekHits.join(', ')} (Rollup cycle)`,
        );
    }
}

const forumApiChunks = findByPrefix('forumApiService-');
for (const file of forumApiChunks) {
    const deps = staticImports(file);
    const heavyHits = deps.filter(
        (d) =>
            d.startsWith('forumApiNotifications-') ||
            d.startsWith('forumApiComments-') ||
            d.startsWith('forumApiSocial-') ||
            d.startsWith('notificationForumStorage-') ||
            d.startsWith('lawyer-boot-stores-'),
    );
    if (heavyHits.length) {
        failures.push(`${file} statically imports ${heavyHits.join(', ')}`);
    }
}

const secureApiChunks = findByPrefix('secure-api-client-');
for (const file of secureApiChunks) {
    const deps = staticImports(file);
    const supabaseHits = deps.filter(
        (d) => d.startsWith('vendor-supabase-') || d.startsWith('supabase-browser-client-'),
    );
    if (supabaseHits.length) {
        failures.push(`${file} statically imports ${supabaseHits.join(', ')}`);
    }
}

for (const prefix of WATCH_IMPORTERS) {
    const matches = findByPrefix(prefix).filter((f) => {
        if (prefix === 'CommunityScreen-') {
            return !f.startsWith('CommunityScreenHost-') && !f.startsWith('CommunityScreenContent-');
        }
        return true;
    });
    for (const file of matches) {
        const dirty = staticImports(file).filter((d) => FORBIDDEN_PIPELINE.test(d));
        if (dirty.length) {
            console.log(`[first-open-shared-tax] watch ${file} still imports ${dirty.length} pipeline chunk(s)`);
        }
    }
}

const hostChunks = findByPrefix('ScheduleTabHost-');
if (hostChunks.length === 0) {
    failures.push('missing importer chunk ScheduleTabHost-*.js');
} else {
    for (const file of hostChunks) {
        const mainHits = staticImports(file).filter((d) => d.startsWith('LawyerDashboardMainView-'));
        if (mainHits.length) {
            failures.push(`${file} statically imports ${mainHits.join(', ')}`);
        }
        const peekHits = staticImports(file).filter((d) => d.startsWith('lawyer-boot-peek-lite-'));
        if (peekHits.length) {
            console.log(
                `[first-open-shared-tax] watch ${file} still side-imports ${peekHits.join(', ')} (Rollup cycle)`,
            );
        }
    }
}

if (failures.length) {
    console.error('[first-open-shared-tax] FAIL');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}

console.log(
    `[first-open-shared-tax] OK — persist-pipeline importers=${persistImporters}`,
);
