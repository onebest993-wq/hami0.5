/**
 * Split SmartHeader.tsx → smart-header/* + barrel.
 * Run: node scripts/split-smart-header.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/parts/SmartHeader.tsx');
const headerDir = path.join(root, 'src/app/components/lawyer/smart-modal/smart-header');

const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function slice(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

fs.mkdirSync(headerDir, { recursive: true });

const sharedImports = `import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Clock, X, Scale, Lock, PauseCircle, Play, Users, Shield, ShieldCheck, Check, ChevronLeft, MapPin, Phone, Briefcase, Gavel, ArrowRightLeft,
} from 'lucide-react';
import { getLegalRole } from '../../LawyerShared';
import { shouldShowAbsentJudgmentFooter } from '../smartFile/absentJudgmentFlow';
import type { CaseStage, IncidentalCase, Party } from '../../LawyerShared';
import { filterHeaderIncidentalCases, groupPartiesForHeader } from '../smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';
import { resolveCrossAppealEligibility, type CrossAppealEligibility } from '../smartFile/crossAppealEngine';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';
import {
    isPlaintiffFavorableFinalDecision,
    isAwaitingOpponentAppeal,
    shouldShowOpponentAppealRegisterButton,
    isAppealStageName,
} from '../smartFile/judgmentTypes';
import { isLockedPriorStage, shouldShowFirstInstancePleadingLockUi } from '../smartFile/stageInit';
import { formatNumberInput } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
`;

fs.writeFileSync(
    path.join(headerDir, 'smartHeaderPresentation.ts'),
    `${slice(31, 68)}

export { GLASS_CHIP, MAIN_FILE_CATEGORIES, PARTY_STRIP_SHELL, CLIENT_MARKER_SLOT };
export { resolveLawsuitTypeLabel, formatClaimValueDisplay, displayCaseNo };
`,
);

fs.writeFileSync(
    path.join(headerDir, 'partyItemTypes.ts'),
    `${slice(21, 29)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'PartyChip.tsx'),
    `${sharedImports}
import {
    GLASS_CHIP,
    CLIENT_MARKER_SLOT,
} from './smartHeaderPresentation';
import {
    isAffiliativeThirdPartyRole,
    isAppealIntegratedInterpleaderRole,
    isInterpleaderThirdPartyRole,
} from '../smartFile/partyRoleClassification';

${slice(58, 68)}
${slice(71, 149)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'partyStripHelpers.ts'),
    `${sharedImports.replace("import React, { useState } from 'react';\n", "import type { Party } from '../../LawyerShared';\n")}
${slice(150, 173)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'PartySidePane.tsx'),
    `${sharedImports}
import { PartyChip } from './PartyChip';
import { splitSideParties } from './partyStripHelpers';
import { PARTY_STRIP_SHELL } from './smartHeaderPresentation';
import type { Party } from '../../LawyerShared';

${slice(174, 238)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'InterpleaderPartiesPane.tsx'),
    `${sharedImports}
import { PartyChip } from './PartyChip';
import { INTERPLEADER_STRIP_SHELL } from './interpleaderPresentation';

${slice(239, 247)}
${slice(248, 299)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'interpleaderPresentation.ts'),
    `${slice(239, 247)}
export { INTERPLEADER_STRIP_SHELL };
`,
);

fs.writeFileSync(
    path.join(headerDir, 'HeaderPartiesStrip.tsx'),
    `${sharedImports}
import { PartySidePane } from './PartySidePane';
import { InterpleaderPartiesPane } from './InterpleaderPartiesPane';
import { groupPartiesForHeader } from '../smartFile/incidentalCaseLinking';
import type { Party } from '../../LawyerShared';

${slice(300, 401)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'PartyItem.tsx'),
    `${sharedImports}
import type { PartyItemProps } from './partyItemTypes';

${slice(402, 545)}
`,
);

fs.writeFileSync(
    path.join(headerDir, 'smartHeaderTypes.ts'),
    `${slice(547, 591)}
`,
);

const mainBody = slice(593, lines.length);
fs.writeFileSync(
    path.join(headerDir, 'SmartHeaderMain.tsx'),
    `${sharedImports}
import { HeaderPartiesStrip } from './HeaderPartiesStrip';
import { PartyItem } from './PartyItem';
import {
    resolveLawsuitTypeLabel,
    formatClaimValueDisplay,
    displayCaseNo,
    GLASS_CHIP,
} from './smartHeaderPresentation';
import type { SmartHeaderProps } from './smartHeaderTypes';

${mainBody.replace(/^export const SmartHeader/, 'export function SmartHeader')}
`,
);

fs.writeFileSync(
    srcPath,
    `export { SmartHeader } from '../smart-header/SmartHeaderMain';
export type { SmartHeaderProps } from '../smart-header/smartHeaderTypes';
`,
);

console.log('Split SmartHeader → smart-header/');
