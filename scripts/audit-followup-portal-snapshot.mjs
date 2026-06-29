import fs from 'node:fs';

const portal = fs.readFileSync(
    'src/app/components/lawyer/ExecutionDashboard/ExecutionFollowupModalPortal.tsx',
    'utf8',
);
const dash = fs.readFileSync('src/app/components/lawyer/ExecutionDashboard.tsx', 'utf8');

const destructureStart = portal.indexOf('} = useFollowupModal()');
const block = portal.slice(portal.indexOf('const {') + 7, destructureStart);
const portalKeys = block
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const snapshotStart = dash.indexOf('value={buildFollowupModalSnapshot({');
const snapshotEnd = dash.indexOf('})}', snapshotStart);
const snapshotBlock = dash.slice(snapshotStart, snapshotEnd);
const snapshotKeys = new Set(
    [...snapshotBlock.matchAll(/^\s{8}([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::|,)/gm)].map((m) => m[1]),
);

const missing = portalKeys.filter((k) => !snapshotKeys.has(k));
console.log('Portal expects', portalKeys.length, 'keys');
console.log('Missing from snapshot:', missing.length ? missing.join(', ') : 'none');
if (missing.length > 0) {
    process.exit(1);
}
