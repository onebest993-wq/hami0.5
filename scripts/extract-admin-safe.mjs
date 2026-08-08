import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const rootPath = path.join(ROOT, 'ActiveOrderFileRoot.tsx');
const lines = fs.readFileSync(rootPath, 'utf8').split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.trim() === '<motion.div className="space-y-6">' && lines[lines.indexOf(l) + 1]?.includes('!isIqrarContext'));
const startIdxAlt = lines.findIndex((l) => l.trim() === '<div className="space-y-6">' && lines[lines.indexOf(l) + 1]?.trim() === '{!isIqrarContext && (');
const start = startIdx >= 0 ? startIdx : startIdxAlt;
if (start < 0) {
    console.error('admin start not found');
    process.exit(1);
}

const endIdx = lines.findIndex((l, i) => i > start && l.trim() === '</div>' && lines[i + 1]?.trim() === '</div>' && lines[i + 2]?.trim() === '</div>' && lines[i + 3]?.trim() === '</div>');
if (endIdx < 0) {
    console.error('admin end not found');
    process.exit(1);
}

const jsxLines = lines.slice(start, endIdx + 1);
const props = [
    'isIqrarContext',
    'isFinalized',
    'newFollowupTitle',
    'setNewFollowupTitle',
    'newFollowupDate',
    'setNewFollowupDate',
    'requestDateYmd',
    'addFollowup',
    'caseFollowups',
    'todayYmdValue',
    'toggleFollowupCompleted',
    'deleteFollowup',
    'caseEvents',
    'newEventText',
    'setNewEventText',
    'addManualEvent',
    'caseEventDayGroups',
    'newNoteText',
    'setNewNoteText',
    'addCaseNote',
    'caseNotes',
    'deleteCaseNote',
    'attachmentsError',
    'attachmentInputId',
    'addAttachmentFile',
    'caseAttachments',
    'deleteAttachment',
];

const propsType = props.map((k) => `    ${k}: unknown;`).join('\n');
const destructure = props.join(',\n    ');

const panelFile = `import React from 'react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import { formatDateText, formatDateTimeText, formatTimeText, eventKindMeta } from '../utils/formatters';

export type AdminWorkspacePanelProps = {
${propsType}
};

export function AdminWorkspacePanel({
    ${destructure},
}: AdminWorkspacePanelProps) {
    return (
${jsxLines.join('\n')}
    );
}
`;

const panelPath = path.join(ROOT, 'layout/AdminWorkspacePanel.tsx');
fs.writeFileSync(panelPath, panelFile);

const propPass = props.map((k) => `                            ${k}={${k}}`).join('\n');
const replacement = `                        <AdminWorkspacePanel\n${propPass}\n                        />`;

const newLines = [...lines.slice(0, start), ...replacement.split('\n'), ...lines.slice(endIdx + 1)];
fs.writeFileSync(rootPath, newLines.join('\n'));

console.log('extracted admin', { start, endIdx, jsxLineCount: jsxLines.length });
