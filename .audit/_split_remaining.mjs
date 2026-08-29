import fs from 'node:fs';
import path from 'node:path';

// SeizureInlineSectionsCore: extract shared preamble
const sisDir = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/components/seizureInlineSections',
);
const sisPath = path.join(sisDir, 'SeizureInlineSectionsCore.tsx');
const sis = fs.readFileSync(sisPath, 'utf8').split(/\r?\n/);
const coreExport = sis.findIndex((l) => l.startsWith('export const SeizureInlineSectionsCore'));

const shared = sis.slice(0, coreExport).join('\n') + '\n';
// Make InlineSectionShell exported
const sharedFixed = shared.replace(
    'const InlineSectionShell:',
    'export const InlineSectionShell:',
);

fs.writeFileSync(path.join(sisDir, 'seizureInlineSectionsShared.tsx'), sharedFixed);

const coreBody = sis.slice(coreExport).join('\n');
const coreFile = `import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { getSeizureAssetPlugin } from '@/app/domain/seizure/seizureAssetPlugins';
import { findSeizureDecisionForEntity } from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import { isDecisionResolvedApproved } from '@/app/domain/seizure/seizureWorkflowStatus';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '../../utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    ensureMovableInList,
    saveMovableAuctionDateInline,
    saveMovableAuctionResultInline,
    saveMovableExpertReportInline,
    saveMovableMarkInline,
    saveMovablePublicationInline,
    saveMovableReauctionDefaultInline,
} from '../../utils/movableSeizureInlinePersistence';
import {
    savePropertyAuctionDateInline,
    savePropertyAuctionResultInline,
    savePropertyExpertReportInline,
    savePropertyMarkInline,
    savePropertyPublicationInline,
    savePropertyReauctionDefaultInline,
} from '../../utils/propertySeizureInlinePersistence';
import {
    FIELD,
    THEME,
    InlineSectionShell,
    buildExpertNameSlots,
    initialExpertPrice,
    hasExpertReportSaved,
    resolveEntitiesForSave,
    type SeizureInlineSectionsCoreProps,
    type SeizureInlineEntity,
} from './seizureInlineSectionsShared';

export type {
    SeizureInlineSectionKey,
    MovableExpertDecisionSubtype,
    PropertyExpertDecisionSubtype,
    SeizureExpertDecisionSubtype,
    SeizureInlineEntity,
    SeizureInlineSectionsCoreProps,
} from './seizureInlineSectionsShared';

${coreBody}
`;

fs.writeFileSync(sisPath, coreFile);
console.log('sis shared', sharedFixed.split('\n').length, 'core', coreFile.split('\n').length);

// Party badges: extract extraDefs builder
const badgesDir = path.resolve(
    'src/app/components/lawyer/execution/partyInteractiveBadges',
);
const badgesPath = path.join(badgesDir, 'ExecutionPartyInteractiveBadges.tsx');
const badges = fs.readFileSync(badgesPath, 'utf8').split(/\r?\n/);

const extraStart = badges.findIndex((l) => l.includes('const extraDefs = useMemo'));
const extraEnd = badges.findIndex(
    (l, i) => i > extraStart && l.includes('const allDefs = useMemo'),
);
console.log('extraDefs', extraStart + 1, '->', extraEnd);

// Extract the callback body inside useMemo(() => { ... }, deps)
const extraBlock = badges.slice(extraStart, extraEnd).join('\n');
// Convert to a pure function buildExtraPartyBadgeDefinitions
const fnBodyMatch = extraBlock.match(
    /const extraDefs = useMemo\(\(\) => \{([\s\S]*)\}, \[([\s\S]*)\]\);?\s*$/,
);
if (!fnBodyMatch) {
    console.log('extraDefs parse failed, first lines:', extraBlock.slice(0, 200));
} else {
    const body = fnBodyMatch[1];
    const deps = fnBodyMatch[2]
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
    console.log('deps', deps.length, deps.slice(0, 8));
}
