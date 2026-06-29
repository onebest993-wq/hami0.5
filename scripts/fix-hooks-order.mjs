import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const chunkStart = lines.findIndex((l) => l.includes('const executionModalFlags = {'));
const chunkEnd = lines.findIndex((l, i) => i > chunkStart && l.trim() === '});' && lines[i + 1]?.trim() === '');
const gateComment = lines.findIndex((l) => l.includes('CONDITIONAL RENDERING'));

if (chunkStart < 0 || chunkEnd < 0 || gateComment < 0 || chunkStart < gateComment) {
    // already moved or different layout
    if (chunkStart >= 0 && chunkStart < gateComment) {
        console.log('chunk setup already before gates');
        process.exit(0);
    }
    console.error('markers', { chunkStart, chunkEnd, gateComment });
    process.exit(1);
}

const chunkBlock = lines.slice(chunkStart, chunkEnd + 1);
const withoutChunk = [...lines.slice(0, chunkStart), ...lines.slice(chunkEnd + 1)];
const insertAt = withoutChunk.findIndex((l) => l.includes('CONDITIONAL RENDERING'));
const out = [
    ...withoutChunk.slice(0, insertAt),
    ...chunkBlock,
    '',
    ...withoutChunk.slice(insertAt),
];

fs.writeFileSync(dashPath, out.join('\n'));
console.log('moved chunk setup before status gates');
