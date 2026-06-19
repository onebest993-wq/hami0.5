/**
 * Split SmartFileModalContent → useSmartFileModalOrchestrator + thin shell.
 * Run: node scripts/split-smart-file-modal-orchestrator.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const contentPath = path.join(root, 'src/app/components/lawyer/smart-modal/SmartFileModalContent.tsx');
const typesPath = path.join(root, 'src/app/components/lawyer/smart-modal/smartFile/smartFileModalTypes.ts');
const hookPath = path.join(root, 'src/app/components/lawyer/smart-modal/hooks/useSmartFileModalOrchestrator.ts');

const raw = fs.readFileSync(contentPath, 'utf8');
const lines = raw.split(/\r?\n/);

const typesBlock = lines.slice(44, 76).join('\n');
fs.writeFileSync(
    typesPath,
    `import type { CaseStage } from '../../LawyerShared';
import type { FileData, IncidentalCase } from '../../LawyerShared';
import type { IncidentalSpawnContext } from '../incidentalCaseLinking';
import type { ConsolidationMergeMeta, ConsolidationSpawnContext } from '../caseConsolidationLinking';

export function readFileString(file: Record<string, unknown>, key: string, fallback = ''): string {
    const value = file[key];
    return typeof value === 'string' ? value : fallback;
}

${typesBlock.replace('// --- TYPES ---\n', '').replace('// --- MAIN COMPONENT ---\n', '')}
`,
);

const hookHeader = `import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { SmartToast } from '../../ui/SmartToast';
import { debug } from '@/app/utils/debug';
import type { FileData } from '../../LawyerShared';
import type { IncidentalSpawnContext } from '../smartFile/incidentalCaseLinking';
import {
    listConsolidationCandidates,
    resolveOpenLawsuitFileIdentity,
    resolveActiveStageName,
    type ConsolidationMergeMeta,
    type ConsolidationSpawnContext,
} from '../smartFile/caseConsolidationLinking';
import { normalizeFileId } from '../smartFile/incidentalCaseLinking';
import { listCaseLinkCandidates } from '../smartFile/caseLinking';
import { buildInitialStagesFromFile } from '../smartFile/stageInit';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { useSmartFileStageNavigation } from './useSmartFileStageNavigation';
import { useSmartFileJudgmentActions } from './useSmartFileJudgmentActions';
import { useSmartFileProceduralActions } from './useSmartFileProceduralActions';
import { useAuthUser } from '@/app/context/AuthContext';
import { useSmartFilePersist } from './useSmartFilePersist';
import { useSmartFileModalFlags } from './useSmartFileModalFlags';
import { useSmartFileStageActions } from './useSmartFileStageActions';
import { useSmartFileTimelineActions } from './useSmartFileTimelineActions';
import { useSmartFileDefaultJudgmentActions } from './useSmartFileDefaultJudgmentActions';
import { useSmartFilePleadingsActions } from './useSmartFilePleadingsActions';
import { shareCaseReport } from '../smartFile/shareCaseReport';
import type { SmartFileModalsPortalProps } from '../layout/SmartFileModalsPortal';
import { buildSmartFileLayoutProps } from '../smartFile/viewProps';
import { isPetitionVoidRevivalExpired } from '../smartFile/petitionVoidFlow';
import { CalendarBridge } from '@/app/services/calendarBridge';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourcePatchDetail } from '@/app/services/calendarBridgePersistence';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import type { CaseStage } from '../../LawyerShared';
import { readFileString, type SmartFileModalProps } from '../smartFile/smartFileModalTypes';

export function useSmartFileModalOrchestrator(props: SmartFileModalProps) {
`;

const hookBody = lines.slice(97, 927).join('\n');
const hookFooter = `
    return { layout, consolidationNavActive: props.consolidationNavActive, caseLinkNavActive: props.caseLinkNavActive };
}
`;

fs.writeFileSync(hookPath, `${hookHeader}${hookBody}${hookFooter}`);

const shell = `import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartFileModalsPortal } from './layout/SmartFileModalsPortal';
import { SmartFileMainPanel } from './layout/SmartFileMainPanel';
import { SmartFileChrome } from './layout/SmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import { useSmartFileModalOrchestrator } from './hooks/useSmartFileModalOrchestrator';
export type { SmartFileModalProps } from './smartFile/smartFileModalTypes';

export const SmartFileModalContent = (props: import('./smartFile/smartFileModalTypes').SmartFileModalProps) => {
    const { layout, consolidationNavActive, caseLinkNavActive } = useSmartFileModalOrchestrator(props);

    if (!layout) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={\`fixed inset-0 z-[100] bg-[#0F121E] font-['Tajawal'] overflow-hidden print:static print:bg-transparent print:overflow-visible \${
                    consolidationNavActive || caseLinkNavActive ? 'pt-12' : ''
                }\`}
                data-testid={CIVIL_LAWSUIT_TEST_IDS.dossier}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full max-w-none mx-0 my-0 bg-[#0F121E] rounded-none border-0 flex flex-col min-h-0 overflow-hidden shadow-none print:h-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:rounded-none will-change-opacity"
                >
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F121E] relative">
                        <SmartFileChrome {...layout.chrome} />
                        <SmartFileMainPanel {...layout.mainPanel} />
                    </div>
                </motion.div>
                <SmartFileModalsPortal {...layout.modalsPortal} />
            </motion.div>
        </AnimatePresence>
    );
};
`;

fs.writeFileSync(contentPath, shell);
console.log('Split SmartFileModalContent → useSmartFileModalOrchestrator');
