/**
 * Phase-6 ≤1000 discipline guards — split integrity for named monsters (batches A–C).
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const BUDGET = 1000;

function lineCount(rel: string): number {
    return fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).length;
}

const PHASE6_CLOSED_ENTRIES: Array<{ id: string; paths: string[] }> = [
    {
        id: 'CriminalDashboardModalsHost',
        paths: [
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHost.tsx',
            'src/app/components/lawyer/criminal-system/criminalDashboardModalsHostProps.ts',
        ],
    },
    {
        id: 'Modal_Unified_Summons_Hub',
        paths: [
            'src/app/components/lawyer/Modal_Unified_Summons_Hub.tsx',
            'src/app/components/lawyer/Modal_Unified_Summons_Hub/useUnifiedSummonsHubController.ts',
            'src/app/components/lawyer/Modal_Unified_Summons_Hub/UnifiedSummonsHubView.tsx',
            'src/app/components/lawyer/Modal_Unified_Summons_Hub/components/SummonsHubTablighTab.tsx',
        ],
    },
    {
        id: 'EvictionFieldProceduresPanel',
        paths: [
            'src/app/components/lawyer/execution/EvictionFieldProceduresPanel.tsx',
            'src/app/components/lawyer/execution/EvictionFieldProcedures/useEvictionFieldProceduresPanel.tsx',
            'src/app/components/lawyer/execution/EvictionFieldProcedures/EvictionFieldProceduresPanelView.tsx',
        ],
    },
    {
        id: 'ExecutionPartyInteractiveBadges',
        paths: [
            'src/app/components/lawyer/execution/ExecutionPartyInteractiveBadges.tsx',
            'src/app/components/lawyer/execution/partyInteractiveBadgeDefinitions.ts',
        ],
    },
    {
        id: 'contentEntryModals',
        paths: [
            'src/app/components/lawyer/smart-modal/modals/contentEntryModals.tsx',
            'src/app/components/lawyer/smart-modal/modals/content-entry/AddDocumentModal.tsx',
            'src/app/components/lawyer/smart-modal/modals/content-entry/contentEntryLightModals.tsx',
        ],
    },
    {
        id: 'criminalStageUtils',
        paths: [
            'src/app/components/lawyer/criminal-system/criminalStageUtils.ts',
            'src/app/components/lawyer/criminal-system/criminalStagePartyAndStatusUtils.ts',
        ],
    },
    {
        id: 'criminalStoreCaseOps',
        paths: [
            'src/app/components/lawyer/criminal-system/criminalStoreCaseOpsActions.ts',
            'src/app/components/lawyer/criminal-system/criminalStoreIdentityCorrectionActions.ts',
        ],
    },
    {
        id: 'criminalStoreMergeDraft',
        paths: [
            'src/app/components/lawyer/criminal-system/criminalStoreMergeDraftActions.ts',
            'src/app/components/lawyer/criminal-system/criminalStoreConcludeStageActions.ts',
            'src/app/components/lawyer/criminal-system/criminalStoreSeveranceDraftActions.ts',
        ],
    },
    {
        id: 'proceduralContainersEngine',
        paths: [
            'src/app/components/lawyer/criminal-system/proceduralContainersEngine.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersModel.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersQuery.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersNormalize.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersTreeOps.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersIds.ts',
        ],
    },
    {
        id: 'JudicialDecisionsLedger',
        paths: [
            'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedger.tsx',
            'src/app/components/lawyer/criminal-system/components/judicialDecisionsLedger/JudicialDecisionsLedgerCards.tsx',
        ],
    },
    {
        id: 'Form_Urgent_Actions',
        paths: [
            'src/app/components/lawyer/Form_Urgent_Actions.tsx',
            'src/app/components/lawyer/Form_Urgent_Actions/useUrgentActionsForm.ts',
        ],
    },
    {
        id: 'AdminLawEntry',
        paths: [
            'src/app/components/admin/AdminLawEntry.tsx',
            'src/app/components/admin/AdminLawEntry/useAdminLawEntry.ts',
        ],
    },
    {
        id: 'CriminalTimelineEventModal',
        paths: [
            'src/app/components/lawyer/criminal-system/components/modals/CriminalTimelineEventModal.tsx',
            'src/app/components/lawyer/criminal-system/components/modals/criminalTimelineEvent/criminalTimelineEventGuards.ts',
            'src/app/components/lawyer/criminal-system/components/modals/criminalTimelineEvent/criminalTimelineEventModalProps.ts',
        ],
    },
    {
        id: 'executionTypes',
        paths: [
            'src/app/types/execution.ts',
            'src/app/types/execution/executionShared.ts',
            'src/app/types/execution/executionFile.ts',
            'src/app/types/execution/formAndUi.ts',
        ],
    },
    {
        id: 'criminalStorePersistMigrate',
        paths: ['src/app/components/lawyer/criminal-system/criminalStorePersistMigrate.ts'],
    },
];

describe('phase-6 line budget — closed monsters (A–C)', () => {
    it.each(PHASE6_CLOSED_ENTRIES.flatMap((e) => e.paths.map((p) => ({ id: e.id, path: p }))))(
        '$id :: $path ≤1000',
        ({ path: rel }) => {
            expect(fs.existsSync(path.join(root, rel))).toBe(true);
            expect(lineCount(rel)).toBeLessThanOrEqual(BUDGET);
        },
    );
});

describe('phase-6 close artifact', () => {
    it('exists and reports batch-C closure', () => {
        const closePath = path.join(root, '.cursor/phase-6-close.json');
        expect(fs.existsSync(closePath)).toBe(true);
        const close = JSON.parse(fs.readFileSync(closePath, 'utf8')) as {
            status: string;
            remainingOver1000: string[];
        };
        expect(close.status).toMatch(/closed/);
        expect(close.remainingOver1000).toEqual([]);
    });
});
