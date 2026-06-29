import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const backupPath = '_backup_core_phaseC.ts';

let core = fs.readFileSync(corePath, 'utf8');
const backup = fs.readFileSync(backupPath, 'utf8');

// --- Phase B: scope bags from backup ---
const backupScopeStart = backup.indexOf('    const syncSeizedAssets = useCallback');
const backupScopeEnd = backup.indexOf('    const executionModalFlags = {');
if (backupScopeStart < 0 || backupScopeEnd < 0) throw new Error('backup scope block not found');
const scopeBlock = backup.slice(backupScopeStart, backupScopeEnd);

const coreFollowupStart = core.indexOf('    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({');
const coreModalFlagsStart = core.indexOf('    const executionModalFlags = {');
if (coreFollowupStart < 0 || coreModalFlagsStart < 0) throw new Error('core followup block not found');
core =
    core.slice(0, coreFollowupStart) + scopeBlock + core.slice(coreModalFlagsStart);

// --- Phase B: clean dynamic scope call ---
const dynOldStart = core.indexOf('                buildExecutionDashboardCoreDynamicScope({');
const dynOldEnd = core.indexOf('                }),', dynOldStart);
if (dynOldStart < 0 || dynOldEnd < 0) throw new Error('dynamic scope block not found');
const dynNew = `                buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
                    financialScopeBag,
                    timelineDossierScopeBag,
                    decisionsSeizureEvictionScopeBag,
                    workspaceScopeBag,
                }),`;
core = core.slice(0, dynOldStart) + dynNew + core.slice(dynOldEnd + '                }),'.length);

// --- import: scope bags ---
core = core.replace(
    "import { buildExecutionDashboardFollowupScopeBag } from './executionDashboardCore/buildExecutionDashboardFollowupScopeBag';",
    "import { buildExecutionDashboardCoreScopeBags } from './executionDashboardCore/buildExecutionDashboardCoreScopeBags';",
);

// --- Slice 12 imports ---
if (!core.includes('useExecutionDashboardVoluntaryPeriodHandlers')) {
    core = core.replace(
        "import { useExecutionDashboardHeirsNotificationHandlers } from './executionDashboardCore/useExecutionDashboardHeirsNotificationHandlers';",
        `import { useExecutionDashboardHeirsNotificationHandlers } from './executionDashboardCore/useExecutionDashboardHeirsNotificationHandlers';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './executionDashboardCore/useExecutionDashboardVoluntaryPeriodHandlers';
import { useExecutionDashboardGracePeriodEndHandler } from './executionDashboardCore/useExecutionDashboardGracePeriodEndHandler';
import { useExecutionDashboardRealEstateSeizureModalHandlers } from './executionDashboardCore/useExecutionDashboardRealEstateSeizureModalHandlers';`,
    );
}

// --- voluntary period handlers ---
const volStart = core.indexOf('    const handleDeclareEvictionVoluntaryPeriodEnd = useCallback(() => {');
const volEnd = core.indexOf('    useLayoutEffect(() => {', volStart);
if (volStart < 0 || volEnd < 0) throw new Error('voluntary period block not found');
const volReplacement = `    const {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
    } = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData,
        voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
    });

    `;
core = core.slice(0, volStart) + volReplacement + core.slice(volEnd);

// --- grace period end handler ---
const graceStart = core.indexOf('    const handleEndGracePeriod = () => {');
const graceEnd = core.indexOf('    const { appendEvictionProcedure } = useEvictionProcedures(', graceStart);
if (graceStart < 0 || graceEnd < 0) throw new Error('handleEndGracePeriod block not found');
const graceReplacement = `    const { handleEndGracePeriod } = useExecutionDashboardGracePeriodEndHandler({
        debtorNotificationDate,
        executionFeeInjected,
        calculatedExecutionFee,
        pushTimelineEvent,
        showToast,
        setGracePeriodActive,
        setGracePeriodEnded,
        setDebtorNotificationDate,
        setExecutionFeeInjected,
        setLastActionDate,
    });

    `;
core = core.slice(0, graceStart) + graceReplacement + core.slice(graceEnd);

// --- real estate seizure modal ---
const reStart = core.indexOf('    const realEstateModalInitial = useMemo(() => {');
const reEnd = core.indexOf('    const { saveThirdPartySeizureForDecision } = useExecutionDashboardThirdPartySeizureHandlers({', reStart);
if (reStart < 0 || reEnd < 0) throw new Error('real estate block not found');
const reReplacement = `    const { realEstateModalInitial, saveRealEstateSeizureFromModal } =
        useExecutionDashboardRealEstateSeizureModalHandlers({
            decisionsStorageExecutionId,
            realEstateSeizureAssets,
            realEstateSeizureModalDecisionId,
            realEstateSeizureSnapshotRef,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
            setRealEstateSeizureAssets,
            setShowRealEstateSeizureModal,
        });

    `;
core = core.slice(0, reStart) + reReplacement + core.slice(reEnd);

// Remove grace summoning imports from core if only used by extracted handler
core = core.replace(
    `import {
    buildEndGracePeriodMergePatch,
    buildGracePeriodEndedTimelineEvent,
    computeForcedDebtorNotificationYmd,
} from './executionDashboardCore/executionDashboardGraceSummoning';
`,
    '',
);

fs.writeFileSync(corePath, core, 'utf8');
console.log('patched Phase B + Slice 12');
