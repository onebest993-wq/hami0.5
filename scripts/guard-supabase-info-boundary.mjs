#!/usr/bin/env node
/**
 * `src/utils/supabase/info.ts` قيمتان مودَعتان في المستودع لمشروع تطوير.
 *
 * `clientEnv.ts` يرفض السقوط عليهما في الإنتاج، لكن الرفض لا يعني شيئاً لمن
 * يستوردهما مباشرةً: وُجدت ثلاث وحدات تبني روابط دوال الحافة من `projectId`
 * وترسل `publicAnonKey` — فتخاطب مشروع التطوير في الإنتاج مهما ضُبطت البيئة،
 * وتشحن المفتاح المودَع إلى كل مستخدم. المشكلة ليست في الاحتياطي بل في وجود
 * باب جانبي يلتفّ حول المُحلِّل.
 *
 * الباب مغلق هنا: `info.ts` يُستورد من `devFallbackConfig.ts` وحده.
 *
 *   node scripts/guard-supabase-info-boundary.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

/** الجسر الوحيد المسموح — وفرع `PROD !== true` وحده يستدعيه */
const ALLOWED = new Set(['src/utils/supabase/devFallbackConfig.ts']);

/** الاختبارات تقارن الاحتياطي بالمُحلَّل؛ منعها يُفقد التغطية لا يزيد الأمان */
const TEST_FILE = /(\.test\.tsx?|\.spec\.tsx?|[\\/]__tests__[\\/])/;

const INFO_IMPORT =
    /from\s+['"](?:@\/utils\/supabase\/info|(?:\.{1,2}\/)+(?:utils\/supabase\/)?info)['"]|import\(\s*['"](?:@\/utils\/supabase\/info)['"]/;

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'node_modules') continue;
            walk(full, out);
        } else if (/\.(ts|tsx)$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

const offenders = [];

for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (rel === 'src/utils/supabase/info.ts') continue;
    if (ALLOWED.has(rel) || TEST_FILE.test(rel)) continue;

    const source = readFileSync(file, 'utf8');
    if (INFO_IMPORT.test(source)) offenders.push(rel);
}

if (offenders.length) {
    console.error('[supabase info boundary] FAIL — استيراد مباشر لاحتياطي التطوير:');
    for (const o of offenders) console.error(`  - ${o}`);
    console.error(
        '[supabase info boundary] استعمل resolveClientSupabaseConfig / supabaseFunctionUrl / clientAnonKey من @/utils/supabase/clientEnv'
    );
    process.exit(1);
}

console.log('[supabase info boundary] OK — info.ts محصور في devFallbackConfig وحده');
