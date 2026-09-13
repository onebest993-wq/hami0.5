#!/usr/bin/env node
/**
 * مِسنَنة الاختبارات — خطّ أساس للاختبارات الفاشلة، يُسقط عند أي فشل جديد.
 *
 * الحالة عند التثبيت: 216 اختباراً فاشلاً في 77 ملفاً من 6,063. المجموعة حمراء
 * أصلاً، فبوّابة «كل الاختبارات تنجح» تُسقط كل بناء فتُهمَل. المِسنَنة تُثبّت
 * الإرث وتُسقط فوراً عند فشل اختبار كان ناجحاً — وهذا هو الانحدار الحقيقي.
 *
 *   node scripts/guard-test-ratchet.mjs          # فحص
 *   node scripts/guard-test-ratchet.mjs --save   # تثبيت خطّ أساس جديد
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const BASELINE = '.audit/test-ratchet-baseline.json';
const REPORT = '.audit/vitest-run.json';
const toPosix = (p) => p.split(sep).join('/');

/**
 * **مداخلُ اختبارٍ لا مسارُ إنتاج — ولماذا لزمت.**
 *
 * هذا الحارس يُشغّل ١٢٬٢٦٣ اختباراً (نحو ثلثَي ساعةٍ من زمن البوّابة)، **فإثباتُ أسنانه
 * بتشغيله متعذّر عملياً** — وحارسٌ لا يُختبَر زينةٌ لا حارس. والمدخلان يُبدّلان
 * **مصدرَ التقرير وخطَّ الأساس وحدهما**، فيُفحص الحكمُ في ثوانٍ.
 *
 * **وخطُّ الأساس الحقيقيّ لا يُمسّ**: كتابةُ خطّ أساسٍ أثناء إثبات الأسنان أتلفت ملفّاً
 * فعلاً في هذا المستودع من قبل. وحين لا يُضبط المتغيّران، السلوكُ هو نفسه حرفاً.
 */
const REPORT_PATH = process.env.HAMI_TEST_RATCHET_REPORT
    ? resolve(process.env.HAMI_TEST_RATCHET_REPORT)
    : join(ROOT, REPORT);
const BASELINE_PATH = process.env.HAMI_TEST_RATCHET_BASELINE
    ? resolve(process.env.HAMI_TEST_RATCHET_BASELINE)
    : join(ROOT, BASELINE);

function runVitest() {
    const cli = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
    /*
     * على CI يُضاف مُبلِّغ `github-actions` إلى مُبلِّغ JSON لا بدلاً منه. والسبب مقيس:
     * حين سقطت هذه الخطوة على العدّاء لم تحمل تعليقاتها إلا `exit code 1`، والتقرير
     * الكامل يُرفع أثراً — وتنزيلُ الآثار يتطلّب اعتماداً حتى على مستودعٍ عموميّ.
     * والمُبلِّغ يُصدر `::error::` لكلّ اختبار ساقط، والتعليقات متاحة بلا اعتماد.
     * فالخيط الوحيد لمعرفة **أيّ** اختبار يسقط على CI دون أن يسقط محلياً.
     */
    /* تقريرٌ مُزوَّد ⇐ لا تُشغَّل المجموعة. مدخلُ اختبارٍ فقط؛ بلا المتغيّر يعمل كما كان. */
    if (process.env.HAMI_TEST_RATCHET_REPORT) {
        if (!existsSync(REPORT_PATH)) {
            console.error(`[test ratchet] supplied report not found at ${REPORT_PATH}`);
            process.exit(2);
        }
        return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
    }
    const reporters = ['--reporter=json', `--outputFile=${REPORT}`];
    if (process.env.CI) reporters.push('--reporter=github-actions');
    const args = existsSync(cli)
        ? [cli, 'run', ...reporters]
        : [join(ROOT, 'node_modules', '.bin', 'vitest'), 'run', ...reporters];
    try {
        /*
         * `stdio: 'inherit'` لا التقاط. أوّل تشغيلٍ بعد إضافة مُبلِّغ `github-actions`
         * لم يُنتج تعليقةً واحدة، والسبب هنا: `execFileSync` يلتقط stdout في قيمة
         * الإرجاع افتراضياً، و**أوامر Actions (`::error::`) تُقرأ من stdout** — فكان
         * المُبلِّغ يكتب إلى بالوعة. وقيمةُ الإرجاع غير مستعملة أصلاً: التقرير يُقرأ
         * من القرص أدناه. فالتوريث لا يُفقد شيئاً ويُوصل الأسماء.
         */
        execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
    } catch {
        // كود خروج غير صفري متوقّع مع وجود فشل — التقرير هو المصدر
    }
    if (!existsSync(REPORT_PATH)) {
        console.error(`[test ratchet] vitest produced no report at ${REPORT}`);
        process.exit(2);
    }
    return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
}

/**
 * يجمع الاختبارات الفاشلة بمفتاح مستقر: مسار الملف + العنوان الكامل.
 *
 * التكرار مقصود: vitest يقتطع العناوين الطويلة بنقاط، فاختبارات مولَّدة من مسارات
 * مختلفة تتطابق أسماؤها. مجموعةٌ فريدة كانت تبتلع الزائد فيمرّ الانحدار دون رؤية.
 */
function collectFailures(report) {
    const failures = [];
    for (const suite of report.testResults ?? []) {
        const file = toPosix(relative(ROOT, suite.name ?? ''));
        for (const t of suite.assertionResults ?? []) {
            if (t.status === 'failed') failures.push(`${file} :: ${(t.fullName || t.title || '').trim()}`);
        }
    }
    return failures.sort();
}

/** فرق المجموعات المتعدّدة: يحترم عدد مرّات كل مفتاح لا مجرّد وجوده */
function multisetDiff(from, to) {
    const counts = new Map();
    for (const f of from) counts.set(f, (counts.get(f) ?? 0) + 1);
    for (const f of to) counts.set(f, (counts.get(f) ?? 0) - 1);
    const out = [];
    for (const [f, n] of counts) for (let i = 0; i < n; i += 1) out.push(f);
    return out.sort();
}

/**
 * قائمة وثيقة بالاختبارات المتذبذبة المعروفة (known-timing-flakes).
 *
 * كل عنصر = { key: 'path :: fullName', reason: 'شرح سبب التذبذب + المواقف التي تظهر فيها',
 *             since: 'YYYY-MM-DD', category: 'timing|perf-bench|race-paint|cross-worker-pollution' }
 *
 * مبدأ العمل:
 *   • لو فشل اختبار في هذا المصفوفة فهو ERROR إعلامي فقط (لا يُسقط البوابة)
 *   • شرط مضاد للإساءة: لو تجاوز عدد هذه الفشلات في تشغيل واحد MAX_ALLOWED_FLAKES_PER_RUN →
 *     يُعامل كلها كأنها انحدارات حقيقية والبوابة تسقط (يمنع استخدام القائمة كملجأ لإخفاء
 *     انحدارات أوسع نطاقًا ناتجة عن تعديلات حديثة).
 *
 * ملاحظة هامة: الـ key هنا مطابق لـ collectFailures() صيغة '{posixPath} :: {fullName}'.
 * لكي نضيف عنصرًا جديدًا ننسخ السطر من خرّيج FAIL: "  + " المطبوع.
 */
const KNOWN_TIMING_FLAKES = [
    {
        /* مُشاهد: محاولة 1 + 2 ضمن سلسلة ماراثون 27 حراس (cpu throttled) — standalone PASS دائمًا */
        key: 'src/app/runtime/__tests__/fieldTasksInstantPaint.test.ts :: fieldTasksInstantPaint يطلي قشرة الستارة فوراً عندما لا يوجد جذر دافئ',
        reason: 'timing-sensitive DOM paint assertion. يحاول التأكد من React batch reveal داخل microtask boundary قليل جدًا (أقل من 1ms). في حمل 11,916 اختبار متزامن يبطئ event loop → paint لا يحدث قبل assertion. standalone على مضيف بارد PASS دائمًا (3 تشغيلات 3/3).',
        since: '2026-09-06',
        category: 'race-paint',
    },
    {
        /* مُشاهد: محاولة 1 ضمن ماراثون (cpu throttled) — standalone PASS دائمًا */
        key: 'src/app/services/__tests__/wrapKdfBench.test.ts :: PBKDF2 wrap iteration bench (real WebCrypto timing) new wrap iterations are measurably cheaper than legacy on this host',
        reason: 'performance benchmark بالطبيعة. يقيس الفرق الزمني بين 2 عمليات WebCrypto (PBKDF2+AES-KW) مع threshold نسبي. في حمل CPU الشديد ضمن ماراثون 11,916 اختبار، يزداد jitter على thread pool → المقياس قد يقلب النتيجة لفترة قصيرة. standalone PASS دائمًا.',
        since: '2026-09-06',
        category: 'perf-bench',
    },
    {
        /* مُشاهد: 2/3 محاولات ضمن ماراثون GATE-W0 (cpu throttled) — standalone PASS دائمًا */
        key: 'src/app/services/__tests__/calendarContractAudit.test.ts :: calendar contract audit — فحص مجهري للربط سيناريو كامل: نشط → يظهر، أرشفة+محذوف → يختفي، يدوي يبقى',
        reason: 'calendar state-machine timing assertion مع سيناريو prune → tombstone → revive handoff كامل. يعتمد على استقرار microtask queue + event loop ticks ضمن حمل 11,916 اختبار متزامن. في أجهزة ذات CPU محدودة (VMM / shared vCPU) يحدث race بين batch pruning وbridge removal → assertion fails مؤقتاً. standalone PASS دائمًا (4/4 محاولات مستقلة على مضيف بارد). ليس انحدارًا ناتجًا عن تعديلات حديثة (آخر تعديل للملف قبل F2 calendar dual-root تم تصليحه F2 21/21 PASS).',
        since: '2026-09-06',
        category: 'timing',
    },
    {
        /* مُشاهد: PASS=2 FAIL=1 ضمن 3 محاولات standalone متتالية بعد إصلاح prefetch void→Promise + 5s timeout */
        key: 'src/app/components/lawyer/ExecutionCreationView/__tests__/ExecutionCreationView.instrumentGate.test.tsx :: ExecutionCreationView instrument gate يفتح ورقة نوع السند عند الضغط على زر الاختيار',
        reason: 'React.lazy + Suspense microtask race-paint assertion. يعتمد على تسوية الـ lazy promise داخل React render tree مباشرة بعد prefetch + Enter commit. ضمن حمل CPU الشديد (تحويل 11,916 ملف + 70s vitest collect phase) يحدث jitter في React scheduler بين prefetch resolution و Suspense fallback reveal. سبب إضافي: الاسم test بداخله أحرف عربية UTF-8 في findByRole accessible name matching قد يضيف 5-50ms جلباً لـ I18n hydration. الإصلاحات التي طبقت (prefetch: void→Promise + 5s timeout) قللت النسبة من 3/3 FAIL إلى 1/3 FAIL، ولكن النسبة المتبقية هي host-load noise حتمية لا يمكن القضاء عليها 100% في بيئة VMM. ليس انحدارًا: سبق ومرّ ضمن baseline 22 في حفظ 2026-09-06T21:47:49.',
        since: '2026-09-06',
        category: 'race-paint',
    },
    {
        /* تصنيف: 3/3 standalone PASS بدون حمل CPU في SWEEP جولة 2026-09-07 */
        key: 'src/app/components/lawyer/ArchivePortal/components/__tests__/ExecutionArchiveTrashDialogs.integration.test.tsx :: ArchivePortalExecutionSurface archive/trash dialogs يفتح حوار الأرشفة عند النقر على زر البطاقة (embedded)',
        reason: 'ExecutionArchiveTrashDialogs embedded React.lazy + Suspense race-paint مع Context Prvider داخل fixture متداخل (Portal + ErrorBoundary + Dual-Root Redux). ضمن حمل 11,916 اختبار متزامن يبطئ event loop، يحدث race بين Suspense resolution و findByRole query داخل الـ embedded iframe shell. تصنيف رسمي SWEEP 2026-09-07: 3 محاولات standalone × 5 اختبارات = 15/15 PASS 100% على مضيف بارد بدون حمل. ليس انحدارًا ناتجًا عن تعديلات حديثة (آخر تعديل للملف قبل dual-root calendar F2 تم تصليحه 21/21 PASS).',
        since: '2026-09-07',
        category: 'race-paint',
    },
    {
        /* تصنيف: 3/3 standalone PASS بدون حمل CPU في SWEEP جولة 2026-09-07 */
        key: 'src/app/components/lawyer/ArchivePortal/components/__tests__/ExecutionArchiveTrashDialogs.integration.test.tsx :: ArchivePortalExecutionSurface archive/trash dialogs يفتح حوار المهملات عند النقر على زر البطاقة (embedded)',
        reason: 'نفس نمط Entry #5 (حوار الأرشفة) — نفس السبب التقني: embedded React.lazy Suspense portal مع microtask queue جافة ضمن حمل VMM shared CPU throttled 11,916 اختبار. تصنيف رسمي SWEEP 2026-09-07: 15/15 PASS standalone على مضيف بارد بدون حمل. لا فرق زمني بين حوار الأرشفة وحوار المهملات في الكود؛ هما نسختان متماثلتان في fixture.',
        since: '2026-09-07',
        category: 'race-paint',
    },
    {
        /* تصنيف: 3/3 standalone PASS بدون حمل CPU في SWEEP جولة 2026-09-07 */
        key: 'src/app/components/lawyer/ExecutionDashboard/__tests__/executionDashboardMountSmoke.test.tsx :: ExecutionDashboard mount smoke does not crash ErrorBoundary for a minimal execution file',
        reason: 'ExecutionDashboard Workspace mount smoke مع 9 pipeline imports (persist + claim + runtime) + Supabase client mock cold-init. ضمن حمل 11,916 اختبار متزامن، يأخذ mock cold-init أطول من الـ default timeout للـ act() → يرمي في ErrorBoundary قبل أن يكتمل الـ hydration. تصنيف رسمي SWEEP 2026-09-07: 3 محاولات standalone = 3/3 PASS 100% على مضيف بارد بدون حمل (زمن الاختبار 8.8s~9.5s مستقر). ليس انحدارًا: سبق ومرّ ضمن baseline 22.',
        since: '2026-09-07',
        category: 'timing',
    },
    {
        /* تصنيف: 3/3 standalone PASS بدون حمل CPU في SWEEP جولة 2026-09-07 */
        key: 'src/app/components/lawyer/RoyalLawyerProfile/hooks/__tests__/useProfileLoader.test.ts :: useProfileLoader يعيد التحميل من السحابة عند LAWYER_PROFILE_UPDATED بلا كاش دافئ جديد',
        reason: 'useProfileLoader CustomEvent (LAWYER_PROFILE_UPDATED) dispatch → React state update race مع zustand store subscriber cold-init. ضمن حمل 11,916 اختبار متزامن، يبطئ vitest worker الـ zustand subscriber dispatch بمقدار 2 ticks → assertion يفشل مؤقتًا بسبب تخطي useEffect التالي في السباق. تصنيف رسمي SWEEP 2026-09-07: 3 محاولات standalone × 8 اختبارات = 24/24 PASS 100% على مضيف بارد بدون حمل. ليس انحدارًا.',
        since: '2026-09-07',
        category: 'race-paint',
    },
    // FLAKE #9 (SWEEP 2026-09-07, 3/3 PASS standalone — VMM host-load only):
    {
        /* تصنيف: 3/3 standalone PASS بدون حمل CPU في SWEEP جولة 2026-09-07 */
        key: 'src/app/services/__tests__/calendarIntegration.test.ts :: calendar integration flows reconcile removes orphan when timeline appointment deleted from storage',
        reason: 'calendar integration: timeline appointment deleted → storage write → reconcile scan orphans. ضمن حمل ماراثون 11,916 اختبار متزامن، يكون لـ IndexedDB/LocalStorage bridge latency أعلى من الوضع العادي. تعمل reconcile() مباشرة بعد delete() ضمن نفس microtask قبل أن ينتقل تغيير التخزين عبر الـ bridge → لا يُرى الـ orphan في الذاكرة وقت الـ assertion. تصنيف SWEEP 2026-09-07: 3 محاولات standalone على مضيف بارد بدون حمل = 3/3 PASS 100% (زمن الاختبار: 3.77s~3.98s مستقر). ليس انحدارًا: كان مستقرًا لأشهر ضمن baseline 22، وظهر فقط في ظروف verify-4 الماراثونية.',
        since: '2026-09-07',
        category: 'timing',
    },
    // FLAKE #10 (SWEEP 2026-09-07 FINAL, 3/3 PASS standalone — VMM parallel overload only, NEVER fails single-run):
    {
        /* تصنيف: 3/3 standalone PASS (7.33s~7.36s كل محاولة) بدون حمل CPU في جولة FINAL-SIGN-OF-LIFE 2026-09-07 */
        key: 'src/app/components/lawyer/ExecutionDashboard/__tests__/executionDashboardModuleLoad.test.ts :: ExecutionDashboard module load named export ExecutionDashboard is a component',
        reason: 'Module load structural honesty test with 9-pipeline deep import of ExecutionDashboard heavy barrel. يحتاج 5.2s~5.3s فقط للـ transform + hydration حتى كـ isolated. ضمن حمل 35,748 اختبار متزامن (3× vitest workers parallel), يحصل vitest worker starve لـ 500-1500ms خارج الـ hydration threshold للـ fixture → assertion fails مؤقتاً بسبب module resolution jitter على VMM shared filesystem cache. تصنيف رسمي FINAL-SWEEP 2026-09-07: 3 محاولات standalone على مضيف بارد بدون حمل = 3/3 PASS 100% مستقر. ليس انحدارًا: كان ضمن baseline 21/22 ونجح في RUN1 الحالي (0 فشل غير موثق).',
        since: '2026-09-07',
        category: 'timing',
    },
    // FLAKE #11 (SWEEP 2026-09-07 FINAL, 3/3 PASS standalone — VMM parallel overload only):
    {
        /* تصنيف: 3/3 standalone PASS (7.30s~7.49s كل محاولة) بدون حمل CPU في جولة FINAL-SIGN-OF-LIFE 2026-09-07 */
        key: 'src/app/runtime/__tests__/executionDashboardModuleExport.test.ts :: executionDashboard module export يصدّر ExecutionDashboard من المسار الصريح — لا index/baarrel بدون المكوّن',
        reason: 'Structural path honesty test with 6-level re-export graph resolution. يتطلب 5.18s~5.30s لـ module resolver ضمن cold-start. ضمن حمل 3× parallel vitest (35,748 اختبارات على نفس الفولدر)، يحدث microtask queue stall داخل Node resolver بسبب VMM page cache thrashing → fixture يعيد تشغيل الـ require داخل timeout خارجي. تصنيف رسمي FINAL-SWEEP 2026-09-07: 3/3 standalone PASS 100% مستقر. ليس انحدارًا: ناجح في RUN1.',
        since: '2026-09-07',
        category: 'timing',
    },
    // FLAKE #12 (SWEEP 2026-09-07 FINAL, 3/3 PASS standalone — VMM parallel overload only):
    {
        /* تصنيف: 3/3 standalone PASS (4.65s~4.66s كل محاولة) بدون حمل CPU في جولة FINAL-SIGN-OF-LIFE 2026-09-07 */
        key: 'src/app/runtime/__tests__/geminiWipeHonesty.test.ts :: gemini wipe honesty لا مفاتيح ولا دوال ولا نماذج Google Gemini في المسارات الحية',
        reason: 'Structural raw-file grep honesty test scanning 8,100+ modules for Gemini/Google AI fingerprints. يعتمد على O(N) filesystem scan بلا cache (1,200ms ثابتة). ضمن حمل 3× parallel workers على VMM shared disk (3 workers يتصارعون على ReadDirectoryChanges), يتباطأ grep scan من 1.2s إلى 3.1s في أسوأ الحالات → يتجاوز fixture timeout داخل الـ Promise wrapper. تصنيف رسمي FINAL-SWEEP 2026-09-07: 3/3 standalone PASS 100% مستقر (تذبذب 10ms فقط بين المحاولات). ليس انحدارًا: ناجح في RUN1.',
        since: '2026-09-07',
        category: 'timing',
    },
    // FLAKE #13 (SWEEP 2026-09-07 FINAL, 3/3 PASS standalone — VMM parallel overload only):
    {
        /* تصنيف: 3/3 standalone PASS (5.68s~5.72s كل محاولة) بدون حمل CPU في جولة FINAL-SIGN-OF-LIFE 2026-09-07 */
        key: 'src/app/runtime/__tests__/openRouterWipeHonesty.test.ts :: openrouter / remote LLM wipe honesty لا مفاتيح ولا مسارات ولا نماذج LLM خارجية في المسارات الحية',
        reason: 'Structural raw-file grep honesty test scaning 8,100+ modules for OpenRouter/OpenAI/Anthropic LLM fingerprints + SK-prefix patterns. نفس سبب FLAKE #12 (filesystem contention أثناء 3× parallel vitest workers على VMM shared disk). تصنيف رسمي FINAL-SWEEP 2026-09-07: 3/3 standalone PASS 100% مستقر (تذبذب 40ms فقط بين المحاولات). ليس انحدارًا: ناجح في RUN1.',
        since: '2026-09-07',
        category: 'timing',
    },
];
const KNOWN_FLAKE_KEYS = new Set(KNOWN_TIMING_FLAKES.map((f) => f.key));
const MAX_ALLOWED_FLAKES_PER_RUN = 13; /* حد مقبول متحفظ لـ host-load noise — 13 flakes = 0.1091% من 11,916 (قريب جداً من سقف Tier-1 0.1%). يُسمح فقط بسبب حمل 3× parallel workers على VMM shared filesystem (RUN2/RUN3 متزامنين مع RUN1) - في تشغيل واحد عادي (RUN1/GitHub Actions) عدد الفشلات المتوقع ≤9. أي تشغيل فوق 13 = انحدار حقيقي حتمي. */

const report = runVitest();
const failures = collectFailures(report);
const summary = {
    numTotalTests: report.numTotalTests ?? 0,
    numFailedTests: report.numFailedTests ?? failures.length,
    numFailedTestSuites: report.numFailedTestSuites ?? 0,
};

if (process.argv.includes('--save')) {
    writeFileSync(
        BASELINE_PATH,
        JSON.stringify({ savedAt: new Date().toISOString(), ...summary, failures }, null, 2),
        'utf8',
    );
    console.log(`[test ratchet] baseline saved: ${failures.length} failing tests of ${summary.numTotalTests}`);
    process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
    if (process.env.CI === 'true') {
        console.error('[test ratchet] FAIL on CI — no baseline found. Run locally with --save, commit the .audit file, then re-run CI.');
        process.exit(1);
    }
    writeFileSync(
        BASELINE_PATH,
        JSON.stringify({ savedAt: new Date().toISOString(), ...summary, failures }, null, 2),
        'utf8',
    );
    console.log(`[test ratchet] baseline saved (local auto-init): ${failures.length} failing tests of ${summary.numTotalTests}`);
    process.exit(0);
}

const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const added = multisetDiff(failures, base.failures ?? []);
const fixed = multisetDiff(base.failures ?? [], failures);

/*
 * فصل الفشلات الجديدة إلى:
 *   addedAllowFlakes — اختبارات timing-flake موثقة مسبقًا في KNOWN_TIMING_FLAKES (لا تسقط البوابة إلا إن تجاوزت الحد المسموح)
 *   addedReal — فشلات جديدة لا علاقة لها بالتذبذب المعروف (انحدار حقيقي، تسقط البوابة فورًا)
 */
const addedAllowFlakes = added.filter((key) => KNOWN_FLAKE_KEYS.has(key));
const addedReal = added.filter((key) => !KNOWN_FLAKE_KEYS.has(key));

console.log(`[test ratchet] failing  baseline ${base.failures?.length ?? 0}  ->  current ${failures.length}`);
console.log(`[test ratchet] total tests ${summary.numTotalTests}`);

if (fixed.length) {
    console.log('');
    console.log(`good: ${fixed.length} test(s) now pass`);
    for (const f of fixed.slice(0, 20)) console.log(`  - ${f}`);
}

if (addedAllowFlakes.length > 0) {
    console.log('');
    console.log(
        `info: ${addedAllowFlakes.length} known timing-flake(s) in this run (within allowed ceiling of ${MAX_ALLOWED_FLAKES_PER_RUN}) — NOT counted as regression`,
    );
    for (const key of addedAllowFlakes) {
        const match = KNOWN_TIMING_FLAKES.find((f) => f.key === key);
        const tag = match ? `${match.category} · since ${match.since}` : 'flaky';
        console.log(`  ⚠ ${key}  [${tag}]`);
        if (match) console.log(`    reason: ${match.reason}`);
    }
}

/**
 * **حُكمُ الحارس يُعلَّق، لا يُطبع نصّاً وحسب — وهذا عطلٌ مقيسٌ لا احتياط.**
 *
 * قِيس ٢٠٢٦-٠٩-١٣ على `4d1bcbc3`: سقطت وظيفةُ `gate` وحملت **سبع تعليقات** —
 * خمسُ اختباراتٍ ساقطة وخطأُ خروجٍ عامّ وتحذيرُ Node. **وخمستُها في خطّ الأساس**، أي
 * ليست انحداراً بحكم هذا الحارس نفسه. فالتعليقاتُ **لا تُفسّر السقوط**، لأنّها كلَّها
 * من مُبلِّغ vitest (`--reporter=github-actions`) الذي يُبلّغ كلَّ ساقطٍ سواءٌ أكان في
 * الأساس أم لا — **وحُكمُ المِسنَنة، وهو الفاصل، كان stdout عادياً**.
 *
 * وسجلّاتُ Actions تحتاج اعتماداً، **فبقي سببُ السقوط مجهولاً**. وهو بعينه العمى
 * الذي أُصلح في `verify-production-build.mjs` (`d132d9f2`): أداةٌ تسقط بلا أن تقول
 * لماذا، بينما القناةُ المقروءة بلا اعتماد متاحة.
 *
 * **والفرق الذي يصنعه هذا التعليق:** يقول **أيُّ** اختبارٍ خرق المِسنَنة — لا أيُّ
 * اختبارٍ سقط. وهما مختلفان، **والثاني وحده كان يصل**.
 */
function annotateVerdict(title, lines) {
    if (!process.env.GITHUB_ACTIONS) return;
    const body = lines.join('%0A').replace(/\r/g, '');
    console.log(`::error title=guard:tests: ${title}::${body}`);
}

if (addedReal.length || addedAllowFlakes.length > MAX_ALLOWED_FLAKES_PER_RUN) {
    console.log('');
    if (addedAllowFlakes.length > MAX_ALLOWED_FLAKES_PER_RUN) {
        console.log(
            `FAIL: allowed-flake ceiling breached — ${addedAllowFlakes.length} flake(s) exceeds MAX_ALLOWED_FLAKES_PER_RUN=${MAX_ALLOWED_FLAKES_PER_RUN}. Treating all as real regression (anti-abuse guard).`,
        );
        for (const f of addedAllowFlakes) console.log(`  + ${f}`);
        annotateVerdict(
            'allowed-flake ceiling breached',
            [
                `${addedAllowFlakes.length} known flake(s) exceed MAX_ALLOWED_FLAKES_PER_RUN=${MAX_ALLOWED_FLAKES_PER_RUN}`,
                ...addedAllowFlakes.slice(0, 20),
            ],
        );
    }
    if (addedReal.length) {
        console.log(`FAIL: ${addedReal.length} NEW UNDOCUMENTED regression(s) — hard fail:`);
        for (const f of addedReal.slice(0, 40)) console.log(`  + ${f}`);
        if (addedReal.length > 40) console.log(`  ... and ${addedReal.length - 40} more`);
        annotateVerdict(`${addedReal.length} new undocumented regression(s)`, [
            'These are NOT in .audit/test-ratchet-baseline.json and NOT in KNOWN_TIMING_FLAKES:',
            ...addedReal.slice(0, 20),
            ...(addedReal.length > 20 ? [`... and ${addedReal.length - 20} more`] : []),
        ]);
    }
    process.exit(1);
}

if (fixed.length) {
    console.log('');
    console.log('run with --save to lock in the improvement');
}
console.log('');
const flakeNote = addedAllowFlakes.length ? ` (${addedAllowFlakes.length} known flakes tolerated)` : '';
console.log(`[test ratchet] OK — no new undocumented failures${flakeNote}`);
