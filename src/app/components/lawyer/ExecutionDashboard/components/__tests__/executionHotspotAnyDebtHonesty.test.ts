import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function countAnyTokens(src: string): number {
    return (src.match(/\bany\b/g) || []).length;
}

function walkProductionTsFiles(dirAbs: string, acc: string[] = []): string[] {
    if (!fs.existsSync(dirAbs)) return acc;
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
        const abs = path.join(dirAbs, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
            walkProductionTsFiles(abs, acc);
            continue;
        }
        if (/\.(ts|tsx)$/.test(entry.name)) acc.push(abs);
    }
    return acc;
}

const ZERO_ANY_ROOTS = [
    'src/app/components/lawyer/ExecutionDashboard',
    'src/app/components/lawyer/execution',
] as const;

const TARGETS: Array<{ rel: string; maxAny: number; mustContain?: string[] }> = [
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/SeizureThirdPartyRequestBlock.tsx',
        maxAny: 0,
        mustContain: ['SeizureAssetDecisionRow', 'ExecutionFile', 'TimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRequestsTabDecisions.ts',
        maxAny: 0,
        mustContain: ['SeizureDecisionRow', 'SeizureRequestSubtype', 'TimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/executionFinancialHub/financialHubMonthlySettlementHandlers.ts',
        maxAny: 0,
        mustContain: [
            'ExecutionFinancialHubCaseTaskPending',
            'MonthlySettlementExecutionFields',
            'asCaseTasksPending',
        ],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/PartiesSection.tsx',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'SeizedAsset', 'HeirDetailRow', 'CreditorWorkspaceEntry'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/communicationDecisionModel.ts',
        maxAny: 0,
        mustContain: ['Record<string, unknown>', 'CommunicationDisplayContext'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionNotesAndAppointmentModalsReady.tsx',
        maxAny: 0,
        mustContain: ['CaseTaskPending', 'CaseTaskStep', 'ExecutionFile', 'TimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useCaseTasksAndNotes.ts',
        maxAny: 0,
        mustContain: ['TimelineEvent', 'CaseTaskPending', 'CaseNoteLogRow'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/PersonalTab.tsx',
        maxAny: 0,
        mustContain: [
            'EmployeeSummonsAssignmentState',
            'ExecutionFile',
            'TimelineEvent',
            'ActiveDebtorNoticeScope',
            'PersonalCoerciveFollowupPanelProps',
        ],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/LinkedDossierTimelineModal.tsx',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'TimelineEvent', 'LinkedTimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useMergedTimelineEvents.ts',
        maxAny: 0,
        mustContain: ['TimelineEvent', 'TimelineSortable'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/useDossierActionForm.ts',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'isExecutionInTrash', 'parentId', 'fileYear'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardAuctionSessionResult.ts',
        maxAny: 0,
        mustContain: ['SeizedMovable', 'SeizedProperty', 'AuctionEntity'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/CoerciveTab.types.ts',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'TimelineEvent', 'EvictionFieldProceduresPanelProps'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useDossierHeaderMetadata.ts',
        maxAny: 0,
        mustContain: ['EncroachmentCaseExpenseRow', 'TimelineEvent', 'ExecutionFile'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets.ts',
        maxAny: 0,
        mustContain: ['SeizedAsset', 'RealEstateSeizureAsset', 'ThirdPartySeizureAsset'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useCreditorWorkspace.ts',
        maxAny: 0,
        mustContain: ['Party', 'AdditionalExecutionCreditor'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useDossierDeathStatus.ts',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'Debtor'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/SeizureRequestCompletionForms.tsx',
        maxAny: 0,
        mustContain: ['AssetBlockShowToast', 'PropertyCompletionDraft'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/seizureRequestsTabDecisionSteps.tsx',
        maxAny: 0,
        mustContain: ['SeizureDecisionStepRow', 'ExecutionInlineStep'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupModalDossierControlsPanel.tsx',
        maxAny: 0,
        mustContain: ['dossier_lifecycle_status', 'normalizeDossierLifecycleStatus'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/OtherPartyTab.tsx',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'OtherPartyActionsLogProps'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useHeirsWorkflowByHeir.ts',
        maxAny: 0,
        mustContain: ['HeirWorkflowByHeirEntry', 'ExecutionFile'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useDebtorScopedTimeline.ts',
        maxAny: 0,
        mustContain: ['TimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/pickExecutionPhoneBodyScopeReadBag.ts',
        maxAny: 0,
        mustContain: ['ExecutionPhoneBodyScopeReadKey', 'unknown'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/SeizureRequestsTabSalaryBlock.tsx',
        maxAny: 0,
        mustContain: ['SeizureAssetDecisionRow', 'SubmitBasicSeizureRequest'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodySafeHandlers.ts',
        maxAny: 0,
        mustContain: ['PhoneBodySafeHandlersInput', 'Record<string, unknown>'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/DossierSwitcher.tsx',
        maxAny: 0,
        mustContain: ['ExecutionFile', 'parentId'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/unifiedSeizureLogEntryFooter/UnifiedSeizureLogEntryFooterProps.ts',
        maxAny: 0,
        mustContain: ['ThirdPartySeizureAsset', 'TimelineEvent'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModals.tsx',
        maxAny: 0,
        mustContain: ['EarlyCluster', 'LateCluster', 'Record<string, unknown>'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHeavyModalsEarlyCluster.tsx',
        maxAny: 0,
        mustContain: ['LooseComp', 'Record<string, unknown>'],
    },
    {
        rel: 'src/app/components/lawyer/ExecutionDashboard/components/executionFinancialHub/useExecutionFinancialHubModel.ts',
        maxAny: 0,
        mustContain: ['executionData?.debtors', 'executionData?.creditors'],
    },
    {
        rel: 'src/app/components/lawyer/execution/evictionField/hooks/useEvictionFieldActions.tsx',
        maxAny: 0,
        mustContain: ['EVICTION_WORKFLOW_BY_ACTION_ID', 'RESIDENTIAL_GRACE_EARLY_END'],
    },
];

describe('execution hotspot any-debt honesty', () => {
    it.each(TARGETS)('$rel stays at or below $maxAny any tokens', ({ rel, maxAny, mustContain }) => {
        const abs = path.join(root, rel);
        expect(fs.existsSync(abs)).toBe(true);
        const src = fs.readFileSync(abs, 'utf8');
        for (const needle of mustContain ?? []) {
            expect(src, `${rel} should mention ${needle}`).toContain(needle);
        }
        expect(countAnyTokens(src), `${rel} \\bany\\b count`).toBeLessThanOrEqual(maxAny);
    });
});

describe('executionAnyDebtZeroHonesty', () => {
    it('keeps production \\bany\\b at 0 under ExecutionDashboard + lawyer/execution (excl. __tests__)', () => {
        const offenders: Array<{ rel: string; count: number }> = [];
        let total = 0;
        for (const relRoot of ZERO_ANY_ROOTS) {
            const files = walkProductionTsFiles(path.join(root, relRoot));
            for (const abs of files) {
                const count = countAnyTokens(fs.readFileSync(abs, 'utf8'));
                if (count <= 0) continue;
                total += count;
                offenders.push({
                    rel: path.relative(root, abs).split(path.sep).join('/'),
                    count,
                });
            }
        }
        expect(
            offenders,
            offenders.map((o) => `${o.rel}:${o.count}`).join(', ') || 'no offenders',
        ).toEqual([]);
        expect(total).toBe(0);
    });
});
