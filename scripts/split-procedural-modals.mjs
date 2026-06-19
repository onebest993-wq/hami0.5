/**
 * Split ProceduralModals.tsx → procedural-modals/* + barrel.
 * Run: node scripts/split-procedural-modals.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/ProceduralModals.tsx');
const modalsDir = path.join(root, 'src/app/components/lawyer/smart-modal/procedural-modals');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const exportStarts = [];
for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export const (\w+)/);
    if (m) exportStarts.push({ name: m[1], line: i });
}

function sliceRange(startLine, endLine) {
    return lines.slice(startLine, endLine).join('\n');
}

function sliceExport(name) {
    const idx = exportStarts.findIndex((e) => e.name === name);
    if (idx < 0) throw new Error(`Missing export: ${name}`);
    const start = exportStarts[idx].line;
    const end = idx + 1 < exportStarts.length ? exportStarts[idx + 1].line : lines.length;
    return lines.slice(start, end).join('\n');
}

fs.mkdirSync(modalsDir, { recursive: true });

const shellHeader = lines.slice(0, 23).join('\n');
const shellBody = shellHeader
    .replace(/^import React.*\n/, '')
    .replace(/^import \{ motion.*\n/, '')
    .replace(/^import \{ X.*\n/, '')
    .replace(/^import \{ getLocalTodayYmd.*\n/, '');

fs.writeFileSync(
    path.join(modalsDir, 'proceduralModalShell.ts'),
    `export const GLASS_MODAL_OVERLAY =
    "fixed inset-0 z-[160] flex items-center justify-center bg-[#05060D]/65 backdrop-blur-[3px] p-4 font-['Tajawal']";
export const GLASS_MODAL_SHELL =
    'rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200';
export const GLASS_MODAL_HEADER =
    'relative px-4 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center';
export const GLASS_FIELD =
    'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]';
export const GLASS_BTN =
    'w-full bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#E6C673]/25 disabled:opacity-50 disabled:cursor-not-allowed';
export const GLASS_CLOSE =
    'p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: unknown) => void;
}
`,
);

const glassImport = `import {
    GLASS_BTN,
    GLASS_CLOSE,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    GLASS_MODAL_OVERLAY,
    GLASS_MODAL_SHELL,
    type ModalProps,
} from './proceduralModalShell';`;

const judgeRecusal = sliceExport('JudgeRecusalModal');
fs.writeFileSync(
    path.join(modalsDir, 'JudgeRecusalModal.tsx'),
    `import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ModalProps } from './proceduralModalShell';

${judgeRecusal}
`,
);

const transferJurisdiction = sliceExport('TransferJurisdictionModal');
fs.writeFileSync(
    path.join(modalsDir, 'TransferJurisdictionModal.tsx'),
    `import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport.replace("type ModalProps,", '')}

${transferJurisdiction}
`,
);

const consolidationTypes = sliceRange(167, 198);
const caseConsolidation = sliceExport('CaseConsolidationModal');
fs.writeFileSync(
    path.join(modalsDir, 'CaseConsolidationModal.tsx'),
    `import React, { useState } from 'react';
import { X, Building, Users, Link, Briefcase } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport.replace('type ModalProps,', '')}

${consolidationTypes}

${caseConsolidation}
`,
);

const caseLinkTypes = sliceRange(551, 560);
const caseLink = sliceExport('CaseLinkModal');
fs.writeFileSync(
    path.join(modalsDir, 'CaseLinkModal.tsx'),
    `import React, { useState } from 'react';
import { X, Link, Ban } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport.replace('type ModalProps,', '')}

${caseLinkTypes}

${caseLink}
`,
);

const correspondenceTypes = sliceRange(764, 769);
const correspondence = sliceExport('CorrespondenceModal');
fs.writeFileSync(
    path.join(modalsDir, 'CorrespondenceModal.tsx'),
    `import React, { useState } from 'react';
import { X, Send, FileText } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport.replace('type ModalProps,', '').replace('ModalProps', '')}

${correspondenceTypes}

${correspondence}
`,
);

const attorneyResignation = sliceExport('AttorneyResignationModal');
fs.writeFileSync(
    path.join(modalsDir, 'AttorneyResignationModal.tsx'),
    `import React, { useState } from 'react';
import { X, UserX } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport}

${attorneyResignation}
`,
);

const executionTransfer = sliceExport('ExecutionTransferModal');
fs.writeFileSync(
    path.join(modalsDir, 'ExecutionTransferModal.tsx'),
    `import React, { useState } from 'react';
import { X, Scale } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
${glassImport}

${executionTransfer}
`,
);

const appealBriefTypes = sliceRange(1021, 1027);
const appealBrief = sliceExport('AppealBriefOutcomeModal');
fs.writeFileSync(
    path.join(modalsDir, 'AppealBriefOutcomeModal.tsx'),
    `import React, { useState } from 'react';
import { X } from 'lucide-react';
${glassImport.replace('type ModalProps,', '').replace('ModalProps', '')}

${appealBriefTypes}

${appealBrief}
`,
);

const barrel = `/** Barrel re-exports — lazy imports should target individual files in procedural-modals/. */
export { JudgeRecusalModal } from './procedural-modals/JudgeRecusalModal';
export { TransferJurisdictionModal } from './procedural-modals/TransferJurisdictionModal';
export { CaseConsolidationModal } from './procedural-modals/CaseConsolidationModal';
export { CaseLinkModal } from './procedural-modals/CaseLinkModal';
export { CorrespondenceModal } from './procedural-modals/CorrespondenceModal';
export { AttorneyResignationModal } from './procedural-modals/AttorneyResignationModal';
export { ExecutionTransferModal } from './procedural-modals/ExecutionTransferModal';
export { AppealBriefOutcomeModal } from './procedural-modals/AppealBriefOutcomeModal';
export type { ModalProps } from './procedural-modals/proceduralModalShell';
`;

fs.writeFileSync(srcPath, barrel);

const lazyPath = path.join(root, 'src/app/components/lawyer/smart-modal/lazySmartFileModalChunks.tsx');
let lazy = fs.readFileSync(lazyPath, 'utf8');
lazy = lazy.replace(
    /import\('\.\/ProceduralModals'\)\.then\(\(m\) => \(\{ default: m\.(\w+) \}\)\)/g,
    "import('./procedural-modals/$1').then((m) => ({ default: m.$1 }))",
);
fs.writeFileSync(lazyPath, lazy);

console.log('Split ProceduralModals → procedural-modals/ (%d modals)', exportStarts.length);
