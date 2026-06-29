import fs from 'node:fs';

const src = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf8');
const snapshotStart = src.indexOf('value={buildFollowupModalSnapshot({');
const snapshotEnd = src.indexOf('})}', snapshotStart);
const preSnapshot = src.slice(0, snapshotStart);
const block = src.slice(snapshotStart, snapshotEnd);

const entries = [...block.matchAll(/^\s{8}([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*([a-zA-Z_][a-zA-Z0-9_]*))?/gm)];
const unique = [...new Set(entries.map((m) => m[1]))];

const bound = new Set(['queueMicrotask']);

for (const m of preSnapshot.matchAll(/\bimport\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))/g)) {
    if (m[1]) {
        for (const part of m[1].split(',')) {
            const rhs = part.trim().split(/\s+as\s+/);
            const name = (rhs[1] ?? rhs[0]).trim();
            if (name) bound.add(name);
        }
    }
    if (m[2]) bound.add(m[2]);
}

for (const m of preSnapshot.matchAll(/\bfunction\s+(\w+)\s*\(/g)) bound.add(m[1]);

for (const m of preSnapshot.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=/g)) bound.add(m[1]);

for (const m of preSnapshot.matchAll(/\b(?:const|let|var)\s+\[([^\]]+)\]/g)) {
    for (const part of m[1].split(',')) {
        const name = part.trim().split('=')[0].trim();
        if (/^\w+$/.test(name)) bound.add(name);
    }
}

for (const m of preSnapshot.matchAll(/\b(?:const|let|var)\s+\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
        const chunk = part.trim();
        const renamed = chunk.includes(':') ? chunk.split(':')[1].split('=')[0].trim() : chunk.split('=')[0].trim();
        if (/^\w+$/.test(renamed)) bound.add(renamed);
    }
}

for (const m of preSnapshot.matchAll(/(?:React\.memo\(|function\s+\w+\s*)\(\{\s*([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
        const chunk = part.trim();
        const renamed = chunk.includes(':') ? chunk.split(':')[1].split('=')[0].trim() : chunk.split('=')[0].trim();
        if (/^\w+$/.test(renamed)) bound.add(renamed);
    }
}

bound.add('insertTimelineEventToSupabase');

const missing = entries
    .map((m) => ({ key: m[1], symbol: m[2] ?? m[1] }))
    .filter(({ symbol }) => !bound.has(symbol))
    .map(({ key, symbol }) => (key === symbol ? key : `${key} (→ ${symbol})`));
const uniqueMissing = [...new Set(missing)];

console.log(`snapshot keys: ${unique.length}, bound symbols: ${bound.size}`);
if (uniqueMissing.length) {
    console.error('UNBOUND snapshot keys:', uniqueMissing.join(', '));
    process.exit(1);
}
console.log('OK — all snapshot keys are bound before followup snapshot');
