import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const backupPath = '_backup_core_phaseC.ts';

let core = fs.readFileSync(corePath, 'utf8');
const backup = fs.readFileSync(backupPath, 'utf8');

function extractBetween(text, startMarker, endMarker, label) {
    const start = text.indexOf(startMarker);
    if (start < 0) throw new Error(`${label}: start not found`);
    const end = text.indexOf(endMarker, start);
    if (end < 0) throw new Error(`${label}: end not found`);
    return text.slice(start, end);
}

function replaceBetween(text, startMarker, endMarker, replacement, label) {
    const start = text.indexOf(startMarker);
    if (start < 0) throw new Error(`${label}: start not found`);
    const end = text.indexOf(endMarker, start);
    if (end < 0) throw new Error(`${label}: end not found`);
    return text.slice(0, start) + replacement + text.slice(end);
}

// --- imports: 7 handler hooks ---
const hookImports = `import { useExecutionDashboardGuarantorFollowupHandlers } from './executionDashboardCore/useExecutionDashboardGuarantorFollowupHandlers';
import { useExecutionDashboardEvictionFinancialHandlers } from './executionDashboardCore/useExecutionDashboardEvictionFinancialHandlers';
import { useExecutionDashboardModuleExpenseHandlers } from './executionDashboardCore/useExecutionDashboardModuleExpenseHandlers';
import { useExecutionDashboardSeizureAssetModalHandlers } from './executionDashboardCore/useExecutionDashboardSeizureAssetModalHandlers';
import { useExecutionDashboardNotesTasksHandlers } from './executionDashboardCore/useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './executionDashboardCore/useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from './executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers';`;

if (!core.includes('useExecutionDashboardNotesTasksHandlers')) {
    core = core.replace(
        "import { useExecutionDashboardRealEstateSeizureModalHandlers } from './executionDashboardCore/useExecutionDashboardRealEstateSeizureModalHandlers';",
        `import { useExecutionDashboardRealEstateSeizureModalHandlers } from './executionDashboardCore/useExecutionDashboardRealEstateSeizureModalHandlers';
${hookImports}`,
    );
}

// --- remove dead seized-property runner imports (hook owns them) ---
core = core.replace(
    `import { saveSeizedPropertyAuctionSessionResult as runSaveSeizedPropertyAuctionSessionResult } from './executionDashboardCore/executionDashboardAuctionSessionResult';
import {
    saveSeizureMarkConfirmation as runSaveSeizureMarkConfirmation,
    saveSeizedPropertyStepDetails as runSaveSeizedPropertyStepDetails,
    savePublicationDetails as runSavePublicationDetails,
} from './executionDashboardCore/executionDashboardSeizedPropertyModals';
`,
    '',
);

core = core.replace(
    `import {
    markSpecificDeliveryItemDeclaredDestroyed,
    readSpecificDeliveryItems,
} from '@/app/utils/specificDeliveryItemsUtils';
`,
    '',
);

// --- remove duplicate inline police helpers (police hook exports them) ---
core = core.replace(
    `    const openPoliceAssistanceFromBadge = useCallback(() => {
        const st = executionDataRef.current?.eviction_police_assistance;
        if (!st || st.completedAt) return;
        setPoliceAssistanceDecisionId(st.decisionId);
        setPoliceAssistanceRequestTitle('القوة الجبرية');
        setPoliceAssistanceAgencyDraft(st.agencyName);
        setPoliceAssistanceModalOpen(true);
    }, []);
    
    
`,
    '',
);

core = core.replace(
    `    const openPoliceAssistanceDetailsForDecision = useCallback(
        (input: { decisionId: string; requestTitle: string }) => {
            void input;
            setShowDecisionsModal(false);
            setShowUnifiedExecutionModal(true);
            setUnifiedModalTab('coercive');
            setFollowupExpandProcedureKey('police');
        },
        [setShowDecisionsModal]
    );

`,
    '',
);

// --- 1) notes + appointment hooks ---
const notesAppointmentBlock = extractBetween(
    backup,
    '    const {\n        handleSaveNote,',
    '    // âœ… OPTIMIZED: useCallback\n    const {\n        handlePayment,',
    'notes+appointment',
);

core = replaceBetween(
    core,
    "    const noteSuccessMsgRef = useRef('');",
    '    // ✅ OPTIMIZED: useCallback\n    const handleSaveAppointment = useCallback(() => {',
    notesAppointmentBlock,
    'notes+appointment replace',
);

// remove leftover inline handleSaveAppointment through its closing
core = replaceBetween(
    core,
    '    // ✅ OPTIMIZED: useCallback\n    const handleSaveAppointment = useCallback(() => {',
    '    const {\n        handlePayment,',
    '    const {\n        handlePayment,',
    'appointment cleanup',
);

// --- 2) eviction residential + police (replace inline blocks) ---
const evictionPoliceBlock =
    extractBetween(
        backup,
        '    const {\n        residentialGraceModalShowPrimarySave,',
        '    const {\n        saveBreakInventoryLedgerEntry,',
        'eviction residential',
    ) +
    extractBetween(
        backup,
        '    const {\n        openPoliceAssistanceFromBadge,',
        '    const {\n        timelineEditDraft,',
        'police handlers',
    );

core = replaceBetween(
    core,
    '    const residentialGraceModalShowPrimarySave = useMemo(() => {',
    '    const {\n        saveBreakInventoryLedgerEntry,',
    evictionPoliceBlock,
    'eviction+police replace',
);

// --- 3) guarantor hook ---
const guarantorBlock = extractBetween(
    backup,
    '    const {\n        requestFollowupSeizureDecision,',
    '    const {\n        handleEvictionLedgerActivated,',
    'guarantor',
);

core = replaceBetween(
    core,
    '    const requestFollowupSeizureDecision = useCallback(',
    '    const handleEvictionUnlockAssetsTab = useCallback(() => {',
    guarantorBlock,
    'guarantor replace',
);

// --- 4) eviction financial + module expense (keep handleEvictionUnlockAssetsTab) ---
const unlockBlock = extractBetween(
    core,
    '    const handleEvictionUnlockAssetsTab = useCallback(() => {',
    '    const handleEvictionLedgerActivated = useCallback(() => {',
    'unlock preserve',
);

const financialModuleBlock = extractBetween(
    backup,
    '    const {\n        handleEvictionLedgerActivated,',
    '    useEvictionLawyerFeeOutcome({',
    'financial+module',
);

core = replaceBetween(
    core,
    '    const handleEvictionUnlockAssetsTab = useCallback(() => {',
    '    useEvictionLawyerFeeOutcome({',
    unlockBlock + financialModuleBlock,
    'financial+module replace',
);

// --- 5) seizure asset modal hook ---
const seizureBlock = extractBetween(
    backup,
    '    const {\n        focusSeizurePropertyInlineCompletion,',
    '    const { saveCoerciveAction, clearActiveSalarySeizurePath } = useExecutionDashboardCoerciveActionBridge({',
    'seizure modal',
);

core = replaceBetween(
    core,
    '    const focusSeizurePropertyInlineCompletion = useCallback(',
    '    const { saveCoerciveAction, clearActiveSalarySeizurePath } = useExecutionDashboardCoerciveActionBridge({',
    seizureBlock,
    'seizure replace',
);

// --- remove stale duplicate complete* callbacks if patch re-run ---
core = core.replace(
    /\n    const completeEvictionResidentialGrace = useCallback\([\s\S]*?\n    \}, \[evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast\]\);\n\n    const completePoliceAssistance = useCallback\([\s\S]*?\n    \}, \[evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast\]\);\n/,
    '\n',
);

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice13-core: OK');
console.log('lines:', core.split('\n').length);
