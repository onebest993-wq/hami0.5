import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const chunkStart = lines.findIndex((l) => l.includes('const executionModalFlags = {'));
const chunkEnd = lines.findIndex(
    (l, i) => i > chunkStart && l.trim() === '});' && lines[i + 1]?.trim() === '',
);
const gateLine = lines.findIndex((l) => l.includes('CONDITIONAL RENDERING'));

if (chunkStart < 0 || chunkEnd < 0 || gateLine < 0) {
    console.error('markers missing', { chunkStart, chunkEnd, gateLine });
    process.exit(1);
}

if (chunkStart < gateLine) {
    console.log('hooks already before gates');
} else {
    const chunkBlock = lines.slice(chunkStart, chunkEnd + 1);
    const without = [...lines.slice(0, chunkStart), ...lines.slice(chunkEnd + 1)];
    const gateIdx = without.findIndex((l) => l.includes('CONDITIONAL RENDERING'));
    const out = [...without.slice(0, gateIdx), ...chunkBlock, '', ...without.slice(gateIdx)];
    fs.writeFileSync(dashPath, out.join('\n'));
    console.log('moved chunk setup before conditional returns');
}

let content = fs.readFileSync(dashPath, 'utf8');
content = content.replace(/(\s+Trash2,\n)\s+Trash2,\n/, '$1');
fs.writeFileSync(dashPath, content);
console.log('deduped Trash2');
