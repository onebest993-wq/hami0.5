import fs from 'node:fs';

const transcript =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl';

let lineNo = 0;
for (const line of fs.readFileSync(transcript, 'utf8').split(/\n/)) {
    lineNo++;
    if (!line.includes('purgeCriminalCaseRecord')) continue;
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
        if (!(c.input?.path || '').includes('criminalCasesStorage')) continue;
        for (const key of ['old_string', 'new_string']) {
            const t = c.input?.[key];
            if (typeof t === 'string' && t.includes('purgeCriminalCaseRecord')) {
                fs.writeFileSync(`.cursor/criminal-replay/purge-${lineNo}-${key}.ts`, t);
                console.log('wrote', lineNo, key, t.length);
            }
        }
    }
}
