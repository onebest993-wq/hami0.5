import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const body = fs.readFileSync(
    path.join(root, 'src/app/components/lawyer/smart-modal/layout/mainPanel/_layoutBody.txt'),
    'utf8',
);

const header = `import { useState } from 'react';
import { Bell, Clock, Scale, Shield } from 'lucide-react';
import {
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
} from '../../smartFile/caseConsolidationLinking';
import { readIncidentalLink, readLinkedChildIncidentalCases } from '../../smartFile/incidentalCaseLinking';
import { readCaseLinks } from '../../smartFile/caseLinking';
import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName } from '../../smartFile/judgmentTypes';
import {
    daysRemainingUntil,
    hasAbsentJudgmentNotificationRecorded,
    isAwaitingAbsentJudgmentNotification,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
    isAbsentObjectionStageName,
} from '../../smartFile/absentJudgmentFlow';
import { shouldShowFirstInstanceIncidentalUi } from '../../smartFile/appealStageTransition';
import { resolveAppealStageFooterEligibility } from '../../smartFile/appealStageFooter';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import {
    daysRemainingPetitionVoidRevival,
    shouldShowPetitionVoidFooterPanel,
} from '../../smartFile/petitionVoidFlow';
import { resolveDisplayParties } from '../../smartFile/resolveDisplayParties';
import { pickNonemptyString } from './smartFileMainPanelUtils';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';

export function useSmartFileMainPanelLayout(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        onAbsentJudgmentNotification,
        setShowAppealModal,
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
    } = p;

`;

const footer = `
    return {
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
        appealStageFooter,
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
    };
}
`;

const out = path.join(root, 'src/app/components/lawyer/smart-modal/layout/mainPanel/useSmartFileMainPanelLayout.tsx');
fs.writeFileSync(out, header + body + footer);
console.log('Wrote', out);
