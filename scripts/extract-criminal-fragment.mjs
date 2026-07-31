import fs from 'node:fs';
import path from 'node:path';

const root =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts';

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (e.name.endsWith('.jsonl')) acc.push(p);
    }
    return acc;
}

let best = null;
for (const f of walk(root)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\n/)) {
        if (!line.includes('loadCriminalCaseRecordByIdSync')) continue;
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
            const chunks = [];
            if (typeof c.input?.contents === 'string') chunks.push(c.input.contents);
            if (typeof c.input?.new_string === 'string') chunks.push(c.input.new_string);
            for (const t of chunks) {
                if (
                    !t.includes('export function loadCriminalCaseRecordByIdSync') &&
                    !t.includes('function loadCriminalCaseRecordByIdSync')
                ) {
                    continue;
                }
                if (!best || t.length > best.len) {
                    best = { len: t.length, f, name: c.name, path: c.input?.path, t };
                }
            }
        }
    }
}

if (!best) {
    console.error('none');
    process.exit(1);
}
fs.mkdirSync('.cursor', { recursive: true });
fs.writeFileSync('.cursor/criminalCasesStorage.fragment.ts', best.t);
console.log(
    JSON.stringify({ len: best.len, f: best.f, name: best.name, path: best.path }, null, 2),
);
