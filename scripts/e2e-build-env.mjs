#!/usr/bin/env node
/**
 * متغيّرات بناء Vite لبوابات E2E — يحقن هوية Supabase من info.ts (تطوير/اختبار)
 * حتى لا يرفض clientEnv الإقلاع في حزمة production preview.
 */
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
