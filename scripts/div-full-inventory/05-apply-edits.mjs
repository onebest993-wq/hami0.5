import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const AUDIT_DIR = join(REPO_ROOT, '.audit', 'div-full-inventory');

function parseCSV(p) {
    const raw = readFileSync(p, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const RE = /("([^"]*)"),?|([^,]+),?/g;
    return lines.map(l => {
        const row = []; let m; RE.lastIndex = 0;
        while ((m = RE.exec(l)) !== null) row.push(m[2] ?? m[3] ?? '');
        return row;
    });
}

const INLINE_ZVF_RESET = `appearance:none;background:transparent;border:none;padding:0;margin:0;font:inherit;color:inherit;cursor:inherit;text-align:inherit;line-height:inherit;letter-spacing:inherit;-webkit-tap-highlight-color:transparent`;

const remediedCandidates = parseCSV(join(AUDIT_DIR, 'remedied-candidates.csv')).slice(1);
const divFinal = parseCSV(join(AUDIT_DIR, 'classification-final.csv')).slice(1);
const swapFinal = parseCSV(join(AUDIT_DIR, 'swap-final.csv')).slice(1);

// ==============================
// 1. THROW PREFIX EDITS (25)
// ==============================
const throwEdits = remediedCandidates
    .filter(r => r[4] === 'throw-prefix-ZVF')
    .map(r => ({ file: r[1], line: Number(r[2]), domain: r[5], opid: r[6] }));

const fileMap = new Map();
for (const e of throwEdits) {
    if (!fileMap.has(e.file)) fileMap.set(e.file, readFileSync(join(REPO_ROOT, e.file), 'utf8').split('\n'));
    const arr = fileMap.get(e.file);
    const idx = e.line - 1;
    let original = arr[idx] || '';
    const m = original.match(/(throw\s+new\s+(?:Error|RangeError|TypeError)\s*\(\s*)(['"])([^'"]{0,120})\2/i);
    if (!m) continue;
    const prefix = `[${e.domain}:${e.opid}] `;
    const msg = m[3];
    if (msg.startsWith('[') || msg.includes(':') && msg.includes('[')) continue;
    const replaced = original.slice(0, m.index) + m[1] + m[2] + prefix + msg + m[2] + original.slice(m.index + m[0].length);
    arr[idx] = replaced;
}

// ==============================
// 2. DIV → BUTTON with ZVF reset (7 NEEDS-FIX interactive)
// ==============================
const buttonConvCandidates = divFinal.filter(r => r[3] === 'NEEDS-FIX-interactive-div-not-button').slice(0, 7);
const buttonConvEdits = buttonConvCandidates.map(r => ({ file: r[0], line: Number(r[1]) }));

const BUTTON_CHANGELOG = [];
for (const e of buttonConvEdits) {
    if (!fileMap.has(e.file)) fileMap.set(e.file, readFileSync(join(REPO_ROOT, e.file), 'utf8').split('\n'));
    const arr = fileMap.get(e.file);
    const idx = e.line - 1;
    let original = arr[idx] || '';
    const mDivOpen = original.match(/<div(\s[^>]*?)?\/?>/);
    if (!mDivOpen) continue;
    const attrsBefore = mDivOpen[1] || '';
    let attrsFixed = attrsBefore;
    // add type="button" and style={...INLINE_ZVF_RESET} at end of attrs (before >)
    const styleAlready = /style\s*=\s*\{/.test(attrsFixed);
    const typeAlready = /\stype\s*=\s*"/.test(attrsFixed);
    if (!typeAlready) attrsFixed = attrsFixed + ' type="button"';
    if (!styleAlready) attrsFixed = attrsFixed + ` style={${JSON.stringify(Object.fromEntries(INLINE_ZVF_RESET.split(';').filter(Boolean).map(s=>s.split(':').map(p=>p.trim()))))}}`;
    // Fix opening tag from <div ...> to <button ...>
    const newOpen = original.slice(0, mDivOpen.index) + `<button${attrsFixed}>`;
    arr[idx] = newOpen;
    // Need to find matching closing </div> in subsequent lines (within next 30)
    let depth = 1, closeIdx = idx;
    for (let k = idx + 1; k < Math.min(arr.length, idx + 40); k++) {
        const opens = (arr[k].match(/<div[\s>]/g) || []).length + (arr[k].match(/<button[\s>]/g) || []).length;
        const closes = (arr[k].match(/<\/div>/g) || []).length + (arr[k].match(/<\/button>/g) || []).length;
        depth -= closes; depth += opens;
        if (depth <= 0 && arr[k].includes('</div>')) { closeIdx = k; break; }
    }
    if (closeIdx > idx) {
        arr[closeIdx] = arr[closeIdx].replace('</div>', '</button>');
    }
    BUTTON_CHANGELOG.push([e.file, e.line, 'div→button[type=button]+ZVF-style-inline', closeIdx > idx ? 'closed' : 'NO-CLOSE-FOUND-DO-NOT-USE']);
}

// ==============================
// 3. SEMANTIC swaps (2 div→section)
// ==============================
const swapSwaps = swapFinal.filter(r => r[5].startsWith('SWAP-TO-')).slice(0, 3);
const SWAP_CHANGELOG = [];
for (const r of swapSwaps) {
    const file = r[0]; const line = Number(r[1]); const target = r[5].replace('SWAP-TO-', '').toLowerCase();
    if (!['header','nav','section','footer','aside','article','tabpanel','dialog'].includes(target)) continue;
    if (!fileMap.has(file)) fileMap.set(file, readFileSync(join(REPO_ROOT, file), 'utf8').split('\n'));
    const arr = fileMap.get(file);
    const idx = line - 1;
    const original = arr[idx];
    const mOpen = original.match(/<div(\s[^>]*?)?\/?>/);
    if (!mOpen) continue;
    const attrs = mOpen[1] || '';
    arr[idx] = original.slice(0, mOpen.index) + `<${target}${attrs}>`;
    // find closing within 60 lines
    let depth = 1, closeIdx = -1;
    for (let k = idx + 1; k < Math.min(arr.length, idx + 60); k++) {
        const opens = (arr[k].match(/<div[\s>]/g) || []).length;
        const closes = (arr[k].match(/<\/div>/g) || []).length;
        depth -= closes; depth += opens;
        if (depth <= 0 && arr[k].includes('</div>')) { closeIdx = k; break; }
    }
    if (closeIdx > idx) arr[closeIdx] = arr[closeIdx].replace('</div>', `</${target}>`);
    SWAP_CHANGELOG.push([file, line, `div→${target}`, closeIdx > idx ? 'closed' : 'NO-CLOSE']);
}

// ==============================
// COMMIT ALL
// ==============================
let threw = false, wrote = 0;
for (const [file, arr] of fileMap.entries()) {
    const abs = join(REPO_ROOT, file);
    try {
        writeFileSync(abs, arr.join('\n'), 'utf8'); wrote++;
    } catch (e) {
        process.stdout.write(`WRITE FAIL ${file} ${e}\n`); threw = true;
    }
}
process.stdout.write(`
EDIT-APPLY SUMMARY
==================
Throw-prefix ZVF applied : ${throwEdits.length}
Button conversions       : ${BUTTON_CHANGELOG.length}  ${BUTTON_CHANGELOG.map(b=>b[3]).filter(x=>x!=='closed').length ? 'WARN: close tags missing' : ''}
Semantic swaps           : ${SWAP_CHANGELOG.length}  ${SWAP_CHANGELOG.map(b=>b[3]).filter(x=>x!=='closed').length ? 'WARN: close tags missing' : ''}
Files written            : ${wrote}

BUTTON CONVERSIONS:
${BUTTON_CHANGELOG.map(b=>'  '+b.join(' | ')).join('\n')}
SEMANTIC SWAPS:
${SWAP_CHANGELOG.map(s=>'  '+s.join(' | ')).join('\n')}
`);
process.exit(threw ? 2 : 0);
