import fs from 'node:fs';

const transcript =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl';

let lineNo = 0;
let i = 0;
for (const line of fs.readFileSync(transcript, 'utf8').split(/\n/)) {
    lineNo++;
    if (lineNo !== 126 && lineNo !== 224) continue;
    const j = JSON.parse(line);
    for (const c of j.message.content || []) {
        if (c.type !== 'tool_use' || c.name !== 'StrReplace') continue;
        if (!(c.input?.path || '').includes('criminalDashboardLazyRegistry')) continue;
        i++;
        fs.writeFileSync(`.cursor/lazy-reg-${lineNo}-${i}-old.ts`, c.input.old_string);
        fs.writeFileSync(`.cursor/lazy-reg-${lineNo}-${i}-new.ts`, c.input.new_string);
        console.log(lineNo, i, 'old', c.input.old_string.length, 'new', c.input.new_string.length);
    }
}
