import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const srcPath = path.join(root, 'ActiveOrderFileRoot.tsx');
let content = fs.readFileSync(srcPath, 'utf8');

const bodyStart = content.indexOf('const fd = fileData');
const modelStart = content.indexOf('const model = useStableModelRef({');
const confirmPortal = content.indexOf('const confirmPortal = (', modelStart);
if (modelStart < 0 || confirmPortal < 0) {
    console.error('model block not found');
    process.exit(1);
}

const body = content.slice(bodyStart, modelStart);
const names = new Set(['fd', 'onClose', 'onCaseUpdated', 'fileData']);
for (const line of body.split('\n')) {
    let m = line.match(/^\s*const \[(\w+), (\w+)\]/);
    if (m) {
        names.add(m[1]);
        names.add(m[2]);
        continue;
    }
    m = line.match(/^\s*const (\w+) =/);
    if (m && !['fd'].includes(m[1])) names.add(m[1]);
    m = line.match(/^\s*function (\w+)\s*\(/);
    if (m) names.add(m[1]);
}

// keys used in extracted panels via m.
for (const file of ['layout/LifecyclePanel.tsx', 'layout/AdminWorkspacePanel.tsx']) {
    const fp = path.join(root, file);
    if (!fs.existsSync(fp)) continue;
    const t = fs.readFileSync(fp, 'utf8');
    const re = /\bm\.(\w+)/g;
    let match;
    while ((match = re.exec(t))) names.add(match[1]);
}

const sorted = [...names].sort();
const fields = sorted.map((n) => `        ${n},`).join('\n');

const newModel = `    const model = useStableModelRef({
${fields}
        confirmPortal: undefined as unknown as React.ReactNode,
    } as ActiveOrderFileModel);

`;

content = content.slice(0, modelStart) + newModel + content.slice(confirmPortal);
fs.writeFileSync(srcPath, content);
console.log('model rebuilt with', sorted.length, 'keys');
