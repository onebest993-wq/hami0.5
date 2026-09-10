#!/usr/bin/env node
/**
 * يرفض ضبط pointer-events على جذر المستند (<html>).
 *
 *   node scripts/guard-root-pointer-events.mjs
 *
 * السبب — قِيس لا فُرض: كان p7ChromeSnap في tearDownLitigationFloatingState يكتب
 * `pointer-events: none` على documentElement ولا يُعيدها. فكل سطحٍ لا يُعيد تفعيل
 * pointer-events لنفسه صراحةً يُرسم كاملاً ولا يستجيب للمس — ومنه محضر المتابعة،
 * الذي كانت نقراته تنفذ إلى أرشيف التنفيذ تحته. أثر النداء الحيّ سمّى الكاتب،
 * وأربع مواصفات E2E كانت حمراء بسببه.
 *
 * تفاعليّة التراكبات تخصّ التراكب نفسه؛ لا يُكتم المستند كلّه لأجل قشرةٍ واحدة.
 *
 * والاسم المستعار هو الفخّ: العطل كُتب
 *     const root = document.documentElement;
 *     root.style.pointerEvents = 'none';
 * فبحثٌ عن `documentElement.style.pointerEvents` وحده كان سيُخطئه. لذلك يُعلَّم
 * الملف الذي يجمع بين لمس documentElement وكتابةِ pointer-events.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const SCAN_ROOTS = ['src', 'public'];

/** استثناءات — كلٌّ بسببٍ مكتوب، لا استثناء صامت */
const ALLOWLIST = new Set([
    /*
     * يُرجع documentElement إلى وضعه الطبيعي لا يكتمه — وهو نقيض العطل المحروس منه.
     * (لا مدخل فعلي اليوم؛ تُترك القائمة موثّقة لمن يحتاجها لاحقاً بسببٍ مكتوب.)
     */
]);

function walk(dir, out = []) {
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of entries) {
        const full = join(dir, name);
        let st;
        try {
            st = statSync(full);
        } catch {
            continue;
        }
        if (st.isDirectory()) {
            if (name === 'node_modules' || name === 'dist') continue;
            walk(full, out);
        } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

function stripCommentsAndStrings(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
}

/** كتابةُ pointer-events على تعبيرٍ بعينه — إسناداً أو setProperty */
function writesPointerEventsOn(source, expr) {
    const e = expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (
        new RegExp(`${e}\\s*\\.\\s*style\\s*\\.\\s*pointerEvents\\s*=`).test(source) ||
        new RegExp(
            `${e}\\s*\\.\\s*style\\s*\\.\\s*setProperty\\s*\\(\\s*['"\`]pointer-events['"\`]`,
        ).test(source) ||
        new RegExp(`${e}\\s*\\.\\s*setAttribute\\s*\\(\\s*['"\`]style['"\`]`).test(source)
    );
}

/** أسماءٌ مستعارة للجذر: const root = document.documentElement; */
function rootAliases(source) {
    const names = new Set();
    const re =
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\s*\.\s*documentElement\b/g;
    let m;
    while ((m = re.exec(source)) !== null) names.add(m[1]);
    return names;
}

const hits = [];
for (const rootRel of SCAN_ROOTS) {
    for (const file of walk(join(ROOT, rootRel))) {
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        if (ALLOWLIST.has(rel)) continue;
        if (/(^|\/)__tests__\//.test(rel)) continue;
        const source = stripCommentsAndStrings(readFileSync(file, 'utf8'));
        if (!/document\s*\.\s*documentElement/.test(source)) continue;

        const targets = ['document.documentElement', ...rootAliases(source)];
        const offending = targets.filter((t) => writesPointerEventsOn(source, t));
        if (offending.length) hits.push(`${rel}  (${offending.join(', ')})`);
    }
}

if (hits.length) {
    console.error(
        '[root pointer-events guard] FAIL — a file both touches document.documentElement and writes pointer-events.',
    );
    console.error('  اكتم التراكب نفسه، لا المستند. وإن كان الملفّ بريئاً فأضفه إلى ALLOWLIST بسببٍ مكتوب:');
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
}

console.log('[root pointer-events guard] OK — no pointer-events writes alongside document.documentElement');
