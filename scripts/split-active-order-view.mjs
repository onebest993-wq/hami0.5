import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer/Dashboard_Active_Order_File');
const src = fs.readFileSync(path.join(root, 'ActiveOrderFileRoot.tsx'), 'utf8');
const lines = src.split(/\r?\n/);

const exportLine = lines.findIndex((l) => l.includes('export const Dashboard_Active_Order_File'));
const bodyStart = lines.findIndex((l, i) => i > exportLine && l.includes('const fd = fileData'));
const returnLine = lines.findIndex((l, i) => i > bodyStart && /^\s+return \(\s*$/.test(l));
const confirmLine = lines.findIndex((l, i) => i > bodyStart && i < returnLine && l.trim().startsWith('const confirmPortal'));

if (bodyStart < 0 || returnLine < 0 || confirmLine < 0) {
    console.error('markers', { bodyStart, returnLine, confirmLine });
    process.exit(1);
}

const bodyLines = lines.slice(bodyStart, confirmLine);
const viewLines = lines.slice(returnLine + 1, lines.length - 2); // exclude closing `};`

const names = new Set();
for (const line of bodyLines) {
    let m = line.match(/^\s*const \[(\w+),\s*(\w+)\]/);
    if (m) {
        names.add(m[1]);
        names.add(m[2]);
        continue;
    }
    m = line.match(/^\s*const (\w+) =/);
    if (m && !['fd'].includes(m[1])) {
        names.add(m[1]);
        continue;
    }
    m = line.match(/^\s*function (\w+)\s*\(/);
    if (m) names.add(m[1]);
}

const sortedNames = [...names].sort((a, b) => b.length - a.length);

const hookHeader = `import React, { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft, X, FileText, User, Building2, Calendar, MapPin, Phone,
    Scale, AlertTriangle, Check, Ban, Briefcase,
    DollarSign, FileCheck, Printer, Plus, Info, Pencil
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { UrgentActionsDB, uuidv4 } from '@/app/services/urgent-actions-db';
import { getActiveDate } from '@/app/utils/hearingDates';
import { Modal_Quick_Log } from '../Modal_Quick_Log';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
    actionTypeOptions,
    isIqrarRequest,
    JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
    URGENT_PETITION_PRIMARY,
} from '../Form_Urgent_Actions/constants';
import type {
    ActiveOrderFileProps,
    CaseEvent,
    CaseHearing,
    CassationData,
    CassationDecision,
    DeadlinePhase,
    ExecutionData,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    HearingStage,
    CaseNote,
    CaseAttachment,
    CaseFollowup,
    PreDecisionHearingOutcomeKind,
} from './types';
import {
    isAdjournReasonValid,
    getPreDecisionHearingOutcome,
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from './utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from './constants/hearingOutcomes';
import {
    cassationDecisionText,
    eventKindMeta,
    eventDayKey,
    formatDateText,
    formatDateTimeText,
    formatTimeText,
    formatRequestNumberText,
} from './utils/formatters';
import { getDynamicPartyLabels, ordinalOf } from './utils/partyLabels';
import { addDaysYmd, maxYmd, safeMaxToday, todayYmd } from './utils/ymd';
import { PartyCardItem } from './components/PartyCardItem';
import { DatePickerField } from './components/DatePickerField';
import { ConfirmDialogPortal } from './components/ConfirmDialogPortal';
import type { ActiveOrderFileModel } from './context/ActiveOrderFileContext';

export function useActiveOrderFileModel(props: ActiveOrderFileProps): ActiveOrderFileModel {
    const { fileData, onClose, onCaseUpdated } = props;
`;

const hookFooter = `
    const confirmPortal = (
        <ConfirmDialogPortal
            open={confirmDialog.open}
            message={confirmDialog.message}
            onCancel={() => resolveConfirm(false)}
            onConfirm={() => resolveConfirm(true)}
        />
    );

    return {
        fileData,
        onClose,
        onCaseUpdated,
        confirmPortal,
        ${[...names].sort().join(',\n        ')},
    };
}
`;

const hookBody = bodyLines.slice(1).join('\n'); // skip duplicate fd line — re-add in header
const hookContent = hookHeader + hookBody + hookFooter;

fs.writeFileSync(path.join(root, 'hooks/useActiveOrderFileModel.ts'), hookContent);

let viewBody = viewLines.join('\n');
for (const name of sortedNames) {
    const re = new RegExp(`\\b${name}\\b`, 'g');
    viewBody = viewBody.replace(re, `m.${name}`);
}
// props from hook
viewBody = viewBody.replace(/\bm\.fileData\b/g, 'fileData');
viewBody = viewBody.replace(/\bm\.onClose\b/g, 'onClose');
viewBody = viewBody.replace(/\bm\.onCaseUpdated\b/g, 'onCaseUpdated');
viewBody = viewBody.replace(/\bm\.confirmPortal\b/g, 'confirmPortal');

const viewHeader = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, Check, Info, Pencil, Printer, Plus, Calendar } from 'lucide-react';
import { Modal_Quick_Log } from '../Modal_Quick_Log';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { PartyCardItem } from '../components/PartyCardItem';
import { DatePickerField } from '../components/DatePickerField';
import { useActiveOrderFileContext } from '../context/ActiveOrderFileContext';
import { ActiveOrderFileHeader } from '../layout/ActiveOrderFileHeader';
import { ArchiveBanner } from '../layout/ArchiveBanner';
import { PartiesSidebar } from '../layout/PartiesSidebar';
import { MetaEditModal } from '../modals/MetaEditModal';
import { PartyEditModal } from '../modals/PartyEditModal';

export function ActiveOrderFileView() {
    const m = useActiveOrderFileContext();
    if (!m) return null;
    const { fileData, onClose, onCaseUpdated, confirmPortal } = m;

    return (
`;

const viewContent = viewHeader + viewBody + '\n    );\n}\n';
fs.writeFileSync(path.join(root, 'view/ActiveOrderFileView.tsx'), viewContent);

const rootContent = `import React from 'react';
import type { ActiveOrderFileProps } from './types';
import { ActiveOrderFileProvider } from './context/ActiveOrderFileProvider';
import { ActiveOrderFileView } from './view/ActiveOrderFileView';

export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps> = (props) => (
    <ActiveOrderFileProvider {...props}>
        <ActiveOrderFileView />
    </ActiveOrderFileProvider>
);
`;

fs.writeFileSync(path.join(root, 'ActiveOrderFileRoot.tsx'), rootContent);
console.log('split complete', { names: names.size, viewLines: viewLines.length });
