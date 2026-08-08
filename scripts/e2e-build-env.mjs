#!/usr/bin/env node
/**
 * متغيّرات بناء Vite لبوابات E2E — يحقن هوية Supabase من info.ts (تطوير/اختبار)
 * حتى لا يرفض clientEnv الإقلاع في حزمة production preview.
 */
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

/** @param {Record<string, string>} [overrides] */
export function e2eViteBuildEnv(overrides = {}) {
    const { url, anonKey } = readDevSupabaseFromInfoTs();
    return {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: anonKey,
        VITE_E2E: '1',
        VITE_SHELL_AUTH_OPEN: 'true',
        ...overrides,
    };
}

/** بناء Capacitor — plugins أصلية (بيومتري، PrivacyScreen…) + واجهة مفتوحة للتطوير */
export function nativeViteBuildEnv(overrides = {}) {
    return {
        ...e2eViteBuildEnv(),
        VITE_BUILD_NATIVE: 'true',
        VITE_E2E: '0',
        /* يبقى VITE_SHELL_AUTH_OPEN=true من e2eViteBuildEnv — لا دخول في التطوير.
         * للإنتاج على الجهاز: مرّر VITE_SHELL_AUTH_OPEN=false صراحةً في البيئة. */
        ...overrides,
    };
}
