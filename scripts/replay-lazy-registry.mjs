import fs from 'node:fs';

const transcript =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts/68b2e183-9d2b-45ca-a38d-472ca5d0a104/68b2e183-9d2b-45ca-a38d-472ca5d0a104.jsonl';
const dest = 'src/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry.ts';
const target = 'criminalDashboardLazyRegistry.ts';

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
    for (const c of j?.message?.content || []) {
        if (c.type !== 'tool_use') continue;
        if (c.name !== 'Write' && c.name !== 'StrReplace') continue;
        if (!(c.input?.path || '').includes(target)) continue;
        ops.push({
            lineNo,
            name: c.name,
            contents: c.input?.contents,
            old_string: c.input?.old_string,
            new_string: c.input?.new_string,
        });
    }
}

let text = fs.readFileSync(dest, 'utf8');
// strip ts-nocheck for matching older ops if needed
const log = [];
for (const op of ops) {
    if (op.name === 'Write' && typeof op.contents === 'string') {
        text = op.contents;
        log.push(`L${op.lineNo} Write ${text.length}`);
        continue;
    }
    if (op.name === 'StrReplace') {
        if (!text.includes(op.old_string)) {
            log.push(`L${op.lineNo} FAIL`);
            continue;
        }
        text = text.replace(op.old_string, op.new_string);
        log.push(`L${op.lineNo} OK ${text.length}`);
    }
}

fs.writeFileSync(dest, text);
fs.writeFileSync('.cursor/lazy-registry-replay.log', log.join('\n'));
console.log(
    JSON.stringify({
        ops: ops.length,
        bytes: text.length,
        hasHeader: text.includes('LazyCriminalDashboardHeader'),
        hasPreload: text.includes('preloadCriminalDashboardShellSurfaces'),
        hasPrefetchReq: text.includes('prefetchCriminalRequestsDecisionSurfaces'),
        ok: log.filter((l) => l.includes('OK') || l.includes('Write')).length,
        fail: log.filter((l) => l.includes('FAIL')).length,
    }),
);
