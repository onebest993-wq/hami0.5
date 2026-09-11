#!/usr/bin/env node
/**
 * متغيّرات بناء Vite لبوابات E2E — يحقن هوية Supabase من info.ts (تطوير/اختبار)
 * حتى لا يرفض clientEnv الإقلاع في حزمة production preview.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INFO_PATH = path.join(ROOT, 'src/utils/supabase/info.ts');

/** @returns {{ projectId: string; anonKey: string; url: string }} */
export function readDevSupabaseFromInfoTs() {
    const src = fs.readFileSync(INFO_PATH, 'utf8');
    const projectId = src.match(/export const projectId = "([^"]+)"/)?.[1];
    const anonKey = src.match(/export const publicAnonKey = "([^"]+)"/)?.[1];
    if (!projectId || !anonKey) {
        throw new Error('[e2e-build-env] could not parse projectId/publicAnonKey from info.ts');
    }
    return {
        projectId,
        anonKey,
        url: `https://${projectId}.supabase.co`,
    };
}

export function hamiBootScriptFingerprint() {
    const boot = path.join(ROOT, 'public', 'hami-boot.js');
    return createHash('sha256').update(fs.readFileSync(boot)).digest('hex').slice(0, 16);
}

/**
 * بصمةُ **مُدخلات البناء** التي بُني منها `dist` — لا بصمةُ الالتزام.
 *
 * السبب مقيس: في ٢٠٢٦-٠٩-١١ أُرجع ملفّا إصلاحٍ إلى التزامٍ أقدم لتجربة A/B، ثمّ
 * بُني `dist`، ثمّ أُعيد الملفّان **بلا إعادة بناء**، وسُلّم ذلك الـ`dist` على أنّه
 * يمثّل `HEAD`. المواصفتان عليه: ٣ ساقطة/٦؛ وعلى بناءٍ من `HEAD`: ٩/٩. ولم يكن
 * `HEAD` قد تغيّر، فبصمة الالتزام وحدها كانت ستمرّ.
 * (`.audit/REVIEW_REPORT_2026-09-11.md` F1)
 *
 * **ولا تُستعمل تجزئةُ الالتزام نفسها** — جُرّبت أوّلاً فكانت تُبطل `dist` سليماً
 * تماماً بعد كلّ التزام وثائقي، فتفرض بناءً بلا سبب. البصمة الآن على **محتوى**
 * مسارات البناء: تجزئة شجرة git لكلٍّ منها (لا تتغيّر بالتزامٍ لا يمسّها) مع فرق
 * شجرة العمل عنها.
 */
export function sourceFingerprint() {
    const paths = ['src', 'vite.config.mts', 'index.html', 'hq.html', 'public'];
    const run = (args) => {
        try {
            return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        } catch {
            return '';
        }
    };
    /* تجزئة كائن الشجرة لكلّ مسار بناء — محتوىً لا تاريخ */
    const trees = paths.map((p) => `${p}:${run(['rev-parse', `HEAD:${p}`]).trim()}`).join('\n');
    /* والفرق عن HEAD في تلك المسارات — يشمل المرحَّل وغير المرحَّل */
    const diff = run(['diff', 'HEAD', '--', ...paths]);
    return {
        sourceDigest: createHash('sha256').update(trees).digest('hex').slice(0, 16),
        worktreeDigest: createHash('sha256').update(diff).digest('hex').slice(0, 16),
        worktreeDirty: diff.length > 0,
    };
}

/** علامات حزمة E2E داخل HTML — المصدر الوحيد للحقيقة */
export function e2eMarkersInHtml(html) {
    return {
        bootGuard: html.includes('data-hami-boot-guard-ms='),
        demoBoot: html.includes('data-hami-demo-boot="1"'),
    };
}

/**
 * هل `dist/` الحالي حزمة E2E فعلاً؟
 * يقرأ index.html لا الطابع — أي `npm run build` عادي يستبدل dist ويترك الطابع
 * يدّعي E2E، فتفشل البوابات لاحقاً ببوابة تسجيل دخول غامضة.
 */
export function distE2eMarkers() {
    const distIndex = path.join(ROOT, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) return { bootGuard: false, demoBoot: false };
    return e2eMarkersInHtml(fs.readFileSync(distIndex, 'utf8'));
}

/** @param {Record<string, string>} [overrides] */
export function e2eViteBuildEnv(overrides = {}) {
    const { url, anonKey } = readDevSupabaseFromInfoTs();
    return {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: anonKey,
        VITE_E2E: '1',
        VITE_SHELL_AUTH_OPEN: 'true',
        /* يطابق .env.local الإنتاجي للاختبار — مسار الشِل + بذرة المنتدى في authBoot */
        VITE_BFF_AUTH: 'true',
        ...overrides,
    };
}

/** بناء Capacitor — plugins أصلية + بوابة دخول مغلقة افتراضياً (إنتاج-مثل) */
export function nativeViteBuildEnv(overrides = {}) {
    return {
        ...e2eViteBuildEnv(),
        VITE_BUILD_NATIVE: 'true',
        VITE_E2E: '0',
        VITE_NATIVE_NOTIFICATION_SHEET: 'false',
        /* إظهار شاشة الدخول قبل اللوحة — E2E يبقي true عبر e2eViteBuildEnv إن لزم */
        VITE_SHELL_AUTH_OPEN: 'false',
        ...overrides,
    };
}
