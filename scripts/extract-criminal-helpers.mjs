import fs from 'node:fs';
import path from 'node:path';

const root =
    'C:/Users/HEX STORE/.cursor/projects/c-Users-HEX-STORE-Downloads-New-folder/agent-transcripts';
const needles = [
    'function findCaseStorageKey',
    'function setCriminalCasesCache',
    'function dispatchCriminalStoragePatched',
    'purgeCriminalCaseRecord',
    'let criminalCasesCache',
];

function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (e.name.endsWith('.jsonl')) acc.push(p);
    }
    return acc;
}

const best = Object.fromEntries(needles.map((n) => [n, null]));
for (const f of walk(root)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\n/)) {
        for (const n of needles) {
            if (!line.includes(n)) continue;
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
                    if (typeof t !== 'string' || !t.includes(n)) continue;
                    if (!best[n] || t.length > best[n].len) {
                        best[n] = { len: t.length, f, key, name: c.name, t };
                    }
                }
            }
        }
    }
}

fs.mkdirSync('.cursor/criminal-helpers', { recursive: true });
for (const [n, v] of Object.entries(best)) {
    console.log(n, v ? `${v.len} ${v.name} ${v.key}` : 'MISSING');
    if (v) {
        const safe = n.replace(/\W+/g, '_');
        fs.writeFileSync(`.cursor/criminal-helpers/${safe}.ts`, v.t);
    }
}
