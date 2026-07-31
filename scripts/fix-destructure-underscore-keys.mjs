/**
 * Fix bad unused-var prefixer damage inside destructuring only:
 *   { _foo, bar }  →  { foo: _foo, bar }
 * Skips import/export braces and object literals.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = 'src';
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (exts.has(path.extname(e.name))) acc.push(p);
    }
    return acc;
}

function matchBrace(src, openIdx) {
    let depth = 0;
    let inStr = null;
    let inLineComment = false;
    let inBlockComment = false;
    for (let j = openIdx; j < src.length; j++) {
        const ch = src[j];
        const next = src[j + 1];
        if (inLineComment) {
            if (ch === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                j++;
            }
            continue;
        }
        if (inStr) {
            if (ch === '\\') {
                j++;
                continue;
            }
            if (ch === inStr) inStr = null;
            continue;
        }
        if (ch === '/' && next === '/') {
            inLineComment = true;
            j++;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            j++;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            inStr = ch;
            continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return j;
        }
    }
    return -1;
}

function fixDestructureBlock(block) {
    let changed = 0;
    const fixed = block.replace(
        /(^|[{\s,])(_[A-Za-z_$][\w$]*)(\s*)(?=[,}])/g,
        (match, pre, name, ws) => {
            const bare = name.slice(1);
            if (!bare || bare.startsWith('_')) return match;
            // Avoid converting already-correct leftovers that are values somehow
            changed++;
            return `${pre}${bare}:${ws}${name}`;
        },
    );
    return { fixed, changed };
}

function fixFile(src) {
    let out = '';
    let i = 0;
    let total = 0;
    const re = /\b(const|let|var)\s*\{/g;
    // Also function params: ( {  or , {
    const paramRe = /([(,]\s*)\{/g;

    // Collect ranges to fix (open, close)
    const ranges = [];
    let m;
    while ((m = re.exec(src))) {
        const open = m.index + m[0].length - 1;
        const close = matchBrace(src, open);
        if (close > open) ranges.push([open, close]);
    }
    while ((m = paramRe.exec(src))) {
        // skip if this is part of const/let/var already captured
        const open = m.index + m[0].length - 1;
        const before = src.slice(Math.max(0, open - 12), open);
        if (/\b(const|let|var)\s*$/.test(before)) continue;
        // skip import/export
        const lineStart = src.lastIndexOf('\n', open) + 1;
        const linePrefix = src.slice(lineStart, open);
        if (/^\s*(import|export)\b/.test(linePrefix)) continue;
        const close = matchBrace(src, open);
        if (close > open) ranges.push([open, close]);
    }

    ranges.sort((a, b) => a[0] - b[0]);
    // dedupe overlapping
    const uniq = [];
    for (const r of ranges) {
        if (uniq.length && r[0] <= uniq[uniq.length - 1][1]) continue;
        uniq.push(r);
    }

    let cursor = 0;
    for (const [open, close] of uniq) {
        out += src.slice(cursor, open);
        const block = src.slice(open, close + 1);
        const { fixed, changed } = fixDestructureBlock(block);
        total += changed;
        out += fixed;
        cursor = close + 1;
    }
    out += src.slice(cursor);
    return { out, total };
}

let files = 0;
let grand = 0;
for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!/_\w/.test(src)) continue;
    const { out, total } = fixFile(src);
    if (total > 0 && out !== src) {
        fs.writeFileSync(file, out);
        files++;
        grand += total;
        console.log(`${total}\t${file}`);
    }
}
console.log(JSON.stringify({ files, total: grand }));
