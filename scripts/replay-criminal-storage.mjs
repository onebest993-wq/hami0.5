import fs from 'node:fs';
import { execSync } from 'node:child_process';

const transcript =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl';
const dest = 'src/app/utils/criminalCasesStorage.ts';
const targetSuffix = 'utils/criminalCasesStorage.ts';

function endsWithTarget(p = '') {
    return p.replace(/\\/g, '/').endsWith(targetSuffix);
}

const ops = [];
let lineNo = 0;
for (const line of fs.readFileSync(transcript, 'utf8').split(/\n/)) {
    lineNo++;
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
            lineNo,
            name: c.name,
            contents: c.input?.contents,
            old_string: c.input?.old_string,
            new_string: c.input?.new_string,
        });
    }
}

// Seed from earliest known short form in git history (or empty)
let text = '';
try {
    text = execSync('git show HEAD:src/app/utils/criminalCasesStorage.ts', {
        encoding: 'utf8',
    });
} catch {
    text = fs.readFileSync(dest, 'utf8');
}

const log = [];
for (const op of ops) {
    if (op.name === 'Write' && typeof op.contents === 'string') {
        text = op.contents;
        log.push(`L${op.lineNo} Write -> ${text.length}`);
        continue;
    }
    if (op.name === 'StrReplace') {
        const idx = text.indexOf(op.old_string);
        if (idx < 0) {
            // fuzzy: try if old_string is subset after normalizing line endings
            const norm = (s) => s.replace(/\r\n/g, '\n');
            const t2 = norm(text);
            const o2 = norm(op.old_string);
            const i2 = t2.indexOf(o2);
            if (i2 < 0) {
                log.push(`L${op.lineNo} FAIL oldLen=${op.old_string.length}`);
                continue;
            }
            text = t2.slice(0, i2) + norm(op.new_string) + t2.slice(i2 + o2.length);
            log.push(`L${op.lineNo} OK(norm) -> ${text.length}`);
            continue;
        }
        text = text.slice(0, idx) + op.new_string + text.slice(idx + op.old_string.length);
        log.push(`L${op.lineNo} OK -> ${text.length}`);
    }
}

fs.writeFileSync(dest, text);
fs.writeFileSync('.cursor/criminalCasesStorage.replay.log', log.join('\n'));
console.log(
    JSON.stringify(
        {
            bytes: Buffer.byteLength(text),
            hasByIdSync: text.includes('loadCriminalCaseRecordByIdSync'),
            hasCardIndex: text.includes('loadCriminalCasesCardIndexSync'),
            hasPurge: text.includes('purgeCriminalCaseRecord'),
            hasAsyncById: text.includes('loadCriminalCaseRecordByIdAsync'),
            ok: log.filter((l) => l.includes('OK')).length,
            fail: log.filter((l) => l.includes('FAIL')).length,
        },
        null,
        2,
    ),
);
