import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const panelPath = path.join(root, 'src/app/components/lawyer/smart-modal/layout/SmartFileMainPanel.tsx');
let text = fs.readFileSync(panelPath, 'utf8');
const lines = text.split(/\r?\n/);

// Keep lines 1-52 (imports before utils), skip 54-146 (utils+types), keep from 148
const head = lines.slice(0, 52).join('\n');
const tailStart = lines.findIndex((l) => l.includes('export function SmartFileMainPanel'));
const tailFromReturn = lines.findIndex((l) => l.trim() === 'return (');

const newHead = `import React, { Suspense } from 'react';
import { ArrowRightLeft, ChevronDown } from 'lucide-react';
import {
    LazySmartHeader,
    LazyQuickActions,
    LazyToDoList,
    LazySessionAndRequestsHub,
    LazyIncidentalCasesManager,
    LazyTimelineFeed,
} from '../lazySmartFileModalWidgets';
import { storedFastTrackStatus } from '../smartFile/fastTrackStatus';
import type { IncidentalStatus, Task, TimelineEvent } from '../../LawyerShared';
import { buildSessionRecordPayload, isOpponentProceedingsEvent, isSessionTimelineEvent } from '../smartFile/sessionRecordEngine';
import { pickNonemptyString, readFileDetailsField } from './mainPanel/smartFileMainPanelUtils';
import { useSmartFileMainPanelLayout } from './mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStatusBanners } from './mainPanel/SmartFileStatusBanners';
import { SmartFileAppealDeadlineBanner } from './mainPanel/SmartFileAppealDeadlineBanner';
import { SmartFileStageFooterBar } from './mainPanel/SmartFileStageFooterBar';
export type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';
import type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';
`;

const fnStart = lines.slice(tailStart, tailStart + 80).join('\n');
// inject layout after destructuring block ends (line with `} = p;`)
const destructureEnd = lines.findIndex((l, i) => i > tailStart && l.trim() === '} = p;');
const destructure = lines.slice(tailStart, destructureEnd + 1).join('\n');

const layoutInject = `
    const {
        incidentalParentLink,
        linkedChildIncidentalCases,
        externalCaseLinks,
        internalCaseLink,
        consolidatedSecondaryLabel,
        externalConsolidationRefs,
        primaryCaseNo,
        primaryDocType,
        headerParties,
        isTimelineExpanded,
        setIsTimelineExpanded,
        timelineEventCount,
        crossAppealEligibility,
        showOpponentAppealBtn,
        showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective,
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
    } = useSmartFileMainPanelLayout(p);
`;

const newDestructure = destructure + layoutInject;

let body = lines.slice(destructureEnd + 1).join('\n');
// Remove old layout block until return (
const returnIdx = body.indexOf('    return (');
body = body.slice(returnIdx);

// Replace status banners block
body = body.replace(
    /\{\/\* --- WARNING RADAR[\s\S]*?\{\/\* 🔥 NEW: 3\. LITIGATION INCIDENTS WARNINGS \*\/\}[\s\S]*?status === 'قيد نظر طلب رد القاضي'[\s\S]*?\)\}/,
    `<SmartFileStatusBanners
                                displayStage={displayStage}
                                status={status}
                                isViewingArchived={isViewingArchived}
                                handleResumeAbandonment={handleResumeAbandonment}
                                setShowResumeInterruptionModal={setShowResumeInterruptionModal}
                                handleResume={handleResume}
                            />`,
);

// Replace appeal deadline block
body = body.replace(
    /\{\/\* عدّاد المهلة[\s\S]*?\) : null\}/,
    `<SmartFileAppealDeadlineBanner
                                displayStage={displayStage}
                                showOpponentAppealBtn={showOpponentAppealBtn}
                                showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                            />`,
);

// Replace footer bar
body = body.replace(
    /\{\/\* 7\. Seal Stage[\s\S]*?\)\}/,
    `<SmartFileStageFooterBar
                            isViewingArchived={isViewingArchived}
                            showOpponentAppealBtnEffective={showOpponentAppealBtnEffective}
                            showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                            showAppealStageFooter={showAppealStageFooter}
                            showPetitionVoidFooter={showPetitionVoidFooter}
                            displayStage={displayStage}
                            crossAppealEligibility={crossAppealEligibility}
                            setShowCrossAppealModal={setShowCrossAppealModal}
                            petitionVoidFooterPanel={petitionVoidFooterPanel}
                            absentJudgmentFooterPanel={absentJudgmentFooterPanel}
                            opponentAppealFooterPanel={opponentAppealFooterPanel}
                            appealStageFooterPanel={appealStageFooterPanel}
                            showPleadingCloseFooter={showPleadingCloseFooter}
                            setShowJudgmentModal={setShowJudgmentModal}
                        />`,
);

fs.writeFileSync(panelPath, newHead + '\n' + newDestructure + '\n' + body);
console.log('Patched SmartFileMainPanel');
