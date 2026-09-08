import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const ROOT = process.cwd();
const files = process.argv.slice(2);

const BLOCK_TAGS = /<(div|section|article|header|footer|nav|aside|ul|ol|h[1-6]|figure|blockquote|pre|table|form|fieldset)(\s|\/|>)/i;

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
function findRegexAt(s, re, start) {
    const m = s.slice(start).match(re);
    return m ? start + (m.index ?? 0) : -1;
}

for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const lines = src.split('\n');
    let i = 0;
    while (i < src.length) {
        const pStart = src.indexOf('<p', i);
        if (pStart === -1) break;
        const afterOpen = src.indexOf('>', pStart);
        if (afterOpen === -1) break;
        const pClose = findMatchingClose(src, afterOpen + 1, 'p');
        const inner = pClose !== -1 ? src.slice(afterOpen + 1, pClose) : src.slice(afterOpen + 1);
        const m = inner.match(BLOCK_TAGS);
        if (m) {
            const pLine = src.slice(0, pStart).split('\n').length;
            const innerIdx = m.index ?? 0;
            const blockLine = pLine + inner.slice(0, innerIdx).split('\n').length - 1;
            const from = Math.max(0, pLine - 3);
            const to = Math.min(lines.length, blockLine + 4);
            console.log(`\n==== ${relative(ROOT, f).replace(/\\/g,'/')} :: <p>@L${pLine} — <${m[1]}>@L${blockLine} ====`);
            for (let k = from; k < to; k++) {
                const mark = k === pLine - 1 ? '>>P ' : k === blockLine - 1 ? '>>X ' : '    ';
                const n = String(k + 1).padStart(3, ' ');
                console.log(`${mark}${n}|${lines[k]}`);
            }
        }
        i = pClose !== -1 ? pClose + 4 : src.length;
    }
}
