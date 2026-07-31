import fs from 'node:fs';
import path from 'node:path';

const root =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts';
const targetSuffix = process.argv[2] || 'utils/criminalCasesStorage.ts';
const dest = process.argv[3] || 'src/app/utils/criminalCasesStorage.ts';

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (e.name.endsWith('.jsonl')) acc.push(p);
    }
    return acc;
}

function normalizePath(p = '') {
    return p.replace(/\\/g, '/');
}

function endsWithTarget(p = '') {
    return normalizePath(p).endsWith(targetSuffix);
}

const ops = [];
for (const f of walk(root)) {
    const lines = fs.readFileSync(f, 'utf8').split(/\n/);
    let lineNo = 0;
    for (const line of lines) {
        lineNo++;
        if (!line.includes(path.basename(targetSuffix))) continue;
        let j;
        try {
            j = JSON.parse(line);
        } catch {
            continue;
        }
        const content = j?.message?.content;
        if (!Array.isArray(content)) continue;
        for (const c of content) {
            if (c.type !== 'tool_use') continue;
            if (c.name !== 'Write' && c.name !== 'StrReplace') continue;
            if (!endsWithTarget(c.input?.path || '')) continue;
            ops.push({
                file: f,
                lineNo,
                name: c.name,
                contents: c.input?.contents,
                old_string: c.input?.old_string,
                new_string: c.input?.new_string,
            });
        }
    }
}

// chronological by transcript mtime then line order
ops.sort((a, b) => {
    const ma = fs.statSync(a.file).mtimeMs;
    const mb = fs.statSync(b.file).mtimeMs;
    if (ma !== mb) return ma - mb;
    return a.lineNo - b.lineNo;
});

let text = null;
let applied = 0;
let failed = 0;
for (const op of ops) {
    if (op.name === 'Write' && typeof op.contents === 'string') {
        text = op.contents;
        applied++;
        continue;
    }
    if (op.name === 'StrReplace' && text != null) {
        if (typeof op.old_string !== 'string' || typeof op.new_string !== 'string') {
            failed++;
            continue;
        }
        if (!text.includes(op.old_string)) {
            failed++;
            continue;
        }
        text = text.replace(op.old_string, op.new_string);
        applied++;
    }
}

if (text == null) {
    console.error('no reconstructable content');
    process.exit(1);
}
fs.writeFileSync(dest, text);
console.log(
    JSON.stringify(
        {
            dest,
            bytes: Buffer.byteLength(text),
            ops: ops.length,
            applied,
            failed,
            hasByIdSync: text.includes('loadCriminalCaseRecordByIdSync'),
            hasCardIndex: text.includes('loadCriminalCasesCardIndexSync'),
            hasPurge: text.includes('purgeCriminalCaseRecord'),
        },
        null,
        2,
    ),
);
