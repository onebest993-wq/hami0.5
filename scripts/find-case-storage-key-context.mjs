import fs from 'node:fs';

const files = [
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl',
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/subagents/3d5bdbc6-d147-497c-99b9-3e5581f8ccf4.jsonl',
];

for (const f of files) {
    let lineNo = 0;
    for (const line of fs.readFileSync(f, 'utf8').split(/\n/)) {
        lineNo++;
        if (!line.includes('findCaseStorageKey')) continue;
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
            for (const key of ['contents', 'new_string', 'old_string']) {
                const t = c.input?.[key];
                if (typeof t !== 'string' || !t.includes('findCaseStorageKey')) continue;
                const idx = t.indexOf('findCaseStorageKey');
                console.log('---', pathBase(f), 'L' + lineNo, c.name, key, 'len', t.length);
                console.log(t.slice(Math.max(0, idx - 200), idx + 400));
                console.log('===');
            }
        }
    }
}

function pathBase(f) {
    return f.split(/[/\\]/).slice(-2).join('/');
}
