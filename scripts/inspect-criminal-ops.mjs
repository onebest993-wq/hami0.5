import fs from 'node:fs';

const transcript =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl';
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
        if (c.type !== 'tool_use' || c.name !== 'StrReplace') continue;
        if (!endsWithTarget(c.input?.path || '')) continue;
        ops.push({
            lineNo,
            oldLen: c.input?.old_string?.length ?? 0,
            newLen: c.input?.new_string?.length ?? 0,
            oldStart: (c.input?.old_string || '').slice(0, 80).replace(/\n/g, '\\n'),
            newHasById: (c.input?.new_string || '').includes('loadCriminalCaseRecordByIdSync'),
            oldIsFullish:
                /^(import |\/\/ @ts-nocheck|export const CRIMINAL_STORE_KEY)/.test(
                    c.input?.old_string || '',
                ) && (c.input?.old_string || '').length > 1500,
            newIsFullish:
                /^(import |\/\/ @ts-nocheck|export const CRIMINAL_STORE_KEY)/.test(
                    c.input?.new_string || '',
                ) && (c.input?.new_string || '').length > 1500,
        });
    }
}
console.log(JSON.stringify(ops, null, 2));
