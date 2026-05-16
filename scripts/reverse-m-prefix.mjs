import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const srcPath = path.join(root, 'ActiveOrderFileRoot.tsx');
const lifePath = path.join(root, 'layout/LifecyclePanel.tsx');

const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
const modelStart = lines.findIndex((l) => l.includes('const model = useStableModelRef'));
const bodyLines = lines.slice(bodyStart, modelStart > 0 ? modelStart : lines.length);

const names = new Set();
for (const line of bodyLines) {
    let m = line.match(/^\s*const \[(\w+), (\w+)\]/);
    if (m) {
        names.add(m[1]);
        names.add(m[2]);
        continue;
    }
    m = line.match(/^\s*const (\w+) =/);
    if (m && m[1] !== 'fd') names.add(m[1]);
    m = line.match(/^\s*function (\w+)\s*\(/);
    if (m) names.add(m[1]);
}

let s = fs.readFileSync(lifePath, 'utf8');
const sorted = [...names].sort((a, b) => b.length - a.length);
for (const name of sorted) {
    s = s.replace(new RegExp(`m\\.${name}\\b`, 'g'), name);
}
// keep m. only for useActiveOrderFileContext line
fs.writeFileSync(lifePath, s);
console.log('reversed', sorted.length, 'identifiers');
