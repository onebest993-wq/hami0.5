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
        paths: ['src/app/components/lawyer/Modal_Unified_Summons_Hub.tsx'],
    },
    {
        id: 'EvictionFieldProceduresPanel',
        paths: ['src/app/components/lawyer/execution/EvictionFieldProceduresPanel.tsx'],
    },
    {
        id: 'ExecutionPartyInteractiveBadges',
        paths: [
            'src/app/components/lawyer/execution/ExecutionPartyInteractiveBadges.tsx',
            'src/app/components/lawyer/execution/partyInteractiveBadges/index.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/types.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/toneRing.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/badgeSort.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/hiddenBadgeStorage.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/badgeSignalKeys.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/badgeDisplayHelpers.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/buildPartyBadgeDefinitions.ts',
            'src/app/components/lawyer/execution/partyInteractiveBadges/PartyBadgePopover.tsx',
            'src/app/components/lawyer/execution/partyInteractiveBadges/ExecutionPartyInteractiveBadges.tsx',
        ],
    },
    {
        id: 'contentEntryModals',
        paths: [
            'src/app/components/lawyer/smart-modal/modals/contentEntryModals.tsx',
            'src/app/components/lawyer/smart-modal/modals/contentEntry/AddDocumentModal.tsx',
            'src/app/components/lawyer/smart-modal/modals/contentEntry/shared.tsx',
            'src/app/components/lawyer/smart-modal/modals/contentEntry/AddTaskModal.tsx',
            'src/app/components/lawyer/smart-modal/modals/contentEntry/AddNoteModal.tsx',
            'src/app/components/lawyer/smart-modal/modals/contentEntry/AddAppointmentModal.tsx',
        ],
    },
    {
        id: 'criminalStageUtils',
        paths: [
            'src/app/components/lawyer/criminal-system/criminalStageUtils.ts',
            'src/app/components/lawyer/criminal-system/criminalStagePresentationCore.ts',
            'src/app/components/lawyer/criminal-system/criminalStageRuntimeCore.ts',
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
            'src/app/components/lawyer/criminal-system/proceduralContainersSearch.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersNormalize.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersTreeOps.ts',
            'src/app/components/lawyer/criminal-system/proceduralContainersPlacement.ts',
        ],
    },
    {
        id: 'JudicialDecisionsLedger',
        paths: [
            'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedger.tsx',
            'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedgerDispositiveCard.tsx',
            'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedgerPreparatoryCard.tsx',
            'src/app/components/lawyer/criminal-system/components/JudicialDecisionsLedgerCardShared.tsx',
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
            'src/app/components/admin/useAdminLawEntry.ts',
            'src/app/components/admin/adminLawEntryApi.ts',
            'src/app/components/admin/adminLawEntryTypes.ts',
        ],
    },
    {
        id: 'CriminalTimelineEvent',
        paths: [
            'src/app/components/lawyer/criminal-system/criminalTimelineEventInsertEngine.ts',
            'src/app/components/lawyer/criminal-system/components/modals/ProceduralLinkedTimelineModal.tsx',
        ],
    },
    {
        id: 'executionTypes',
        // Domain peel under types/execution/*; public path remains types/execution.ts barrel.
        paths: [
            'src/app/types/execution.ts',
            'src/app/types/execution/executionShared.ts',
            'src/app/types/execution/core.ts',
            'src/app/types/execution/party.ts',
            'src/app/types/execution/financial.ts',
            'src/app/types/execution/alimony.ts',
            'src/app/types/execution/document.ts',
            'src/app/types/execution/timeline.ts',
            'src/app/types/execution/coercive.ts',
            'src/app/types/execution/seizure.ts',
            'src/app/types/execution/executionFile.ts',
            'src/app/types/execution/executionFileCore.ts',
            'src/app/types/execution/executionFileDebtor.ts',
            'src/app/types/execution/executionFileDecisions.ts',
            'src/app/types/execution/executionFilePartyDeath.ts',
            'src/app/types/execution/executionFileOrders.ts',
            'src/app/types/execution/executionFileGuarantor.ts',
            'src/app/types/execution/executionFileEviction.ts',
            'src/app/types/execution/executionFileLegacyDisplay.ts',
            'src/app/types/execution/formAndUi.ts',
        ],
    },
    {
        id: 'criminalStorePersistMigrate',
        paths: ['src/app/components/lawyer/criminal-system/criminalStorePersistMigrate.ts'],
    },
];

describe('phase-6 line budget — closed monsters (A–C)', () => {
    /** الاسم يحمل basename لا المسار: vitest يقتطع الاستبدال عند 40 محرفاً فتتطابق عناوين مجلّد واحد */
    it.each(
        PHASE6_CLOSED_ENTRIES.flatMap((e) =>
            e.paths.map((p) => ({ id: e.id, file: p.slice(p.lastIndexOf('/') + 1), path: p })),
        ),
    )('$id :: $file ≤1000', ({ path: rel }) => {
        expect(fs.existsSync(path.join(root, rel))).toBe(true);
        expect(lineCount(rel)).toBeLessThanOrEqual(BUDGET);
    });
});

describe('phase-6 close artifact', () => {
    it('exists and reports batch-C closure with no remaining over-1000 monsters', () => {
        const closePath = path.join(root, '.audit/phase-6-close.json');
        expect(fs.existsSync(closePath)).toBe(true);
        const close = JSON.parse(fs.readFileSync(closePath, 'utf8')) as {
            status: string;
            remainingOver1000: string[];
        };
        expect(close.status).toMatch(/closed/);
        expect(close.remainingOver1000).toEqual([]);
    });
});
