import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const ROOT_FILE = path.join(ROOT, 'ActiveOrderFileRoot.tsx');

const RESERVED = new Set([
    'if', 'else', 'return', 'null', 'true', 'false', 'new', 'typeof', 'void', 'case', 'break', 'default', 'switch',
    'async', 'await', 'import', 'export', 'from', 'as', 'key', 'ref', 'className', 'type', 'button', 'div', 'span',
    'input', 'label', 'select', 'option', 'textarea', 'form', 'a', 'h1', 'h2', 'h3', 'p', 'React', 'motion',
    'AnimatePresence', 'Calendar', 'Plus', 'Check', 'Ban', 'Scale', 'FileText', 'DollarSign', 'Briefcase', 'Info',
    'Pencil', 'FileCheck', 'String', 'Number', 'Boolean', 'Array', 'Date', 'Object', 'Math', 'JSON', 'Promise', 'Error',
    'console', 'window', 'document', 'length', 'map', 'filter', 'find', 'some', 'every', 'includes', 'trim', 'split',
    'join', 'push', 'slice', 'test', 'match', 'isNaN', 'getTime', 'preventDefault', 'stopPropagation', 'currentTarget',
    'target', 'files', 'value', 'checked', 'disabled', 'initial', 'animate', 'exit', 'transition', 'children', 'open',
    'min', 'max', 'name', 'id', 'htmlFor', 'aria', 'hidden', 'accept', 'placeholder', 'dir', 'rel', 'href', 'side',
    'align', 'sideOffset', 'size', 'title', 'stage', 'outcome', 'notes', 'decision', 'color', 'icon', 'text', 'kind',
    'file', 'link', 'person', 'company', 'client', 'opponent', 'filed', 'expired', 'confirmed', 'modified', 'canceled',
    'accepted', 'rejected', 'partially_accepted', 'pending', 'executed', 'grievance', 'cassation', 'adjourn', 'close',
    'terminate', 'pre_decision', 'system', 'action', 'edit', 'unknown', 'green', 'blue', 'purple', 'slate', 'amber',
    'rose', 'emerald', 'cyan', 'violet', 'auto', 'easeInOut', 'ease', 'duration', 'opacity', 'height', 'y', 'flex',
    'grid', 'block', 'inline', 'print', 'keyof', 'in', 'of', 'const', 'let', 'var', 'function', 'ValidationBanner',
    'DatePickerField', 'PartyCardItem', 'PRE_DECISION_OUTCOME_ADJOURN', 'PRE_DECISION_OUTCOME_CLOSE',
    'PRE_DECISION_OUTCOME_NULLIFY', 'pickLifecyclePanelProps', 'pickAdminWorkspacePanelProps',
]);

function collectScopeNames(bodyLines) {
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
    return names;
}

function prefixIdentifiers(code, scopeNames, prefix = 'p.') {
    let out = '';
    let i = 0;
    while (i < code.length) {
        const ch = code[i];
        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            out += ch;
            i++;
            while (i < code.length) {
                if (code[i] === '\\') {
                    out += code[i] + (code[i + 1] || '');
                    i += 2;
                    continue;
                }
                if (code[i] === quote) {
                    out += code[i];
                    i++;
                    break;
                }
                out += code[i++];
            }
            continue;
        }
        const rest = code.slice(i);
        const word = rest.match(/^([A-Za-z_$][\w$]*)/);
        if (word) {
            const w = word[1];
            if (scopeNames.has(w) && !RESERVED.has(w)) {
                out += prefix + w;
                i += w.length;
                continue;
            }
        }
        out += ch;
        i++;
    }
    return out;
}

function extractOne(lines, scopeNames, { name, startIdx, endIdx, motionImports }) {
    const chunk = lines.slice(startIdx, endIdx).join('\n');
    const used = new Set();
    for (const n of scopeNames) {
        if (new RegExp(`\\b${n}\\b`).test(chunk)) used.add(n);
    }
    const sortedUsed = [...used].sort();
    const prefixed = prefixIdentifiers(chunk, used, 'p.');

    const propsType = `/** مفاتيح مستخدمة في ${name} — قيم من نطاق الإضبارة */\nexport type ${name}Props = {\n${sortedUsed.map((k) => `    ${k}: unknown;`).join('\n')}\n};\n`;

    fs.writeFileSync(
        path.join(ROOT, `layout/${name}Props.ts`),
        propsType,
    );

    const component = `import React from 'react';
${motionImports}
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import type { ${name}Props } from './${name}Props';

export function ${name}(p: ${name}Props) {
    return (
${prefixed}
    );
}
`;

    fs.writeFileSync(path.join(ROOT, `layout/${name}.tsx`), component);

    const spreadKeys = sortedUsed.map((k) => `        ${k},`).join('\n');
    return { name, sortedUsed, spreadKeys, lineCount: endIdx - startIdx };
}

function main() {
    let lines = fs.readFileSync(ROOT_FILE, 'utf8').split(/\r?\n/);
    const bodyStart = lines.findIndex((l) => l.includes('const fd = fileData'));
    const confirmLine = lines.findIndex((l) => l.includes('const confirmPortal = ('));
    const scopeNames = collectScopeNames(lines.slice(bodyStart, confirmLine));

    const lifeStart = lines.findIndex(
        (l) => l.trim() === '{guaranteeGateActive && (' && lines[lines.indexOf(l) + 1]?.includes('border-amber-500/25'),
    );
    const lifeEnd = lines.findIndex(
        (l, i) => i > lifeStart && l.trim() === '<div className="space-y-6">' && lines.slice(i, i + 4).some((x) => x.includes('المهام والإجراءات الإدارية')),
    );

    const life = extractOne(lines, scopeNames, {
        name: 'LifecyclePanel',
        startIdx: lifeStart,
        endIdx: lifeEnd,
        motionImports: "import { motion, AnimatePresence } from 'motion/react';\nimport { Calendar, Plus, Check, Ban, Scale, FileText, DollarSign, Briefcase, Info, Pencil, FileCheck } from 'lucide-react';",
    });

    lines = [
        ...lines.slice(0, lifeStart),
        '                        <LifecyclePanel {...pickLifecyclePanelProps({',
        life.spreadKeys,
        '        })} />',
        ...lines.slice(lifeEnd),
    ];
    fs.writeFileSync(ROOT_FILE, lines.join('\n'));

    lines = fs.readFileSync(ROOT_FILE, 'utf8').split(/\r?\n/);
    const adminStart = lines.findIndex(
        (l, i) => l.trim() === '<div className="space-y-6">' && lines.slice(i, i + 4).some((x) => x.includes('المهام والإجراءات الإدارية')),
    );
    let adminEndIdx = lines.findIndex(
        (l, i) => i > adminStart && l.trim() === '</div>' && lines[i + 1]?.trim() === '</motion.div>' && lines[i + 2]?.trim() === '</motion.div>',
    );
    if (adminEndIdx < 0) {
        adminEndIdx = lines.findIndex(
            (l, i) => i > adminStart && l.trim() === '</motion.div>' && lines[i + 1]?.trim() === '</motion.div>',
        );
    }

    const admin = extractOne(lines, scopeNames, {
        name: 'AdminWorkspacePanel',
        startIdx: adminStart,
        endIdx: adminEndIdx,
        motionImports: '',
    });

    lines = [
        ...lines.slice(0, adminStart),
        '                        <AdminWorkspacePanel {...pickAdminWorkspacePanelProps({',
        admin.spreadKeys,
        '        })} />',
        ...lines.slice(adminEndIdx),
    ];
    fs.writeFileSync(ROOT_FILE, lines.join('\n'));

    const pickFile = `import type { LifecyclePanelProps } from './layout/LifecyclePanelProps';
import type { AdminWorkspacePanelProps } from './layout/AdminWorkspacePanelProps';

export function pickLifecyclePanelProps(src: Record<string, unknown>): LifecyclePanelProps {
    return src as LifecyclePanelProps;
}

export function pickAdminWorkspacePanelProps(src: Record<string, unknown>): AdminWorkspacePanelProps {
    return src as AdminWorkspacePanelProps;
}
`;
    fs.writeFileSync(path.join(ROOT, 'pickPanelProps.ts'), pickFile);

    console.log('done', {
        lifecycle: life.lineCount,
        lifecycleKeys: life.sortedUsed.length,
        admin: admin.lineCount,
        adminKeys: admin.sortedUsed.length,
        adminStart,
        adminEndIdx,
    });
}

main();
