/**
 * Split useDecisionsAppealsAppealRenderers → appeal-renderers/* modules.
 * Run: node scripts/split-appeal-renderers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(
    root,
    'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/useDecisionsAppealsAppealRenderers.tsx',
);
const outDir = path.join(root, 'src/app/components/lawyer/DecisionsAndAppealsEngine/hooks/appeal-renderers');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
    path.join(outDir, 'appealRenderersTypes.ts'),
    `import type React from 'react';
import type { AppealUiPerspective } from '../../appealUiLabels';
import type { Decision } from '../../types';
import type { AppealDeadlineWindows } from '../../utils';

${slice(50, 88)}
`,
);

fs.writeFileSync(
    path.join(outDir, 'appealRendererButtonClasses.ts'),
    `export const APPEAL_ORIGINAL_LOCKED_HINT =
    'مسار الطعن يُكمل حالياً على النسخة في «سجل الطعون». لا يُفتح مسار ثانٍ من القرار الأصل حتى يُغلق المسار على النسخة. استخدم زر «فتح مسار الطعن» أعلاه.';

/** زر «الطعن بالقرار» — زجاجي بنفسجي */
export const DECISION_BTN_APPEAL_CHALLENGE =
    'w-full rounded-lg border border-purple-500/20 bg-purple-500/10 py-1.5 px-3 text-center text-sm font-semibold text-purple-300 backdrop-blur-sm transition-all duration-200 hover:bg-purple-500/20 focus:outline-none disabled:pointer-events-none disabled:opacity-40';
/** زر ثانوي — زجاجي محايد */
export const DECISION_BTN_SECONDARY =
    'rounded-xl border border-white/10 bg-white/[0.04] py-2 px-3 text-center text-[11px] font-semibold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40';
export const DECISION_BTN_SECONDARY_WFULL = \`w-full \${DECISION_BTN_SECONDARY}\`;
export const DECISION_BTN_SECONDARY_FLEX = \`min-w-0 flex-1 \${DECISION_BTN_SECONDARY}\`;
/** زر أساسي — زجاجي ذهبي هادئ */
export const DECISION_BTN_PRIMARY =
    'rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/[0.08] py-2 px-3 text-center text-[11px] font-bold text-[#E6C673] backdrop-blur-md transition-all duration-200 hover:border-[#E6C673]/40 hover:bg-[#E6C673]/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/30 disabled:pointer-events-none disabled:opacity-40';
export const DECISION_BTN_PRIMARY_WFULL = \`w-full \${DECISION_BTN_PRIMARY}\`;
export const DECISION_BTN_PRIMARY_FLEX = \`min-w-0 flex-1 \${DECISION_BTN_PRIMARY}\`;
`,
);

function wrapRendererHook(fn, returnKey, body, extraImports, deps) {
    const indentedBody = body
        .split('\n')
        .map((l) => (l ? `    ${l}` : l))
        .join('\n');
    return `import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
${extraImports}

export function ${fn}(args: UseDecisionsAppealsAppealRenderersArgs) {
${deps}

${indentedBody}

    return { ${returnKey} };
}
`;
}

fs.writeFileSync(
    path.join(outDir, 'useAppealEntryButtonsRenderer.ts'),
    wrapRendererHook(
        'useAppealEntryButtonsRenderer',
        'renderAppealEntryButtons',
        slice(132, 270),
        `import DecisionHintTooltip from '../../components/DecisionHintTooltip';
import { ExecutorSideAppealEntryPanel } from '../../components/ExecutorSideAppealEntryPanel';
import { canWaiveInitialAppeal } from '@/app/utils/waiveInitialAppeal';
import {
    creditorAgentDebtorIsSoleAppellant,
    resolveHarmedPartyAppealActor,
    resolveUnderlyingDecisionHub,
    type AppealDeadlineWindows,
} from '../../utils';
import {
    appealInitialCassationEntryButtonLabel,
    appealInitialCassationTimeline,
    appealInitialGrievanceEntryButtonLabel,
    appealInitialGrievanceTimeline,
} from '../../appealUiLabels';
import {
    DECISION_APPEAL_TOOLBAR_BTN_PRIMARY,
    DECISION_APPEAL_TOOLBAR_BTN_SECONDARY,
    DECISION_APPEAL_TOOLBAR_ROW,
} from '../../decisionCardPresentation';
import {
    APPEAL_ORIGINAL_LOCKED_HINT,
    DECISION_BTN_APPEAL_CHALLENGE,
    DECISION_BTN_PRIMARY_WFULL,
    DECISION_BTN_SECONDARY_WFULL,
} from './appealRendererButtonClasses';`,
        `    const {
        appealPerspective,
        decisions,
        transitionAppealWorkflow,
        commitExecutorSideAppealEntry,
        applyWaiveInitialAppeal,
    } = args;`,
    ),
);

fs.writeFileSync(
    path.join(outDir, 'useAppealGrievanceDecideRenderer.ts'),
    wrapRendererHook(
        'useAppealGrievanceDecideRenderer',
        'renderAppealGrievanceDecideButtons',
        slice(298, 328),
        `import {
    DECISION_BTN_GRIEVANCE_ACCEPT,
    DECISION_BTN_GRIEVANCE_REJECT,
} from '../../decisionCardPresentation';
import { appealWindowsForDecision, type AppealDeadlineWindows, type DecisionsAppealsAppealSlot } from '../../utils';`,
        `    const { applyGrievanceCourtOutcome } = args;`,
    ),
);

fs.writeFileSync(
    path.join(outDir, 'useAppealAwaitingCassationRenderer.ts'),
    wrapRendererHook(
        'useAppealAwaitingCassationRenderer',
        'renderAppealAwaitingCassationButtons',
        slice(330, 448),
        `import {
    canWaiveLawyerAwaitingCassation,
    resolveEffectiveAwaitingCassationParty,
    resolveUnderlyingDecisionHub,
    type DecisionsAppealsAppealSlot,
} from '../../utils';
import {
    appealCassationEntryLabels,
    appealInitialGrievanceEntryButtonLabel,
} from '../../appealUiLabels';
import { DECISION_BTN_DEBTOR_APPEAL_NOTICE } from '../../decisionCardPresentation';
import { DECISION_BTN_PRIMARY_WFULL, DECISION_BTN_SECONDARY_WFULL } from './appealRendererButtonClasses';`,
        `    const {
        appealPerspective,
        decisions,
        transitionAppealWorkflow,
        applyWaiveCassationAfterDebtorGrievance,
    } = args;`,
    ),
);

fs.writeFileSync(
    path.join(outDir, 'useAppealTamyeezPhaseRenderer.ts'),
    wrapRendererHook(
        'useAppealTamyeezPhaseRenderer',
        'renderAppealTamyeezPhasePanel',
        slice(450, 544),
        `import DecisionHintTooltip from '../../components/DecisionHintTooltip';
import { hubWithInferredAppealOrigin, isCreditorInitiatedExecutorRequest } from '../../utils/appealRequestOrigin';
import { resolveCassationFilerActor } from '../../utils/appeal-engine/appealWorkflowActors';
import type { DecisionsAppealsAppealSlot } from '../../utils';
import { DECISION_BTN_PRIMARY_FLEX, DECISION_BTN_SECONDARY_FLEX } from './appealRendererButtonClasses';`,
        `    const {
        applyCassationCourtDecision,
        tamyeezNumberDraftById,
        setTamyeezNumberDraftById,
        tamyeezEditOpenById,
        setTamyeezEditOpenById,
    } = args;`,
    ),
);

fs.writeFileSync(
    path.join(outDir, 'useAppealDecisionCardStatus.ts'),
    `import React from 'react';
import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    appealPipelineRowForCard,
    isExecutorDecisionAppealFinal,
    resolveCreditorDecisionEnforcementState,
    renderDecisionHubStatusPill,
} from '../../utils';

export function useAppealDecisionCardStatus(args: UseDecisionsAppealsAppealRenderersArgs) {
    const {
        appealPerspective,
        decisionsHubTab,
        setAppealDetailDecision,
        setDecisionsHubTab,
        goToAppealsWithScroll,
        requestNeedsExecutorOutcome,
        getAppealStatus,
    } = args;

${slice(546, 602)}

    return { buildDecisionCardStatus };
}
`,
);

fs.writeFileSync(
    path.join(outDir, 'useAppealDeadlineLapseRenderer.ts'),
    `import React from 'react';
import { AppealDeadlineLapsePanel } from '../../components/AppealDeadlineLapsePanel';
import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    appealDeadlineLapsePanelMessage,
    buildAppealPerpetualEnforcementPatch,
    buildGrievanceDeadlineLapsePatch,
    resolveAppealDeadlineExpiryKind,
} from '../../utils';
import { DECISION_BTN_PRIMARY_WFULL } from './appealRendererButtonClasses';

export function useAppealDeadlineLapseRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const { decisions, patchDecisionRow, logAppealTimeline, setDecisionsHubTab } = args;

${slice(604, 635)}

    return { renderAppealDeadlineLapseActions };
}
`,
);

const shell = `import type { UseDecisionsAppealsAppealRenderersArgs } from './appeal-renderers/appealRenderersTypes';
export type { UseDecisionsAppealsAppealRenderersArgs } from './appeal-renderers/appealRenderersTypes';
import {
    DECISION_BTN_PRIMARY,
    DECISION_BTN_PRIMARY_FLEX,
    DECISION_BTN_PRIMARY_WFULL,
    DECISION_BTN_SECONDARY_FLEX,
} from './appeal-renderers/appealRendererButtonClasses';
import { useAppealEntryButtonsRenderer } from './appeal-renderers/useAppealEntryButtonsRenderer';
import { useAppealGrievanceDecideRenderer } from './appeal-renderers/useAppealGrievanceDecideRenderer';
import { useAppealAwaitingCassationRenderer } from './appeal-renderers/useAppealAwaitingCassationRenderer';
import { useAppealTamyeezPhaseRenderer } from './appeal-renderers/useAppealTamyeezPhaseRenderer';
import { useAppealDecisionCardStatus } from './appeal-renderers/useAppealDecisionCardStatus';
import { useAppealDeadlineLapseRenderer } from './appeal-renderers/useAppealDeadlineLapseRenderer';

export function useDecisionsAppealsAppealRenderers(args: UseDecisionsAppealsAppealRenderersArgs) {
    const { renderAppealEntryButtons } = useAppealEntryButtonsRenderer(args);
    const { renderAppealGrievanceDecideButtons } = useAppealGrievanceDecideRenderer(args);
    const { renderAppealAwaitingCassationButtons } = useAppealAwaitingCassationRenderer(args);
    const { renderAppealTamyeezPhasePanel } = useAppealTamyeezPhaseRenderer(args);
    const { buildDecisionCardStatus } = useAppealDecisionCardStatus(args);
    const { renderAppealDeadlineLapseActions } = useAppealDeadlineLapseRenderer(args);

    return {
        DECISION_BTN_PRIMARY,
        DECISION_BTN_PRIMARY_WFULL,
        DECISION_BTN_PRIMARY_FLEX,
        DECISION_BTN_SECONDARY_FLEX,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealDeadlineLapseActions,
        buildDecisionCardStatus,
    };
}
`;

fs.writeFileSync(srcPath, shell);
console.log('Split appeal renderers into', outDir);
