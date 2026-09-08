#!/usr/bin/env node
/**
 * مزامنة Android مع حزمة ويب صالحة للتجربة على الجهاز.
 * يحقن VITE_SUPABASE_* + VITE_SHELL_AUTH_OPEN + VITE_ENABLE_CLOUD_SYNC من info.ts/افتراضيات الجهاز.
 *
 * Usage: node scripts/cap-sync-android.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nativeViteBuildEnv } from './e2e-build-env.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args, env = process.env) {
    const result = spawnSync(cmd, args, {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
        env,
    });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function mergeBuildEnv() {
    const injected = nativeViteBuildEnv();
    const merged = { ...process.env };
    for (const [key, value] of Object.entries(injected)) {
        const current = String(merged[key] ?? '').trim();
        if (!current) {
            merged[key] = value;
        }
    }
    if (!String(merged.VITE_BUILD_NATIVE ?? '').trim()) {
        merged.VITE_BUILD_NATIVE = 'true';
    }
    /*
     * تجربة الجهاز — بطلب صريح، ولا تُفرض أبداً.
     *
     * كان السطر `merged.VITE_SHELL_AUTH_OPEN = 'true'` بلا شرط، وحده من بين كل
     * متغيّرات هذه الدالة (البقية تحترم `if (!current)` فلا تكتب فوق قيمة
     * موجودة). فكان يدهس `'false'` التي تضبطها `nativeViteBuildEnv` عمداً
     * وتصفها بـ«بوابة دخول مغلقة افتراضياً — إنتاج-مثل»، ويدهس كذلك أي قيمة
     * يضبطها الباني صراحةً في بيئته.
     *
     * النتيجة: كل APK يُنتجه الأمر الموثَّق الوحيد `npm run cap:build:android`
     * كان يفتح لوحة المحامي كاملةً بلا شاشة دخول. لا توجد طريقة لبناء نسخة
     * مصادَقة عبر هذا المسار.
     */
    if (String(process.env.HAMI_NATIVE_OPEN_SHELL ?? '').trim() === '1') {
        merged.VITE_SHELL_AUTH_OPEN = 'true';
        console.warn(
            '\n[cap-sync-android] ⚠ HAMI_NATIVE_OPEN_SHELL=1 — بناء تجريبي بلا بوابة دخول.\n' +
                '                     لا يُوزَّع ولا يُرفع إلى متجر.\n',
        );
    }
    if (!String(merged.VITE_ENABLE_CLOUD_SYNC ?? '').trim()) {
        merged.VITE_ENABLE_CLOUD_SYNC = 'true';
    }
    /*
     * الأصلي ليس استثناءً من المراقبة.
     *
     * كان الإطفاء قسرياً هنا حتى مع ضبط DSN، فتخرج حزمة الهاتف — وهي المنتج
     * الفعلي — بلا أي إبلاغ عن أعطالها: لا Crashlytics على الجانب الأصلي ولا
     * Sentry على جانب الويب. الغياب يبقى الافتراض حين لا DSN (سياسة البناء
     * تُطفئه من تلقائها)، أما وجود DSN فيعني أن الإبلاغ مقصود.
     */
    if (!String(merged.VITE_SENTRY_DSN ?? '').trim() && !String(merged.VITE_ENABLE_SENTRY ?? '').trim()) {
        merged.VITE_ENABLE_SENTRY = 'false';
    }
    if (!String(merged.VITE_PDF_MINIMAL_ASSETS ?? '').trim()) {
        merged.VITE_PDF_MINIMAL_ASSETS = 'true';
    }
    return merged;
}

console.log('[cap-sync-android] prepare + build (Supabase env) + cap sync android …\n');

run('node', ['scripts/ensure-capacitor-cli-tar-compat.mjs']);
run('node', ['scripts/patch-android-proguard-compat.mjs']);

/*
 * هل جاءت هوية Supabase من البيئة أم من الاحتياطي المودَع في info.ts؟
 * يُقرأ قبل الدمج — بعده يستحيل التمييز.
 */
const supabaseUrlFromEnv = Boolean(String(process.env.VITE_SUPABASE_URL ?? '').trim());

const buildEnv = mergeBuildEnv();
if (!buildEnv.VITE_SUPABASE_URL || !buildEnv.VITE_SUPABASE_ANON_KEY) {
    console.error('[cap-sync-android] BLOCKED — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing after merge');
    process.exit(1);
}

/*
 * `nativeViteBuildEnv` يسحب `e2eViteBuildEnv` الذي يقرأ مشروع التطوير من
 * `src/utils/supabase/info.ts`. مفيد للتجربة، وكارثي إن وصل جهاز محامٍ:
 * التطبيق يتحدّث إلى مشروع التطوير لا الإنتاج. لا يُوقف البناء — قد تكون
 * التجربة مقصودة — لكنه لا يمرّ صامتاً بعد اليوم.
 */
if (!supabaseUrlFromEnv) {
    console.warn(
        '\n[cap-sync-android] ⚠ هوية Supabase من الاحتياطي المودَع (src/utils/supabase/info.ts)\n' +
            '                     أي أن هذا البناء يتحدّث إلى مشروع التطوير لا الإنتاج.\n' +
            '                     للإنتاج: اضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في البيئة.\n',
    );
}

/*
 * أصل الـAPI: عطل صامت على الجهاز ما لم يُقَل هنا.
 *
 * أصل الوثيقة داخل WebView هو `https://localhost` (androidScheme: 'https' بلا
 * server.url)، وهو خادم محلي للأصول المحزومة. فكل مسار نسبي `/api/*` يرتدّ ٤٠٤ —
 * وهي ١٩ عائلة مسارات: الدخول والمنتدى ومشاركة القضايا وطلبات المساعدة ورفع
 * الملفات وkv-proxy والإشعارات وغيرها. لا استثناء.
 *
 * ولا يُوقَف البناء: حزمة تجربة على جهاز مشروعة، والتحذير أصدق من المنع هنا.
 * لكنه لا يمرّ صامتاً، لأن الصمت هو ما جعل هذا يبقى مخفياً — كان
 * VITE_SHELL_AUTH_OPEN مفروضاً 'true' فلا يبلغ أحد شاشة الدخول أصلاً.
 */
const apiOriginRaw = String(buildEnv.VITE_API_ORIGIN ?? '').trim();
let apiOriginState = 'missing';
if (apiOriginRaw) {
    try {
        const parsed = new URL(apiOriginRaw);
        apiOriginState =
            parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : 'invalid';
    } catch {
        apiOriginState = 'invalid';
    }
}
if (apiOriginState === 'missing' || apiOriginState === 'invalid') {
    console.warn(
        `\n[cap-sync-android] ⚠ VITE_API_ORIGIN ${apiOriginState === 'invalid' ? 'قيمته غير صالحة' : 'غير مضبوط'} — الحزمة لن تصل إلى أي طرف خلفي.\n` +
            '                     نداءات /api/* النسبية تُحلّ على https://localhost داخل WebView\n' +
            '                     فترتدّ ٤٠٤: الدخول والمنتدى ومشاركة القضايا ورفع الملفات وkv-proxy.\n' +
            '                     اضبطه على أصل الإنتاج المطلق، مثل https://app.example.com\n',
    );
}

const shellOpen = buildEnv.VITE_SHELL_AUTH_OPEN ?? 'false';
console.log(
    `[cap-sync-android] build env: VITE_SUPABASE_URL=${String(buildEnv.VITE_SUPABASE_URL).slice(0, 32)}… shellOpen=${shellOpen} supabaseFrom=${supabaseUrlFromEnv ? 'env' : 'info.ts(dev)'} apiOrigin=${apiOriginState} bffAuth=${buildEnv.VITE_BFF_AUTH ?? '0'} cloudSync=${buildEnv.VITE_ENABLE_CLOUD_SYNC ?? '0'} sentry=${buildEnv.VITE_ENABLE_SENTRY ?? '0'} pdfMinimal=${buildEnv.VITE_PDF_MINIMAL_ASSETS ?? '0'}\n`,
);

run('npm', ['run', 'build'], buildEnv);
run('node', ['scripts/assert-native-capacitor-dist.mjs']);
run('node', ['scripts/guard-dist-no-hq-runtime.mjs']);

const distIndex = path.join(ROOT, 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
    console.error('[cap-sync-android] dist/index.html missing after build');
    process.exit(1);
}

const distHtml = fs.readFileSync(distIndex, 'utf8');
if (!distHtml.includes('data-hami-boot-guard-ms=')) {
    console.error('[cap-sync-android] BLOCKED — dist/index.html missing data-hami-boot-guard-ms (hamiBootScriptOrder plugin)');
    process.exit(1);
}
if (buildEnv.VITE_SHELL_AUTH_OPEN === 'true' && !distHtml.includes('data-hami-demo-boot="1"')) {
    console.error('[cap-sync-android] BLOCKED — trial build missing data-hami-demo-boot on dist/index.html');
    process.exit(1);
}

run('npx', ['cap', 'sync', 'android']);

if (fs.existsSync(path.join(ROOT, 'android', 'app', 'build.gradle'))) {
    run('node', ['scripts/apply-android-native-ready.mjs']);
}

run('node', ['scripts/patch-android-compose.mjs']);

run('node', ['scripts/patch-android-proguard-compat.mjs']);
run('node', ['scripts/patch-android-gradle-hygiene.mjs']);
run('node', ['scripts/patch-capacitor-agp9-kotlin.mjs']);
run('node', ['scripts/patch-android-app-version.mjs']);

console.log('\n[cap-sync-android] OK — Run from Android Studio or: npm run cap:install:android\n');
