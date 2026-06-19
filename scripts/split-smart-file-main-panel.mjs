/**
 * Extract SmartFileMainPanel sections into layout/mainPanel/*
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/layout/SmartFileMainPanel.tsx');
const outDir = path.join(root, 'src/app/components/lawyer/smart-modal/layout/mainPanel');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

fs.mkdirSync(outDir, { recursive: true });

// Status banners (inside scroll area)
const bannersBody = slice(549, 626).replace(/^                            /gm, '            ');
fs.writeFileSync(
    path.join(outDir, 'SmartFileStatusBanners.tsx'),
    `import { AlertTriangle, PauseCircle, Scale } from 'lucide-react';
import type { CaseStage } from '../../../LawyerShared';

export type SmartFileStatusBannersProps = {
    displayStage: CaseStage;
    status: string;
    isViewingArchived: boolean;
    handleResumeAbandonment: () => void;
    setShowResumeInterruptionModal: (v: boolean) => void;
    handleResume: () => void;
};

export function SmartFileStatusBanners(p: SmartFileStatusBannersProps) {
    const {
        displayStage,
        status,
        isViewingArchived,
        handleResumeAbandonment,
        setShowResumeInterruptionModal,
        handleResume,
    } = p;

    return (
        <>
${bannersBody}
        </>
    );
}
`,
);

// Appeal deadline counter
const deadlineBody = slice(716, 761).replace(/^                            /gm, '        ');
fs.writeFileSync(
    path.join(outDir, 'SmartFileAppealDeadlineBanner.tsx'),
    `import { Clock } from 'lucide-react';
import type { CaseStage } from '../../../LawyerShared';
import { shouldShowFirstInstancePleadingLockUi } from '../../smartFile/stageInit';
import {
    daysRemainingUntil,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
} from '../../smartFile/absentJudgmentFlow';

export type SmartFileAppealDeadlineBannerProps = {
    displayStage: CaseStage;
    showOpponentAppealBtn: boolean;
    showAbsentJudgmentFooter: boolean;
};

export function SmartFileAppealDeadlineBanner(p: SmartFileAppealDeadlineBannerProps) {
    const { displayStage, showOpponentAppealBtn, showAbsentJudgmentFooter } = p;

    return (
${deadlineBody}
    );
}
`,
);

// Incidental links block
const incidentalBody = slice(764, 850).replace(/^                            /gm, '            ');
fs.writeFileSync(
    path.join(outDir, 'SmartFileIncidentalLinksBlock.tsx'),
    `import { Suspense } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { CaseStage, IncidentalStatus } from '../../../LawyerShared';
import { LazyIncidentalCasesManager } from '../../lazySmartFileModalWidgets';
import type { IncidentalParentLink } from '../../smartFile/incidentalCaseLinking';
import type { CaseLinkRecord } from '../../smartFile/caseLinking';
import type { ConsolidationSecondaryRef } from '../../../LawyerShared';
import type { LinkedChildIncidentalCase } from '../../smartFile/incidentalCaseLinking';

export type SmartFileIncidentalLinksBlockProps = {
    displayStage: CaseStage;
    isViewingArchived: boolean;
    incidentalParentLink: IncidentalParentLink | null;
    internalCaseLink: CaseLinkRecord | undefined;
    externalConsolidationRefs: ConsolidationSecondaryRef[];
    externalCaseLinks: CaseLinkRecord[];
    linkedChildIncidentalCases: LinkedChildIncidentalCase[];
    onOpenLinkedFile?: (fileId: number) => void;
    handleResolveIncidentalCase: (id: string, status: IncidentalStatus) => void;
};

export function SmartFileIncidentalLinksBlock(p: SmartFileIncidentalLinksBlockProps) {
    const {
        displayStage,
        isViewingArchived,
        incidentalParentLink,
        internalCaseLink,
        externalConsolidationRefs,
        externalCaseLinks,
        linkedChildIncidentalCases,
        onOpenLinkedFile,
        handleResolveIncidentalCase,
    } = p;

    return (
        <div className="mt-2 space-y-2">
${incidentalBody.replace('{showFirstInstanceIncidentalUi ? (\n                <div className="mt-2 space-y-2">', '').replace(/\) : null}$/, '')}
        </div>
    );
}
`,
);

console.log('Extracted MainPanel sections to layout/mainPanel/');
