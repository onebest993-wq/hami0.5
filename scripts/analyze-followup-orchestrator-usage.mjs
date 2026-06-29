import fs from 'fs';

const core = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
    'utf8',
);
const start = core.indexOf('const {\n        showUnifiedExecutionModalRef');
const end = core.indexOf('} = followupOrchestrator;', start) + '} = followupOrchestrator;'.length;
const block = core.slice(start, end);
const keys = [...block.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((m) => m[1]);
const after = core.slice(end);
const used = [];
const unused = [];
for (const k of keys) {
    const re = new RegExp(`\\b${k}\\b`, 'g');
    const count = after.match(re)?.length ?? 0;
    if (count > 0) used.push([k, count]);
    else unused.push(k);
}
console.log('total keys', keys.length);
console.log('used locally', used.length);
console.log('unused locally', unused.length);
if (unused.length) console.log('unused:', unused.join(', '));
console.log(
    'top used:',
    used
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([k, c]) => `${k}:${c}`)
        .join('\n'),
);
