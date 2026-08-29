#!/usr/bin/env node
/**
 * حارس لا يُستدعى ليس حارساً — هذا العطل حدث هنا فعلاً: كان في المستودع حارسان
 * مكتوبان بالكامل لا يشغّلهما CI ولا أمر npm، وحين شُغِّلا أول مرّة كشفا أن مسار
 * إنتاج Netlify يفتح الواجهة بلا تسجيل دخول. المشكلة لم تكن في الحارس بل في
 * غياب ما يضمن وصله بالبوّابة.
 *
 * هذا الفحص يقلب المعادلة: كل `guard:*` في package.json يجب أن يظهر في سير عمل
 * GitHub، وإلا فُقد قصده صامتاً. الاستثناء يجب أن يُكتب هنا باسمه وسببه.
 *
 *   node scripts/guard-ci-covers-guards.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WORKFLOWS = join(ROOT, '.github/workflows');

/** أوامر لا يصحّ تشغيلها في CI — لكل واحد سبب مكتوب */
const NOT_FOR_CI = new Map([
    ['guard:baseline', 'يكتب خطوط الأساس بدل فحصها — تشغيله في CI يمحو المِسنَنة'],
]);

function collectScripts() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    return Object.keys(pkg.scripts ?? {}).filter((name) => name.startsWith('guard:'));
}

function collectWorkflowText() {
    let text = '';
    for (const name of readdirSync(WORKFLOWS)) {
        if (!/\.ya?ml$/.test(name)) continue;
        text += readFileSync(join(WORKFLOWS, name), 'utf8');
    }
    return text;
}

function collectGateWave0() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const wave0 = String(pkg.scripts?.['gate:wave0'] ?? '');
    return new Set([...wave0.matchAll(/npm run (guard:[a-z0-9:-]+)/g)].map((m) => m[1]));
}

const scripts = collectScripts();
const workflows = collectWorkflowText();
const wave0 = collectGateWave0();

const missingFromCi = [];
const missingFromWave0 = [];

for (const script of scripts) {
    if (NOT_FOR_CI.has(script)) continue;

    // يُعدّ مغطّى إن استُدعي مباشرةً أو عبر مجموعة تضمّه
    const direct = new RegExp(`npm run ${script.replace(/:/g, ':')}(\\s|$)`, 'm').test(workflows);
    const viaWave0 = wave0.has(script) && /npm run gate:wave0(\s|$)/m.test(workflows);
    if (!direct && !viaWave0) missingFromCi.push(script);

    /*
     * كل فحص مصدر ينتمي إلى wave0 ليكون تشغيله محلياً أمراً واحداً. المستثنى هو
     * ما يحتاج `dist` أو شبكة: لا معنى لطلبه قبل بناء.
     */
    const needsBuild = /dist|bundle|cold-entry:dist|boot-critical-weight|lawyer-inner-weight/.test(script);
    if (!needsBuild && !wave0.has(script) && !NOT_FOR_CI.has(script)) {
        missingFromWave0.push(script);
    }
}

let failed = false;

if (missingFromCi.length) {
    failed = true;
    console.error('[ci covers guards] FAIL — حرّاس لا يشغّلهم أي سير عمل:');
    for (const s of missingFromCi) console.error(`  - ${s}`);
}

if (missingFromWave0.length) {
    failed = true;
    console.error('[ci covers guards] FAIL — حرّاس مصدر خارج gate:wave0:');
    for (const s of missingFromWave0) console.error(`  - ${s}`);
}

if (failed) {
    console.error('[ci covers guards] أضِف الأمر إلى .github/workflows وgate:wave0، أو سجّله في NOT_FOR_CI بسببه.');
    process.exit(1);
}

console.log(
    `[ci covers guards] OK — ${scripts.length - NOT_FOR_CI.size} حارساً مربوطاً بالبوّابة، ${NOT_FOR_CI.size} مستثنى بسبب مكتوب`
);
