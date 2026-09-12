/**
 * يفحص حجم chunks النهائية بعد البناء — manualChunks لا يضمن حداً أدنياً.
 * الاستخدام: node scripts/check-min-chunk-size.mjs [--fail]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');
const MIN_RAW_BYTES = 5 * 1024;
/**
 * حدّ انتهاكات micro-chunks غير المسموحة — يمنع تراجعاً جديداً دون حظر التقسيم المقصود.
 *
 * **٤٠ ← ٣٩٢ في ٢٠٢٦-٠٩-١٢، بإذن المالك الحرفي، والرقم مقيسٌ لا مُقدَّر:**
 * ٣٩٢ هو عددُ المخالفات في بناء الإنتاج يومَها — أي القفل عند المُقاس، وهو نمط
 * المِسنَنة نفسه في هذا المستودع (tsc ٩٥٦ · lint ١١ · dead exports ١٨٨٥): يمنع
 * الزيادة ولا يحظر ما هو قائم.
 *
 * **ولماذا كان ٤٠ بعيداً هكذا:** هذه الخطوة (٣٩ في `quality-gate.yml`) **لم تعمل على
 * العدّاء ولا مرّة** — كانت خلف خطوة اختباراتٍ ساقطة. فالرقم من عهدٍ سابق لاستراتيجية
 * التقطيع الحالية، ولم يره أحد يتقادم.
 *
 * **والقياس الذي يضع الرقم في حجمه** (٢٠٢٦-٠٩-١٢):
 *   ١٬٠٣٧ حزمة `js` · ٥٤٣ منها دون ٥ ك.ب = **٥٢٫٤٪ من الحزم و٩٫٨٪ من البايتات**
 *   **٥٣٩ من الـ٥٤٣ ليست من `manualChunks`** بل مولّدة من مواضع `import()`
 *   **وأوّل فتحة تجلب أربع حزم فقط (٢٥٤٫٥ ك.ب)، واحدةٌ منها دون ٥ ك.ب**
 * أي أنّ العدد أثرٌ مباشر لاستراتيجية التحميل الكسول المقصودة في هذا المنتج،
 * وليس كلفةً على الإقلاع.
 *
 * **وهذا الرقم علاجٌ مؤقّت لا إصلاح:** المقياس نفسه يعدّ خاصّيةً شاملة للحزمة بينما
 * الكلفة الحقيقية **عددُ الطلبات عند فتح قسمٍ واحد**. إعادةُ تشكيله متّفقٌ عليها مع
 * المالك كخطوةٍ تالية. وحتى تتمّ، القفل عند المُقاس يمنع الانحدار ولا يُسكت الحارس.
 */
const VIOLATION_BUDGET = 392;

/** facades وlazy loaders مقصودة صغيرة — لا تُحسب كفشل */
const ALLOWLIST_PREFIXES = [
    'index-',
    'runtime-notificationPanelLoader',
    'execution-dashboard-loader',
    'execution-dashboard-static-scope',
    'ExecutionDashboardCoreScopeSources',
    'deferred-app',
    'app-deferred-boot',
    'ExecutionDashboardHandlerCluster',
    'criminal-',
    'app-',
    'execution-',
    'LawyerDashboard',
    'CriminalDashboard',
    'profile',
    'homeTab',
    'community',
    'Vault',
    'quantum',
    'Smart',
    'waive',
    'schedule',
    'boot-',
];

/** أسماء مكوّنات/feature facades صغيرة مقصودة من manualChunks */
const ALLOWLIST_STEMS = new Set([
    'executionDashboardPortalLazy',
    'settingsSectionActiveContext',
    'DecisionsScopeFilterBar',
    'QuickActions',
    'dialog',
    'RadarOpenInstantChrome',
    'ForumMemberProfileOverlay',
    'AccountSection',
    'ForumMentionSuggestions',
    'EditableDockShell',
    'DecisionsCommandBar',
    'HomeDropZone',
    'LegalActionsMenu',
    'CaseLinkModal',
    'DossierSwitcher',
    'authProviderRuntime',
    'app-helpers',
    'LawyerDashboardCriminalOverlayEntry',
    'LawyerDashboardScheduleTab',
    'profileMediaService',
    'vaultBlobStore',
    'forumEditUtils',
    'calendarTombstones',
    'calendarPerfMetrics',
    'stageInit',
    'kvStoreAdmin',
    'partyRoleClassification',
    'executionLawArticleUtils',
    'forumPlumTheme',
    'thirdPartyFundsReceivedOutcomeUtils',
    'incidentalCaseLinking',
    'syncExecutorDecisionResolution',
    'LawyerBootShell',
    'notificationBootHydrator',
    'settingsInstantPaint',
    'calendarReconcileScheduler',
    'deferredBoot',
    'globalSearchIntentWarm',
    'globalSearchBootHydrator',
    'legalDeadlineEngine',
    'ScheduleTabHost',
    'ProfileMediaFrame',
    'storage-domain-keys',
    'dossier-storage-keys',
]);

function chunkStem(file) {
    return file.replace(/-[a-zA-Z0-9_]+\.js$/, '');
}

function isAllowlisted(file) {
    const stem = chunkStem(file);
    if (ALLOWLIST_STEMS.has(stem)) return true;
    if (ALLOWLIST_PREFIXES.some((p) => stem === p || stem.startsWith(p))) return true;
    if (
        /(Modal|Portal|Overlay|OverlayEntry|SheetHost|Tab|Panel|Hub|Grid|Chrome|Theme|Store|Utils|Service|Container|Surface|Bridge|Loader|Runtime|Entry)$/i.test(
            stem,
        )
    ) {
        return true;
    }
    return false;
}

if (!fs.existsSync(assetsDir)) {
    console.error('[check-min-chunk-size] dist/assets missing — run npm run build first');
    process.exit(1);
}

const failOnViolation = process.argv.includes('--fail');
const rows = fs
    .readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .map((file) => {
        const raw = fs.readFileSync(path.join(assetsDir, file));
        return { file, rawBytes: raw.length, rawKb: Math.round((raw.length / 1024) * 10) / 10 };
    });

const tiny = rows.filter((r) => r.rawBytes < MIN_RAW_BYTES && !isAllowlisted(r.file));
const allowlistedTiny = rows.filter((r) => r.rawBytes < MIN_RAW_BYTES && isAllowlisted(r.file));

console.log(`[check-min-chunk-size] total JS chunks: ${rows.length}`);
console.log(`[check-min-chunk-size] under 5 KB (allowlisted): ${allowlistedTiny.length}`);
console.log(`[check-min-chunk-size] under 5 KB (violations): ${tiny.length}`);

if (tiny.length > 0) {
    for (const r of tiny.sort((a, b) => a.rawBytes - b.rawBytes)) {
        console.log(`  ! ${r.rawKb} KB | ${r.file}`);
    }
    if (failOnViolation && tiny.length > VIOLATION_BUDGET) {
        console.error(
            `[check-min-chunk-size] BLOCKED: ${tiny.length} micro-chunks exceed budget (${VIOLATION_BUDGET})`,
        );
        process.exit(1);
    }
    if (failOnViolation) {
        console.log(
            `[check-min-chunk-size] OK — ${tiny.length} micro-chunk violation(s) within budget ${VIOLATION_BUDGET}`,
        );
    }
} else {
    console.log('[check-min-chunk-size] OK — no unallowlisted micro-chunks');
}

process.exit(0);
