/**
 * One-time splitter: SmartFileModals.tsx → modals/* + barrel.
 * Run: node scripts/split-smart-file-modals.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/SmartFileModals.tsx');
const modalsDir = path.join(root, 'src/app/components/lawyer/smart-modal/modals');

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

function sliceFunction(name) {
    const idx = exportStarts.findIndex((e) => e.name === name);
    if (idx < 0) throw new Error(`Missing export fn: ${name}`);
    const start = exportStarts[idx].line;
    const end = idx + 1 < exportStarts.length ? exportStarts[idx + 1].line : lines.length;
    let body = lines.slice(start, end).join('\n');
    body = body.replace(/^export const getLegalRoleTitle/, 'export function getLegalRoleTitle');
    return body;
}

fs.mkdirSync(modalsDir, { recursive: true });

const legalRoleTitle = sliceFunction('getLegalRoleTitle');
fs.writeFileSync(
    path.join(root, 'src/app/components/lawyer/smart-modal/smartFile/legalRoleTitle.ts'),
    `${legalRoleTitle}\n`,
);

const SHARED_GLASS_IMPORT = `import {
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
} from '../smartFile/moroccanGlassShell';`;

const files = [
    {
        file: 'extraordinaryAppealModal.tsx',
        header: `import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ExtraordinaryAppealModalProps } from '../smartFile/modalFormTypes';
import { GLASS_CLOSE } from '../smartFile/moroccanGlassShell';

`,
        exports: ['ExtraordinaryAppealModal'],
    },
    {
        file: 'contentEntryModals.tsx',
        header: `import React, { useState } from 'react';
import {
    Calendar,
    CheckSquare,
    DollarSign,
    FileText,
    Paperclip,
    UploadCloud,
    X,
} from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type {
    AddAppointmentModalProps,
    AddDocumentModalProps,
    AddNoteModalProps,
    AddPaymentModalProps,
    AddTaskModalProps,
} from '../smartFile/modalFormTypes';
${SHARED_GLASS_IMPORT.replace('../smartFile/', '../smartFile/')}
import { ManualClassificationPicker } from '../smartFile/ManualClassificationPicker';
import { normalizeManualClassificationTag } from '../smartFile/manualClassificationTemplates';

`,
        exports: ['AddTaskModal', 'AddDocumentModal', 'AddNoteModal', 'AddPaymentModal', 'AddAppointmentModal'],
    },
    {
        file: 'incidentalAndFlowModals.tsx',
        header: `import React, { useState } from 'react';
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
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../LawyerShared';
import { TimelineEvent } from '../../LawyerShared';
import {
    affiliationSideLabel,
    groupPartiesBySide,
} from '../smartFile/incidentalCaseLinking';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type {
    AddIncidentalCaseModalProps,
    AddProvisionalOrderModalProps,
    InterruptionModalProps,
    PauseCaseModalProps,
    ResumeInterruptionModalProps,
    TransitionModalProps,
} from '../smartFile/modalFormTypes';
${SHARED_GLASS_IMPORT}

`,
        exports: [
            'AddIncidentalCaseModal',
            'PauseCaseModal',
            'InterruptionModal',
            'ResumeInterruptionModal',
            'TransitionModal',
            'TrashModal',
            'AddProvisionalOrderModal',
        ],
    },
    {
        file: 'appealObjectionModals.tsx',
        header: `import React, { useState } from 'react';
import { Bell, Calendar, Check, Gavel, Shield, X } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { AppealTransitionModal } from '../AppealTransitionModal';
import type {
    AbsentJudgmentNotificationModalProps,
    InterlocutoryAppealModalProps,
    JudicialNotificationModalProps,
    ObjectionJudgmentModalProps,
    ObjectionRegistrationModalProps,
    OpponentAbsentObjectionModalProps,
} from '../smartFile/modalFormTypes';
${SHARED_GLASS_IMPORT}

`,
        exports: [
            'InterlocutoryAppealModal',
            'AppealRegistrationModal',
            'JudicialNotificationModal',
            'AbsentJudgmentNotificationModal',
            'OpponentAbsentObjectionModal',
            'ObjectionRegistrationModal',
            'ObjectionJudgmentModal',
        ],
    },
    {
        file: 'EditCaseInfoModal.tsx',
        header: `import React, { useState } from 'react';
import {
    ArrowRightLeft,
    Edit2,
    Plus,
    Scale,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { getLegalRole, type Party } from '../../LawyerShared';
import {
    classifyPartySideBucket,
    dedupePartiesList,
    partitionPartiesForHeader,
} from '../smartFile/partyRoleClassification';
import type { EditCaseInfoModalProps } from '../smartFile/modalFormTypes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLegalRoleTitle } from '../smartFile/legalRoleTitle';

`,
        exports: ['EditCaseInfoModal'],
    },
];

for (const spec of files) {
    const chunks = spec.exports.map((name) => {
        let chunk = sliceExport(name);
        if (name === 'AbsentJudgmentNotificationModal' || name === 'OpponentAbsentObjectionModal') {
            chunk = chunk.replace(
                /: import\('\.\/smartFile\/modalFormTypes'\)\.(\w+Props)/g,
                ': $1',
            );
        }
        if (name === 'AppealRegistrationModal') {
            return 'export const AppealRegistrationModal = AppealTransitionModal;';
        }
        return chunk;
    });
    fs.writeFileSync(path.join(modalsDir, spec.file), `${spec.header}\n${chunks.join('\n\n')}\n`);
}

const barrel = `/** Barrel re-exports — prefer direct imports from ./modals/* for code-splitting. */
export { getLegalRoleTitle } from './smartFile/legalRoleTitle';
export { ExtraordinaryAppealModal } from './modals/extraordinaryAppealModal';
export {
    AddTaskModal,
    AddDocumentModal,
    AddNoteModal,
    AddPaymentModal,
    AddAppointmentModal,
} from './modals/contentEntryModals';
export {
    AddIncidentalCaseModal,
    PauseCaseModal,
    InterruptionModal,
    ResumeInterruptionModal,
    TransitionModal,
    TrashModal,
    AddProvisionalOrderModal,
} from './modals/incidentalAndFlowModals';
export {
    InterlocutoryAppealModal,
    AppealRegistrationModal,
    JudicialNotificationModal,
    AbsentJudgmentNotificationModal,
    OpponentAbsentObjectionModal,
    ObjectionRegistrationModal,
    ObjectionJudgmentModal,
} from './modals/appealObjectionModals';
export { EditCaseInfoModal } from './modals/EditCaseInfoModal';
`;

fs.writeFileSync(srcPath, barrel);

const lazyPath = path.join(root, 'src/app/components/lawyer/smart-modal/lazySmartFileModalChunks.tsx');
let lazy = fs.readFileSync(lazyPath, 'utf8');

const lazyMap = {
    EditCaseInfoModal: './modals/EditCaseInfoModal',
    AddTaskModal: './modals/contentEntryModals',
    AddDocumentModal: './modals/contentEntryModals',
    AddNoteModal: './modals/contentEntryModals',
    AddPaymentModal: './modals/contentEntryModals',
    AddIncidentalCaseModal: './modals/incidentalAndFlowModals',
    AddAppointmentModal: './modals/contentEntryModals',
    PauseCaseModal: './modals/incidentalAndFlowModals',
    InterruptionModal: './modals/incidentalAndFlowModals',
    ResumeInterruptionModal: './modals/incidentalAndFlowModals',
    TrashModal: './modals/incidentalAndFlowModals',
    InterlocutoryAppealModal: './modals/appealObjectionModals',
    AppealRegistrationModal: './modals/appealObjectionModals',
    AddProvisionalOrderModal: './modals/incidentalAndFlowModals',
    JudicialNotificationModal: './modals/appealObjectionModals',
    ObjectionRegistrationModal: './modals/appealObjectionModals',
    ObjectionJudgmentModal: './modals/appealObjectionModals',
    AbsentJudgmentNotificationModal: './modals/appealObjectionModals',
    OpponentAbsentObjectionModal: './modals/appealObjectionModals',
    ExtraordinaryAppealModal: './modals/extraordinaryAppealModal',
};

for (const [name, modPath] of Object.entries(lazyMap)) {
    lazy = lazy.replace(
        new RegExp(`import\\('\\./SmartFileModals'\\)\\.then\\(\\(m\\) => \\(\\{ default: m\\.${name} \\}\\)\\)`, 'g'),
        `import('${modPath}').then((m) => ({ default: m.${name} }))`,
    );
}

fs.writeFileSync(lazyPath, lazy);
console.log('Split complete:', Object.keys(lazyMap).length, 'lazy chunks updated');
