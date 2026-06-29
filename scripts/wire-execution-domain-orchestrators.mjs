/**
 * يربط orchestrators المالي/إضبارة/أطراف في useExecutionDashboardState
 * node scripts/wire-execution-domain-orchestrators.mjs
 */
import fs from 'fs';

const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardState.ts';
let src = fs.readFileSync(hookPath, 'utf8');

const importBlock = `    useExecutionDossierLifecyclePanelOrchestrator,
    useExecutionDossierTabOrchestrator,
    useExecutionFinancialOrchestrator,
    useExecutionPartiesOrchestrator,
`;

if (!src.includes('useExecutionFinancialOrchestrator')) {
    src = src.replace(
        '    useExecutionSeizureOrchestrator,\n} from \'../orchestrators\';',
        `    useExecutionSeizureOrchestrator,\n${importBlock}} from '../orchestrators';`,
    );
}

// ── Dossier tabs ──
if (!src.includes('useExecutionDossierTabOrchestrator(')) {
    src = src.replace(
        /    \/\*\* 🆕 التبويبات \(Parent-Child\)[\s\S]*?    \}, \[currentFileId\]\);\n\n    const baseExecutionData/,
        `    /** 🆕 التبويبات (Parent-Child) — orchestrator */
    const { activeTabId, setActiveTabId } = useExecutionDossierTabOrchestrator(String(currentFileId || ''));

    const baseExecutionData`,
    );
}

// ── Parties ──
if (!src.includes('useExecutionPartiesOrchestrator(')) {
    src = src.replace(
        /    \/\*\* عند >2 دائن\/مدين[\s\S]*?    const \[showExtraDebtors, setShowExtraDebtors\] = useState\(false\);\n\n/,
        `    const {
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
    } = useExecutionPartiesOrchestrator(executionFileKey);

`,
    );
}

// ── Dossier lifecycle panel ──
if (!src.includes('useExecutionDossierLifecyclePanelOrchestrator(')) {
    src = src.replace(
        /    const \[dossierStatusDraft, setDossierStatusDraft\] = useState<DossierLifecycleStatus>\('active'\);[\s\S]*?    \} \| null>\(null\);\n    const \[showExecutionTrashModal/,
        `    const {
        dossierStatusDraft,
        setDossierStatusDraft,
        dossierReasonDraft,
        setDossierReasonDraft,
        dossierDateDraft,
        setDossierDateDraft,
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase,
        setDossierLifecyclePanelPhase,
        dossierPendingStatus,
        setDossierPendingStatus,
        dossierLifecyclePopoverRef,
        dossierLifecyclePanelPortalRef,
        dossierLifecyclePopStyle,
        setDossierLifecyclePopStyle,
        closeDossierLifecyclePanel,
    } = useExecutionDossierLifecyclePanelOrchestrator();

    const [showExecutionTrashModal`,
    );
}

// ── Financial hub ──
if (!src.includes('useExecutionFinancialOrchestrator(')) {
    src = src.replace(
        /    \/\/ 🆕 V10\.8: ACCORDION STATES[\s\S]*?    \}, \[\]\);\n\n    useEffect\(\(\) => \{\n        const handler = \(e: Event\) => \{\n            const ce = e as CustomEvent<\{ executionId\?: string; decisionId\?: string; tab\?: string \}>/,
        `    const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = useExecutionFinancialOrchestrator({ setShowUnifiedExecutionModal });

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; tab?: string }>`,
    );
}

// Remove duplicate closeDossierLifecyclePanel
src = src.replace(
    /\n    const closeDossierLifecyclePanel = useCallback\(\(\) => \{\n        setDossierLifecyclePanelOpen\(false\);\n        setDossierLifecyclePanelPhase\('menu'\);\n        setDossierPendingStatus\(null\);\n    \}, \[\]\);\n/,
    '\n',
);

// Remove dossier panel UX effects (now in orchestrator)
src = src.replace(
    /\n    useEffect\(\(\) => \{\n        if \(!dossierLifecyclePanelOpen\) return;\n        const onDocMouseDown = \(e: MouseEvent\) => \{[\s\S]*?\}, \[dossierLifecyclePanelOpen, dossierLifecyclePanelPhase, dossierStatusDraft\]\);\n\n    const \{\n        showEditDossierMetaModal/,
    '\n\n    const {\n        showEditDossierMetaModal',
);

// Remove parties reset effect
src = src.replace(
    /\n    useEffect\(\(\) => \{\n        setShowExtraCreditors\(false\);\n        setShowExtraDebtors\(false\);\n    \}, \[executionFileKey\]\);\n/,
    '\n',
);

fs.writeFileSync(hookPath, src);
console.log('wired domain orchestrators');
