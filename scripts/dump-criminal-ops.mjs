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
            old_string: c.input.old_string,
            new_string: c.input.new_string,
        });
    }
}

fs.mkdirSync('.cursor/criminal-replay', { recursive: true });
ops.forEach((op, i) => {
    fs.writeFileSync(`.cursor/criminal-replay/${String(i).padStart(2, '0')}-L${op.lineNo}-old.ts`, op.old_string);
    fs.writeFileSync(`.cursor/criminal-replay/${String(i).padStart(2, '0')}-L${op.lineNo}-new.ts`, op.new_string);
});
console.log('dumped', ops.length);
