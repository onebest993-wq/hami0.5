#!/usr/bin/env node
/**
 * ثوابت البناء المحقونة — عقد ثلاثي بين ثلاثة ملفات لا يفحصه شيء:
 *
 *   vite.config.mts (define)  ←→  src/vite-env.d.ts (declare)  ←→  الاستعمال في src/
 *
 * `declare const __X__: string` يُرضي المُصرِّف تماماً، فلو غاب اسمه عن `define`
 * بقي المعرِّف حرّاً في الحزمة النهائية وسقط أول استدعاء بـReferenceError — في
 * الإنتاج وحده، لأن الفحص اللغوي لا يرى وقت البناء. والعكس صحيح: مفتاح في
 * `define` بلا `declare` يجبر كل موضع استعمال على تجاوز الأنواع.
 *
 *   node scripts/guard-injected-globals.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const VITE_CONFIG = join(ROOT, 'vite.config.mts');
const ENV_TYPES = join(ROOT, 'src/vite-env.d.ts');

/** أسماء يوفّرها Vite/أدوات المطوّر نفسها — ليست عقدنا */
const EXTERNAL_GLOBALS = new Set(['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__vite__mapDeps']);

function readDefineKeys() {
    const source = readFileSync(VITE_CONFIG, 'utf8');
    const block = /\n\s*define\s*:\s*\{([\s\S]*?)\n\s*\},/.exec(source);
    if (!block) {
        console.error('[injected globals] FAIL — تعذّر العثور على كتلة define في vite.config.mts');
        process.exit(1);
    }
    return new Set([...block[1].matchAll(/^\s*(__[A-Z0-9_]+__)\s*:/gm)].map((m) => m[1]));
}

function readDeclaredKeys() {
    const source = readFileSync(ENV_TYPES, 'utf8');
    return new Set([...source.matchAll(/declare\s+const\s+(__[A-Z0-9_]+__)\s*:/g)].map((m) => m[1]));
}

/** التعليقات والنصوص تحمل الاسم بلا أن تستدعيه — تُزال قبل البحث عن معرِّف حرّ */
function stripNonCode(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/.*$/gm, ' ')
        .replace(/`(?:\\[\s\S]|[^\\`])*`/g, '``')
        .replace(/'(?:\\.|[^\\'])*'/g, "''")
        .replace(/"(?:\\.|[^\\"])*"/g, '""');
}

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'node_modules' || name === '__tests__') continue;
            walk(full, out);
        } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

const defined = readDefineKeys();
const declared = readDeclaredKeys();
const referenced = new Map();

for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const code = stripNonCode(readFileSync(file, 'utf8'));

    // معرِّف مُعرَّف محلياً في نفس الملف ليس ثابت بناء
    const localNames = new Set(
        [...code.matchAll(/\b(?:const|let|var|function)\s+(__[A-Z0-9_]+__)\b/g)].map((m) => m[1])
    );

    for (const match of code.matchAll(/(^|[^.\w$])(__[A-Z0-9_]+__)\b/gm)) {
        const name = match[2];
        if (localNames.has(name) || EXTERNAL_GLOBALS.has(name)) continue;
        // مفتاح في كائن أو نوع (`__X__?: unknown`) وصفٌ لخاصية لا استدعاء لمعرِّف حرّ
        const after = code.slice(match.index + match[0].length);
        if (/^\s*\??\s*:/.test(after)) continue;
        if (!referenced.has(name)) referenced.set(name, new Set());
        referenced.get(name).add(rel);
    }
}

const problems = [];

for (const [name, files] of referenced) {
    if (!defined.has(name)) {
        problems.push(`${name} مُستعمل بلا define في vite.config.mts — ${[...files].join(', ')}`);
    }
    if (!declared.has(name)) {
        problems.push(`${name} مُستعمل بلا declare في src/vite-env.d.ts — ${[...files].join(', ')}`);
    }
}

for (const name of defined) {
    if (!declared.has(name)) {
        problems.push(`${name} في define بلا declare في src/vite-env.d.ts`);
    }
    if (!referenced.has(name)) {
        problems.push(`${name} في define ولا يستعمله أحد — حَقْن ميت`);
    }
}

if (problems.length) {
    console.error('[injected globals] FAIL — عقد ثوابت البناء مكسور:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}

console.log(
    `[injected globals] OK — ${defined.size} ثابت بناء: define ⟷ declare ⟷ استعمال متطابقة`
);
