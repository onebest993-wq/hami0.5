/**
 * One-time splitter: SmartFileModalsPortal.tsx → layout/portal/* sections.
 * Run: node scripts/split-smart-file-modals-portal.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const portalDir = path.join(root, 'src/app/components/lawyer/smart-modal/layout');
const outDir = path.join(portalDir, 'portal');
const srcPath = path.join(portalDir, 'SmartFileModalsPortal.tsx');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

function sliceLines(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

fs.mkdirSync(outDir, { recursive: true });

const typesBlock = `${sliceLines(1, 8)}
import type { CaseStage, IncidentalCase, Task, TimelineEvent } from '../../../LawyerShared';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type { JudgmentPayload } from '../../smartFile/judgmentTypes';
import type { AppealRouteContext } from '../../smartFile/appealRouteEligibility';
import type { SmartFileCaseFormData } from '../../smartFile/modalFormTypes';
import type { ConsolidationCandidate } from '../../smartFile/caseConsolidationLinking';

${sliceLines(10, 23)}

${sliceLines(64, 188)}
`;

fs.writeFileSync(path.join(outDir, 'smartFileModalsPortalTypes.ts'), typesBlock);

const sections = [
    {
        file: 'SmartFileModalsContentSection.tsx',
        start: 343,
        end: 443,
        imports: `import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { LazyEditCaseInfoModal, LazyAddDocumentModal, LazyAddNoteModal, LazyAddPaymentModal, LazyAddIncidentalCaseModal, LazyFastTrackModal, LazyAttachmentShieldModal, LazyAddAppointmentModal } from '../../lazySmartFileModalChunks';
import type { SmartFileCaseFormData } from '../../smartFile/modalFormTypes';

export function SmartFileModalsContentSection(props: SmartFileModalsPortalProps) {
    const {
        showEditInfoModal,
        setShowEditInfoModal,
        showDocModal,
        setShowDocModal,
        showNoteModal,
        setShowNoteModal,
        showPaymentModal,
        setShowPaymentModal,
        showIncidentalModal,
        setShowIncidentalModal,
        showFastTrackModal,
        setShowFastTrackModal,
        showAttachmentModal,
        setShowAttachmentModal,
        showApptModal,
        setShowApptModal,
        editingEvent,
        setEditingEvent,
        editingIncidental,
        setEditingIncidental,
        editingFastTrack,
        setEditingFastTrack,
        editingAttachment,
        setEditingAttachment,
        displayStage,
        currentStage,
        parentData,
        handlers: h,
    } = props;

    return (
        <>
`,
        close: `        </>
    );
}
`,
    },
    {
        file: 'SmartFileModalsFlowSection.tsx',
        start: 444,
        end: 571,
        imports: `import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import {
    LazyPauseCaseModal,
    LazyInterruptionModal,
    LazyResumeInterruptionModal,
    LazyInterlocutoryAppealModal,
    LazyObjectionRegistrationModal,
    LazyObjectionJudgmentModal,
    LazyAbsentJudgmentNotificationModal,
    LazyOpponentAbsentObjectionModal,
    LazyTrashModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsFlowSection(props: SmartFileModalsPortalProps) {
    const {
        isTrashOpen,
        setIsTrashOpen,
        showPauseModal,
        setShowPauseModal,
        showInterruptionModal,
        setShowInterruptionModal,
        showResumeInterruptionModal,
        setShowResumeInterruptionModal,
        showInterlocutoryModal,
        setShowInterlocutoryModal,
        showObjectionRegistrationModal,
        setShowObjectionRegistrationModal,
        showObjectionJudgmentModal,
        setShowObjectionJudgmentModal,
        showAbsentJudgmentNotificationModal,
        setShowAbsentJudgmentNotificationModal,
        showOpponentAbsentObjectionModal,
        setShowOpponentAbsentObjectionModal,
        editingEvent,
        setEditingEvent,
        pauseReason,
        linkedCaseNo,
        interruptionData,
        deletedEvents,
        currentStage,
        handlers: h,
    } = props;

    return (
        <>
`,
        close: `        </>
    );
}
`,
    },
    {
        file: 'SmartFileModalsJudgmentSection.tsx',
        start: 572,
        end: 659,
        imports: `import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import {
    LazySmartJudgmentModal,
    LazyAppealTransitionModal,
    LazyCrossAppealModal,
    LazyAddProvisionalOrderModal,
    LazyJudicialNotificationModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsJudgmentSection(props: SmartFileModalsPortalProps) {
    const {
        showJudgmentModal,
        setShowJudgmentModal,
        showAppealModal,
        setShowAppealModal,
        showAppealTransitionModal,
        setShowAppealTransitionModal,
        showCrossAppealModal,
        setShowCrossAppealModal,
        showProvisionalOrderModal,
        setShowProvisionalOrderModal,
        showNotificationModal,
        setShowNotificationModal,
        tempJudgmentData,
        setTempJudgmentData,
        currentStage,
        stages,
        activeStageIndex,
        parentData,
        handlers: h,
        appealRoute,
    } = props;

    const crossAppealEligibility = resolveCrossAppealEligibility({
        appealStage: currentStage,
        stages,
        appealStageIndex: activeStageIndex,
    });

    return (
        <>
`,
        close: `        </>
    );
}
`,
    },
    {
        file: 'SmartFileModalsAdminSection.tsx',
        start: 660,
        end: 761,
        imports: `import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import {
    LazyExtraordinaryAppealModal,
    LazyMaterialErrorCorrectionModal,
    LazyJudgeRecusalModal,
    LazyTransferJurisdictionModal,
    LazyCaseConsolidationModal,
    LazyCaseLinkModal,
    LazyCorrespondenceModal,
    LazyAttorneyResignationModal,
    LazyExecutionTransferModal,
    LazyAppealBriefOutcomeModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsAdminSection(props: SmartFileModalsPortalProps) {
    const {
        showExtraordinaryAppealModal,
        setShowExtraordinaryAppealModal,
        showMaterialErrorModal,
        setShowMaterialErrorModal,
        showJudgeRecusalModal,
        setShowJudgeRecusalModal,
        showTransferJurisdictionModal,
        setShowTransferJurisdictionModal,
        showCaseConsolidationModal,
        setShowCaseConsolidationModal,
        showCaseLinkModal,
        setShowCaseLinkModal,
        showCorrespondenceModal,
        setShowCorrespondenceModal,
        showAttorneyResignationModal,
        setShowAttorneyResignationModal,
        showExecutionTransferModal,
        setShowExecutionTransferModal,
        appealOutcomeTask,
        setAppealOutcomeTask,
        currentStage,
        consolidationCurrentFileId,
        consolidationCurrentCaseNo,
        consolidationCurrentClientName,
        consolidationCurrentCourt,
        consolidationCurrentStageLabel,
        consolidationCandidates,
        onConsolidationCreateNew,
        onConsolidationMergeExisting,
        onConsolidationExternalRef,
        caseLinkCurrentFileId,
        caseLinkCurrentCaseNo,
        caseLinkCandidates,
        onCaseLinkExisting,
        onCaseLinkExternal,
        handlers: h,
    } = props;

    return (
        <>
`,
        close: `        </>
    );
}
`,
    },
];

for (const spec of sections) {
    const body = sliceLines(spec.start, spec.end);
    const content = `${spec.imports}${body}\n${spec.close}`;
    fs.writeFileSync(path.join(outDir, spec.file), content);
}

const shell = `import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { LazyLegalActionsMenu } from '../lazySmartFileModalWidgets';
import { LazyAddTaskModal } from '../lazySmartFileModalChunks';
import type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
export type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
import { SmartFileModalsContentSection } from './portal/SmartFileModalsContentSection';
import { SmartFileModalsFlowSection } from './portal/SmartFileModalsFlowSection';
import { SmartFileModalsJudgmentSection } from './portal/SmartFileModalsJudgmentSection';
import { SmartFileModalsAdminSection } from './portal/SmartFileModalsAdminSection';

const MODAL_LAZY_FALLBACK = null;

export function SmartFileModalsPortal(props: SmartFileModalsPortalProps) {
    const {
        isViewingArchived,
        isActionsMenuOpen,
        setIsActionsMenuOpen,
        showTaskModal,
        setShowTaskModal,
        editingTask,
        setEditingTask,
        displayStage,
        parentData,
        handlers: h,
        setShowNotificationModal,
        setShowExtraordinaryAppealModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowCaseLinkModal,
        setShowCorrespondenceModal,
        setShowAttorneyResignationModal,
        setShowExecutionTransferModal,
    } = props;

    return (
        <AnimatePresence>
            <Suspense fallback={null} key="actions-menu-suspense">
                <LazyLegalActionsMenu
                    isOpen={isActionsMenuOpen}
                    onClose={() => setIsActionsMenuOpen(false)}
                    onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                    onAction={h.handleQuickAction}
                    currentStageName={displayStage?.stageName}
                    displayStage={displayStage}
                    parentData={parentData}
                    setShowExtraordinaryAppealModal={
                        !isViewingArchived ? setShowExtraordinaryAppealModal : undefined
                    }
                    setShowTransferJurisdictionModal={
                        !isViewingArchived ? setShowTransferJurisdictionModal : undefined
                    }
                    setShowCaseConsolidationModal={
                        !isViewingArchived ? setShowCaseConsolidationModal : undefined
                    }
                    setShowCaseLinkModal={!isViewingArchived ? setShowCaseLinkModal : undefined}
                    setShowCorrespondenceModal={
                        !isViewingArchived ? setShowCorrespondenceModal : undefined
                    }
                    setShowAttorneyResignationModal={
                        !isViewingArchived ? setShowAttorneyResignationModal : undefined
                    }
                    setShowExecutionTransferModal={
                        !isViewingArchived ? setShowExecutionTransferModal : undefined
                    }
                />
            </Suspense>
            <Suspense fallback={MODAL_LAZY_FALLBACK} key="modals-suspense">
                <SmartFileModalsContentSection {...props} />
                <SmartFileModalsFlowSection {...props} />
                <SmartFileModalsJudgmentSection {...props} />
                <SmartFileModalsAdminSection {...props} />
            </Suspense>
            {showTaskModal && (
                <Suspense fallback={null}>
                    <LazyAddTaskModal
                        key="add-task"
                        isOpen={showTaskModal}
                        onClose={() => {
                            setShowTaskModal(false);
                            setEditingTask(null);
                        }}
                        onAdd={h.handleAddTask}
                        editMode={!!editingTask}
                        editData={editingTask}
                    />
                </Suspense>
            )}
        </AnimatePresence>
    );
}
`;

fs.writeFileSync(srcPath, shell);

const lazyPath = path.join(root, 'src/app/components/lawyer/smart-modal/lazySmartFileModalChunks.tsx');
let lazy = fs.readFileSync(lazyPath, 'utf8');

const flowModalMap = {
    AddIncidentalCaseModal: 'AddIncidentalCaseModal',
    PauseCaseModal: 'PauseCaseModal',
    InterruptionModal: 'InterruptionModal',
    ResumeInterruptionModal: 'ResumeInterruptionModal',
    TrashModal: 'TrashModal',
    AddProvisionalOrderModal: 'AddProvisionalOrderModal',
};

for (const [name, file] of Object.entries(flowModalMap)) {
    lazy = lazy.replace(
        `import('./modals/incidentalAndFlowModals').then((m) => ({ default: m.${name} }))`,
        `import('./modals/flow-modals/${file}').then((m) => ({ default: m.${name} }))`,
    );
}

fs.writeFileSync(lazyPath, lazy);
console.log('SmartFileModalsPortal split complete:', sections.length, 'sections');
