import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const components = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/components',
);
const helpersIndex = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/helpers/index.ts',
);

function read(rel: string): string {
    return fs.readFileSync(path.join(components, rel), 'utf8');
}

describe('Execution dead-code cleanup honesty', () => {
    it('الرموز المحذوفة/المُخفَّضة تبقى غير مُصدَّرة', () => {
        const followup = read('FollowupFlowBackButton.tsx');
        expect(followup).toContain('export const FollowupFlowBackButton');
        expect(followup).not.toContain('FollowupNestedPanel');
        expect(followup).not.toContain('FollowupNestedPanelProps');

        const header = read('dashboardHeaderSectionHelpers.tsx');
        expect(header).toContain('export const DetailCell');
        expect(header).not.toContain('mergeHeaderFields');
        expect(header).not.toContain('DashboardHeaderDetailCell');
        expect(header).not.toContain('shouldBypassHeaderToggle');
        expect(header).not.toContain('DashboardHeaderStatuteStatus');
        expect(header).not.toMatch(/export\s+function\s+isHeaderFieldsLike\b/);
        expect(header).not.toMatch(/export\s+function\s+mergeHeaderFields\b/);

        const guarantor = read('guarantorExternalUtils.ts');
        expect(guarantor).not.toContain('resolveGuarantorIdentity');

        const comm = read('communicationDecisionModel.ts');
        expect(comm).not.toMatch(/export\s+function\s+isCommunicationJournalOnlyWorkflow\b/);
        expect(comm).not.toMatch(/export\s+function\s+extractLetterBodyFromDecision\b/);
        expect(comm).not.toMatch(/export\s+function\s+buildCommunicationEventTrail\b/);
        expect(comm).not.toMatch(/export\s+type\s+CommunicationEventTrailItem\b/);
        expect(comm).not.toMatch(/export\s+function\s+extractDirectorate\b/);
        expect(comm).not.toMatch(/export\s+function\s+hasResult\b/);
        expect(comm).not.toMatch(/export\s+function\s+isFollowupDismissed\b/);
        expect(comm).not.toMatch(/export\s+function\s+isCommunicationFollowupComplete\b/);

        const barrel = fs.readFileSync(helpersIndex, 'utf8');
        expect(barrel).not.toMatch(/\bisSalarySeizureRow\b/);
        expect(barrel).not.toMatch(/\bheirRowCompletenessScore\b/);

        const eviction = read('evictionProcedureAfterApprove.tsx');
        expect(eviction).toContain('function saveEvictionFieldVisitSchedule');
        expect(eviction).not.toMatch(/export\s+function\s+saveEvictionFieldVisitSchedule\b/);
    });

    it('مصفوفة سيناريوهات المتابعة تحت __tests__/support فقط — لا وحدات إنتاج ميتة', () => {
        const followupDir = path.join(root, 'src/app/application/execution/followup');
        const supportDir = path.join(followupDir, '__tests__/support');
        const productionNames = [
            'followupActionRegistry.ts',
            'followupScenarioResolver.ts',
            'followupScenarioDefinitions.ts',
            'followupScenarioHiddenBaseline.ts',
            'followupScenarioHiddenInvariants.ts',
            'followupModalJourneyHarness.ts',
            'resolveFollowupHiddenActions.ts',
        ];
        for (const name of productionNames) {
            expect(fs.existsSync(path.join(followupDir, name))).toBe(false);
            expect(fs.existsSync(path.join(supportDir, name))).toBe(true);
        }
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardFollowupCluster.ts',
                ),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/hooks/useSubsequentNoticeFlow.ts',
                ),
            ),
        ).toBe(true);
        const noticeHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/useSubsequentNoticeFlow.ts',
            ),
            'utf8',
        );
        expect(noticeHook).toContain('buildSubsequentNoticePolicy');
        expect(noticeHook).toContain('buildSubsequentNoticePresentation');
    });

    it('موجة النفايات المثبتة: شيمات/أسماء/دوال مهجورة لا تُبعث', () => {
        const src = (...parts: string[]) => path.join(root, 'src', ...parts);
        const readSrc = (...parts: string[]) => fs.readFileSync(src(...parts), 'utf8');

        expect(fs.existsSync(src('app/components/lawyer/execution/executionModalStack.ts'))).toBe(
            false,
        );
        expect(
            fs.existsSync(src('app/components/lawyer/execution/evictionField/hooks/index.ts')),
        ).toBe(false);
        expect(
            fs.existsSync(src('app/components/lawyer/execution/personalCoercive/hooks/index.ts')),
        ).toBe(false);
        expect(
            fs.existsSync(src('app/components/lawyer/execution/personalCoercive/sections/index.ts')),
        ).toBe(false);

        const walkTs = (dir: string, acc: string[] = []): string[] => {
            if (!fs.existsSync(dir)) return acc;
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, ent.name);
                if (ent.isDirectory()) walkTs(p, acc);
                else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p);
            }
            return acc;
        };
        const execRoots = [
            src('app/components/lawyer/ExecutionDashboard'),
            src('app/components/lawyer/execution'),
            src('app/components/lawyer/ExecutionCreationView'),
        ];
        for (const file of execRoots.flatMap((d) => walkTs(d))) {
            const txt = fs.readFileSync(file, 'utf8');
            expect(txt).not.toMatch(/from\s+['"][^'"]*executionModalStack['"]/);
        }

        const investigation = readSrc(
            'app/components/lawyer/execution/coerciveStackInvestigationUtils.ts',
        );
        expect(investigation).not.toMatch(/\bcanWithdrawInvestigationCourtPath\b/);
        expect(investigation).not.toMatch(/\bisInvestigationCoerciveLaneSettled\b/);

        const alimony = readSrc(
            'app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator.ts',
        );
        expect(alimony).not.toMatch(/\bcomputePastAlimonyDurationMonths\b/);
        expect(alimony).not.toMatch(/\buseAlimonyCalculatorInsights\b/);

        const formOptions = readSrc(
            'app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationFormOptions.ts',
        );
        expect(formOptions).not.toMatch(/\bEXECUTION_DOC_TYPE_COMING_SOON\b/);

        const debtorCaps = readSrc(
            'app/components/lawyer/ExecutionCreationView/hooks/executionFormDebtorCaps.ts',
        );
        expect(debtorCaps).not.toMatch(/\bmaxManualSolidaryDebtForSlot\b/);
        expect(debtorCaps).not.toMatch(/\bcapManualSolidaryDebtRaw\b/);

        const visitationDates = readSrc(
            'app/domain/execution/visitation/visitationScheduleDateUtils.ts',
        );
        expect(visitationDates).not.toMatch(/\bcomputeSleepoverReturnYmd\b/);
        const visitationSessions = readSrc(
            'app/domain/execution/visitation/visitationScheduleSessions.ts',
        );
        expect(visitationSessions).not.toMatch(/\bsyncRollingTwoMonthSessions\b/);

        const law = read('LawReferencePanel.tsx');
        expect(law).not.toMatch(/\bisLawReferenceOpen\b/);
        expect(law).not.toMatch(/\bsetIsLawReferenceOpen\b/);

        const nav = read('ExecutionDossierHeaderNavButtons.tsx');
        expect(nav).not.toMatch(/\bshowBack\?:\s*boolean/);

        const shell = readSrc(
            'app/components/lawyer/ExecutionDashboard/executionModalMobileShell.ts',
        );
        expect(shell).not.toMatch(/\bEXEC_MODAL_DOSSIER_META_PANEL_CLASS\b/);

        const baseCache = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardBaseScopeCache.ts',
        );
        expect(baseCache).not.toMatch(/\bprefetchExecutionDashboardBaseScopeBuilder\b/);

        const timelineSync = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardTimelineAndGraceSync.ts',
        );
        expect(timelineSync).not.toMatch(/\bscopeTimelineEventsForActiveDossier\b/);

        const publishUtils = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/handlerClusterPublishUtils.ts',
        );
        expect(publishUtils).not.toMatch(/\bhandlerClusterPatchMeaningfullyChanged\b/);

        const gate = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterGate.ts',
        );
        expect(gate).not.toMatch(/\bshouldPreferLightHandlerClusterOnDossierMount\b/);
        expect(gate).not.toMatch(/\bshouldLoadExecutionHandlerClusterFollowupControlsOtherParty\b/);

        const stubs = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs.ts',
        );
        expect(stubs).not.toMatch(/\bisExecutionHandlerClusterStub\b/);
        expect(stubs).not.toMatch(/export\s*\{\s*HANDLER_STUB_BRAND\s*\}/);

        const windowBridge = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardWindowBridge.ts',
        );
        expect(windowBridge).not.toMatch(/\buseExecutionOpenCoerciveTabListener\b/);
        expect(windowBridge).not.toMatch(/\buseExecutionOpenDecisionsModalListener\b/);

        const personalOutcome = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome.ts',
        );
        expect(personalOutcome).not.toMatch(/\bisPersonalCoerciveDecisionWithdrawn\b/);

        const dossierDecisions = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions.ts',
        );
        expect(dossierDecisions).not.toMatch(/\bdossierDecisionShowsInlineActions\b/);

        const legacyTabs = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/followupLegacyTabNormalization.ts',
        );
        expect(legacyTabs).not.toMatch(/\bisLegacyFollowupModalTab\b/);
        expect(legacyTabs).not.toMatch(/\bLEGACY_FOLLOWUP_MODAL_TABS\b/);

        const movableFin = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils.ts',
        );
        expect(movableFin).not.toMatch(/\bmovableProceedsLedgerGapIqd\b/);
        const propertyFin = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils.ts',
        );
        expect(propertyFin).not.toMatch(/\bpropertyProceedsLedgerGapIqd\b/);

        const salary = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/salarySeizureLedgerSync.ts',
        );
        expect(salary).not.toMatch(/\bapplySalaryMonthlyDeduction\b/);
        expect(salary).not.toMatch(/\bdispatchSalaryDeductionToFinancialCenter\b/);
        expect(salary).not.toMatch(/\bfindSeizedSalaryAssetByDecisionId\b/);

        const mirror = readSrc(
            'app/domain/execution/otherParty/creditorOtherPartyMirrorVisibility.ts',
        );
        expect(mirror).not.toMatch(/\bisForcedBringMirrorSettled\b/);

        const trustLedger = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/seizureFinancialTrustLedgerUtils.ts',
        );
        expect(trustLedger).not.toMatch(/\bseizureProceedsLedgerGapIqd\b/);

        const helpersBarrel = fs.readFileSync(helpersIndex, 'utf8');
        expect(helpersBarrel).not.toMatch(/\bisSalarySeizureAsset\b/);
        expect(helpersBarrel).not.toMatch(/\bisMovablePropertySeizureRow\b/);
        expect(helpersBarrel).not.toMatch(/\bbuildSeizureRegistryDraftPatch\b/);
        expect(helpersBarrel).not.toMatch(/\bdedupeHeirDetailRowsByName\b/);
        expect(helpersBarrel).not.toMatch(/\bcollectPartyHeirDetailRows\b/);

        const partyEdit = readSrc(
            'app/components/lawyer/ExecutionDashboard/helpers/partyEditDisplayOverlay.ts',
        );
        expect(partyEdit).not.toMatch(/export\s+function\s+partyEditSurfaceSelector\b/);
        expect(partyEdit).not.toMatch(/export\s+function\s+applyPartyEditDisplayOverlayToParty\b/);

        const backNav = readSrc(
            'app/components/lawyer/ExecutionDashboard/utils/executionDossierBackNavigation.ts',
        );
        expect(backNav).not.toMatch(/export\s+const\s+EXECUTION_DOSSIER_STORE_MODAL_BACK_PRIORITY\b/);

        const police = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardPoliceAssistanceHandlers.ts',
        );
        expect(police).not.toMatch(/export\s+function\s+runSavePoliceAssistanceEntry\b/);

        const portalKeys = readSrc(
            'app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts',
        );
        expect(portalKeys).not.toMatch(/export\s+const\s+SEIZED_PROPERTY_PORTAL_PROP_KEYS\b/);
        expect(portalKeys).not.toMatch(/export\s+type\s+SeizedPropertyPortalPropKey\b/);
    });
});
