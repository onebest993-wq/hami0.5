import fs from 'node:fs';

const rel =
    'src/app/components/lawyer/execution/personalCoercive/PersonalCoerciveFollowupPanel.tsx';
const src = fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');
const destStart = lines.findIndex((l) => l.includes('} = usePersonalCoercivePanelModel(props);'));
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
    const hits = rest.match(new RegExp(`\\b${name}\\b`, 'g')) || [];
    return hits.length === 0;
});
const removeSet = new Set(unused.slice(0, 50).map((u) => u.line));
const next = lines.filter((_, i) => !removeSet.has(i)).join('\n');
fs.writeFileSync(rel, next.endsWith('\n') ? next : next + '\n');
console.log('removed', removeSet.size, 'now', next.split('\n').length);
