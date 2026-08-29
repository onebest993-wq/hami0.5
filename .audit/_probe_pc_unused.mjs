import fs from 'node:fs';

const rel =
    'src/app/components/lawyer/execution/personalCoercive/PersonalCoerciveFollowupPanel.tsx';
const src = fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');

const destStart = lines.findIndex((l) => l.includes('} = usePersonalCoercivePanelModel(props);'));
const modelStart = lines.findIndex((l) => l.includes('const {') && lines[l] !== undefined);
// first const { after export
let firstBrace = -1;
for (let i = 0; i < destStart; i++) {
    if (lines[i].includes('const {')) {
        firstBrace = i;
        break;
    }
}
const names = [];
for (let i = firstBrace + 1; i < destStart; i++) {
    const m = lines[i].trim().replace(/,$/, '');
    if (!m || m.startsWith('//')) continue;
    names.push({ name: m, line: i });
}

const rest = lines.slice(destStart).join('\n');
const unused = names.filter(({ name }) => {
    const re = new RegExp(`\\b${name}\\b`);
    const hits = rest.match(new RegExp(`\\b${name}\\b`, 'g')) || [];
    // declaration is before destStart; rest should contain uses
    return hits.length === 0;
});
console.log('model unused', unused.length);
console.log(unused.map((u) => u.name).join('\n'));
console.log('file lines', lines.length);
