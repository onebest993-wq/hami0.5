import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const rootPath = path.join(ROOT, 'ActiveOrderFileRoot.tsx');
const lines = fs.readFileSync(rootPath, 'utf8').split(/\r?\n/);

const start = lines.findIndex((l) => l.trim() === '{guaranteeGateActive && (');
const end = lines.findIndex(
    (l, i) => i > start && l.trim() === '</motion.div>' && lines.slice(i + 1, i + 4).some((x) => x.includes('AdminWorkspacePanel')),
);
if (start < 0 || end < 0) {
    console.error('lifecycle bounds not found', { start, end });
    process.exit(1);
}

const jsxLines = lines.slice(start, end + 1);
const jsx = jsxLines.join('\n');

const header = lines.slice(0, start).join('\n');
const importNames = new Set();
for (const m of header.matchAll(/^import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))/gm)) {
    if (m[1]) {
        for (const part of m[1].split(',')) {
            const n = part.trim().split(/\s+as\s+/)[0].trim();
            if (n) importNames.add(n);
        }
    }
    if (m[2]) importNames.add(m[2]);
}

const RESERVED = new Set([
    ...importNames,
    'if', 'else', 'return', 'null', 'true', 'false', 'new', 'typeof', 'void', 'case', 'break', 'default', 'switch',
    'async', 'await', 'String', 'Number', 'Boolean', 'Array', 'Date', 'Object', 'Math', 'JSON', 'Promise', 'Error',
    'console', 'window', 'document', 'length', 'map', 'filter', 'find', 'some', 'every', 'includes', 'trim', 'split',
    'join', 'push', 'slice', 'test', 'match', 'isNaN', 'getTime', 'preventDefault', 'stopPropagation', 'currentTarget',
    'target', 'files', 'value', 'checked', 'disabled', 'initial', 'animate', 'exit', 'transition', 'children', 'open',
    'min', 'max', 'name', 'id', 'htmlFor', 'aria', 'hidden', 'accept', 'placeholder', 'dir', 'rel', 'href', 'side',
    'align', 'sideOffset', 'size', 'title', 'stage', 'outcome', 'notes', 'decision', 'color', 'icon', 'text', 'kind',
    'file', 'link', 'person', 'company', 'client', 'opponent', 'filed', 'expired', 'confirmed', 'modified', 'canceled',
    'accepted', 'rejected', 'partially_accepted', 'pending', 'executed', 'grievance', 'cassation', 'adjourn', 'close',
    'terminate', 'pre_decision', 'system', 'action', 'edit', 'unknown', 'green', 'blue', 'purple', 'slate', 'amber',
    'rose', 'emerald', 'cyan', 'violet', 'auto', 'easeInOut', 'ease', 'duration', 'opacity', 'height', 'y', 'flex',
    'grid', 'block', 'inline', 'print', 'keyof', 'in', 'of', 'const', 'let', 'var', 'function', 'React', 'motion',
    'AnimatePresence', 'ValidationBanner', 'DatePickerField', 'PartyCardItem', 'AdminWorkspacePanel',
    'PRE_DECISION_OUTCOME_ADJOURN', 'PRE_DECISION_OUTCOME_CLOSE', 'PRE_DECISION_OUTCOME_NULLIFY',
    'f', 'n', 'h', 'a', 'ev', 'ep', 'group', 'meta', 'step', 'item', 'p', 's', 'i', 'd', 'e', 'v', 't', 'b', 'tone',
    'prev', 'next', 'changed', 'raw', 'parts', 'isoOrYmd', 'm', 'y', 'dd', 'mm', 'yy', 'clean', 'start', 'end', 'dec',
    'who', 'when', 'defer', 'skip', 'base', 'detail', 'details', 'candidates', 'amount', 'adjournReason', 'url',
    'dayKey', 'dayLabel', 'deadline', 'deadlineText', 'yyyy', 'ymd', 'baseNotes', 'archivedAt', 'archivedReason',
    'applyCaseRecord', 'patch', 'ok', 'file', 'current', 'groups', 'sortedCaseEvents', 'fd',
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

const scopeNames = collectScopeNames(lines.slice(79, start));
const props = [...scopeNames]
    .filter((n) => !RESERVED.has(n) && new RegExp(`\\b${n}\\b`).test(jsx))
    .sort();

const propsType = props.map((k) => `    ${k}: unknown;`).join('\n');
const destructure = props.join(',\n    ');

const panelFile = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Check, Ban, Scale, FileText, DollarSign, Briefcase, Info, Pencil, FileCheck } from 'lucide-react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import {
    isAdjournReasonValid,
    getPreDecisionHearingOutcome,
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../constants/hearingOutcomes';
import {
    cassationDecisionText,
    eventKindMeta,
    formatDateText,
    formatDateTimeText,
    formatTimeText,
    formatRequestNumberText,
} from '../utils/formatters';
import type { LifecyclePanelProps } from './LifecyclePanelProps';
export type { LifecyclePanelProps } from './LifecyclePanelProps';

export function LifecyclePanel({
    ${destructure},
}: LifecyclePanelProps) {
    return (
<>
${jsxLines.join('\n')}
</>
    );
}
`;

fs.writeFileSync(path.join(ROOT, 'layout/LifecyclePanelProps.ts'), `/** Auto-collected props for LifecyclePanel */\nexport type LifecyclePanelProps = {\n${propsType}\n};\n`);
fs.writeFileSync(path.join(ROOT, 'layout/LifecyclePanel.tsx'), panelFile);

const propPass = props.map((k) => `                            ${k}={${k}}`).join('\n');
const replacement = `                        <LifecyclePanel\n${propPass}\n                        />`;

const newLines = [...lines.slice(0, start), ...replacement.split('\n'), ...lines.slice(end + 1)];
fs.writeFileSync(rootPath, newLines.join('\n'));

console.log('extracted lifecycle', { start, end, jsxLineCount: jsxLines.length, propCount: props.length });
console.log('props sample', props.slice(0, 20).join(', '));
