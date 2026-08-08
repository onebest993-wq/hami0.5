import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const srcPath = path.join(root, 'ActiveOrderFileRoot.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex(
    (l, i) => l.trim() === '<div className="space-y-6">' && lines.slice(i, i + 6).some((x) => x.includes('المهام والإجراءات الإدارية')),
);
const endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.trim() === '</div>' && lines[i + 1]?.trim() === '</div>',
);

if (startIdx < 0 || endIdx < 0) {
    console.error('admin markers not found', { startIdx, endIdx });
    process.exit(1);
}

const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
const confirmLine = lines.findIndex((l) => l.includes('const model = useStableModelRef'));
const bodyLines = lines.slice(bodyStart, confirmLine > 0 ? confirmLine : lines.length);
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

const reserved = new Set(['if', 'return', 'null', 'true', 'false', 'new', 'typeof', 'key', 'ref', 'm', 'ValidationBanner', 'DatePickerField']);
const sortedNames = [...names].filter((n) => !reserved.has(n) && n.length > 2).sort((a, b) => b.length - a.length);

let chunk = lines.slice(startIdx, endIdx).join('\n');
for (const name of sortedNames) {
    chunk = chunk.replace(new RegExp(`\\b${name}\\b`, 'g'), `m.${name}`);
}

const adminFile = `import React from 'react';
import { DatePickerField } from '../components/DatePickerField';
import { ValidationBanner } from '../components/ValidationBanner';
import { useActiveOrderFileContext } from '../context/ActiveOrderFileContext';

export function AdminWorkspacePanel() {
    const m = useActiveOrderFileContext() as Record<string, any>;

    return (
${chunk}
    );
}
`;

fs.writeFileSync(path.join(root, 'layout/AdminWorkspacePanel.tsx'), adminFile);
const newLines = [...lines.slice(0, startIdx), '                        <AdminWorkspacePanel />', ...lines.slice(endIdx)];
fs.writeFileSync(srcPath, newLines.join('\n'));
console.log('AdminWorkspacePanel extracted', { startIdx, endIdx, lines: endIdx - startIdx });
