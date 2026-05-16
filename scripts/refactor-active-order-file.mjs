import fs from 'fs';
import path from 'path';

const root = path.resolve('src/app/components/lawyer');
const srcPath = path.join(root, 'Dashboard_Active_Order_File.tsx');
const destPath = path.join(root, 'Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx');

let content = fs.readFileSync(srcPath, 'utf8');

const newHeader = `import React, { useEffect, useMemo, useRef, useState, startTransition } from 'react';
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
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
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

`;

// Replace header through hearing utils block
content = content.replace(/^import[\s\S]*?from '\.\/Form_Urgent_Actions\/constants';\s*/m, '');
content = content.replace(/^interface Props[\s\S]*?function isGrievancePleadingClosedSession[\s\S]*?\}\s*/m, '');
content = content.replace(
    /^export const Dashboard_Active_Order_File: React\.FC<Props>/m,
    'export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps>',
);

// Remove duplicate top-level types/utils if still present (file may have been partially processed)
const blocksToRemove = [
    /^interface Props[\s\S]*?^type ExpertModule[\s\S]*?^};\s*/m,
    /^\/\*\* يرفض أسباب[\s\S]*?^function isGrievancePleadingClosedSession[\s\S]*?^\}\s*/m,
];

for (const re of blocksToRemove) {
    content = content.replace(re, '');
}

// Remove inline formatters inside component (pad2 through formatRequestNumberText)
content = content.replace(
    /\n    const pad2 = \(n: number\)[\s\S]*?    const formatRequestNumberText = \(rawNumber[\s\S]*?    \};\n/,
    '\n',
);

// Remove inline todayYmd block - use imported todayYmd()
content = content.replace(
    /\n    const todayYmd = \(\(\) => \{[\s\S]*?    \}\)\(\);\n/,
    '\n    const todayYmdValue = todayYmd();\n',
);
content = content.replace(/\btodayYmd\b(?!Value|\()/g, 'todayYmdValue');

// Remove inline maxYmd and safeMaxToday
content = content.replace(/\n    const maxYmd = \(a\?: string, b\?: string\) => \{[\s\S]*?    \};\n    const safeMaxToday = \(min\?: string\) => \{[\s\S]*?    \};\n/, '\n');

// Remove inline addDaysYmd
content = content.replace(/\n    const addDaysYmd = \(ymd: string, durationDays: number\) => \{[\s\S]*?    \};\n/, '\n');

// Remove ordinalNames/ordinalOf duplicate
content = content.replace(/\n    const ordinalNames = \[[\s\S]*?    const ordinalOf = \(index: number\) => ordinalNames\[index\] \?\? String\(index \+ 1\);\n/, '\n');

// Remove getDynamicPartyLabels duplicate
content = content.replace(
    /\n    const getDynamicPartyLabels = \(procedureType: string\) => \{[\s\S]*?    \};\n    const partyLabels = useMemo\(\(\) => getDynamicPartyLabels/,
    '\n    const partyLabels = useMemo(() => getDynamicPartyLabels',
);

// Remove DatePickerField inline component
content = content.replace(
    /\n    const DatePickerField: React\.FC<\{[\s\S]*?    \}> = \(\{ value, onValueChange, min, max, disabled, inputClassName, wrapperClassName \}\) => \{[\s\S]*?    \};\n/,
    '\n',
);

// Remove PartyCardItem inline component
content = content.replace(
    /\n    const PartyCardItem = \(\{[\s\S]*?        \);\n    \};\n\n    const openPartyEdit/,
    '\n\n    const openPartyEdit',
);

const finalContent = newHeader + content.trimStart();
fs.writeFileSync(destPath, finalContent);

const indexContent = `export { Dashboard_Active_Order_File } from './ActiveOrderFileRoot';
export type { ActiveOrderFileProps } from './types';
`;

fs.writeFileSync(path.join(root, 'Dashboard_Active_Order_File/index.ts'), indexContent);

const shimContent = `export { Dashboard_Active_Order_File } from './Dashboard_Active_Order_File';
export type { ActiveOrderFileProps } from './Dashboard_Active_Order_File/types';
`;

fs.writeFileSync(srcPath, shimContent);

console.log('Refactor written:', destPath);
console.log('Shim written:', srcPath);
