/**
 * Split incidentalAndFlowModals.tsx → flow-modals/* + barrel.
 * Run: node scripts/split-incidental-flow-modals.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/modals/incidentalAndFlowModals.tsx');
const modalsDir = path.join(root, 'src/app/components/lawyer/smart-modal/modals/flow-modals');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const exportStarts = [];
for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^export const (\w+)/);
    if (m) exportStarts.push({ name: m[1], line: i });
}

function sliceExport(name) {
    const idx = exportStarts.findIndex((e) => e.name === name);
    if (idx < 0) throw new Error(`Missing export: ${name}`);
    const start = exportStarts[idx].line;
    const end = idx + 1 < exportStarts.length ? exportStarts[idx + 1].line : lines.length;
    return lines.slice(start, end).join('\n');
}

const sharedImports = `import React, { useState } from 'react';
import {
    AlertTriangle,
    Check,
    Gavel,
    Lock,
    PauseCircle,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../../LawyerShared';
import { TimelineEvent } from '../../../LawyerShared';
import {
    affiliationSideLabel,
    groupPartiesBySide,
} from '../../smartFile/incidentalCaseLinking';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_CLOSE,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    GLASS_MODAL_OVERLAY,
    GLASS_MODAL_SHELL,
    GLASS_SELECT,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
`;

const typeImports = {
    AddIncidentalCaseModal: 'AddIncidentalCaseModalProps',
    PauseCaseModal: 'PauseCaseModalProps',
    InterruptionModal: 'InterruptionModalProps',
    ResumeInterruptionModal: 'ResumeInterruptionModalProps',
    TransitionModal: 'TransitionModalProps',
    TrashModal: null,
    AddProvisionalOrderModal: 'AddProvisionalOrderModalProps',
};

fs.mkdirSync(modalsDir, { recursive: true });

const names = exportStarts.map((e) => e.name);
for (const name of names) {
    const typeName = typeImports[name];
    const typeImportLine = typeName
        ? `import type { ${typeName} } from '../../smartFile/modalFormTypes';\n`
        : '';
    const body = sliceExport(name);
    fs.writeFileSync(
        path.join(modalsDir, `${name}.tsx`),
        `${sharedImports}${typeImportLine}\n${body}\n`,
    );
}

const barrel = `${names.map((n) => `export { ${n} } from './flow-modals/${n}';`).join('\n')}
`;

fs.writeFileSync(srcPath, barrel);
console.log(`Split incidentalAndFlowModals → flow-modals/ (${names.length} files)`);
