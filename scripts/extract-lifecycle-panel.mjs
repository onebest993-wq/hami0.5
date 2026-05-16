import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const srcPath = path.join(root, 'ActiveOrderFileRoot.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex(
    (l) => l.trim() === '{guaranteeGateActive && (' && lines[lines.indexOf(l) + 1]?.includes('border border-amber-500/25'),
);
const endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.trim() === '<div className="space-y-6">' && lines[i + 3]?.includes('المهام والإجراءات الإدارية'),
);

if (startIdx < 0 || endIdx < 0) {
    console.error('lifecycle markers not found', { startIdx, endIdx });
    process.exit(1);
}

const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
const confirmLine = lines.findIndex((l) => l.includes('const model = useStableModelRef'));
const bodyLines = lines.slice(bodyStart, confirmLine > 0 ? confirmLine : lines.findIndex((l) => l.includes('const confirmPortal')));
const names = new Set();
for (const line of bodyLines) {
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

const reserved = new Set([
    'if', 'return', 'null', 'true', 'false', 'new', 'typeof', 'key', 'ref', 'm', 'div', 'span', 'button', 'input',
    'label', 'select', 'option', 'textarea', 'className', 'type', 'value', 'checked', 'disabled', 'onClick',
    'onChange', 'initial', 'animate', 'exit', 'transition', 'children', 'open', 'min', 'max', 'name', 'id',
    'motion', 'AnimatePresence', 'ValidationBanner', 'DatePickerField', 'Calendar', 'Plus', 'Check', 'Info',
    'Pencil', 'Ban', 'Scale', 'FileText', 'DollarSign', 'Briefcase', 'X', 'ArrowLeft', 'Printer',
]);

const sortedNames = [...names].filter((n) => !reserved.has(n) && n.length > 2).sort((a, b) => b.length - a.length);

let chunk = lines.slice(startIdx, endIdx).join('\n');
for (const name of sortedNames) {
    chunk = chunk.replace(new RegExp(`\\b${name}\\b`, 'g'), `m.${name}`);
}

const lifecycleFile = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Check, Ban, Scale, FileText, DollarSign, Briefcase, Info, Pencil } from 'lucide-react';
import { DatePickerField } from '../components/DatePickerField';
import { ValidationBanner } from '../components/ValidationBanner';
import { useActiveOrderFileContext } from '../context/ActiveOrderFileContext';

export function LifecyclePanel() {
    const m = useActiveOrderFileContext() as Record<string, any>;

    return (
        <>
${chunk}
        </>
    );
}
`;

fs.writeFileSync(path.join(root, 'layout/LifecyclePanel.tsx'), lifecycleFile);

const newLines = [...lines.slice(0, startIdx), '                        <LifecyclePanel />', '', ...lines.slice(endIdx)];
fs.writeFileSync(srcPath, newLines.join('\n'));
console.log('LifecyclePanel extracted', { startIdx, endIdx, lines: endIdx - startIdx, names: sortedNames.length });
