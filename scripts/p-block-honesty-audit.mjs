import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const P_OPEN_RE = /<p(\s|>|\/)/i;
const BLOCK_TAGS = /<(div|section|article|header|footer|nav|aside|ul|ol|h[1-6]|figure|blockquote|pre|table|form|fieldset)(\s|\/|>)/i;

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const s = statSync(full);
        if (s.isDirectory()) walk(full, out);
        else if (full.endsWith('.tsx')) out.push(full);
    }
    return out;
}

function findRegexAt(s, re, start) {
    const m = s.slice(start).match(re);
    return m ? start + (m.index ?? 0) : -1;
}

function findMatchingClose(src, start, tag) {
    let depth = 1;
    let i = start;
    const openRe = new RegExp(`<${tag}(\\s|>|/)`, 'i');
    const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
    while (i < src.length) {
        const no = findRegexAt(src, openRe, i);
        const nc = findRegexAt(src, closeRe, i);
        if (nc === -1 && no === -1) return -1;
        if (nc !== -1 && (no === -1 || nc < no)) {
            depth--;
            if (depth === 0) return nc;
            i = nc + 1;
        } else if (no !== -1) {
            depth++;
            i = no + 1;
        } else break;
    }
    return -1;
}

function findPBlockViolations(file) {
    const src = readFileSync(file, 'utf8');
    const violations = [];
    let i = 0;
    while (i < src.length) {
        const pStart = findRegexAt(src, P_OPEN_RE, i);
        if (pStart === -1) break;
        const afterOpen = src.indexOf('>', pStart);
        if (afterOpen === -1) break;
        const pClose = findMatchingClose(src, afterOpen + 1, 'p');
        const inner = pClose !== -1 ? src.slice(afterOpen + 1, pClose) : src.slice(afterOpen + 1);
        const m = inner.match(BLOCK_TAGS);
        if (m) {
            const lineNo = src.slice(0, pStart).split('\n').length;
            violations.push({ line: lineNo, blockTag: m[1] });
        }
        i = pClose !== -1 ? pClose + 4 : src.length;
    }
    return violations;
}

const files = walk(SRC);
let badFiles = 0;
let totalViolations = 0;
for (const f of files) {
    const vs = findPBlockViolations(f);
    if (vs.length > 0) {
        badFiles++;
        totalViolations += vs.length;
        const rel = relative(ROOT, f).replace(/\\/g, '/');
        console.log(`${rel} => ${vs.length} violation(s): ${vs.map(v => `L${v.line} (<${v.blockTag}>)`).join(', ')}`);
    }
}

console.log(`\nSUMMARY: ${badFiles} files / ${totalViolations} real <p>-block violations across ${files.length} TSX files`);
process.exit(badFiles > 0 ? 2 : 0);
