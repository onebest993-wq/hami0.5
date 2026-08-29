import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dashboardPath = path.join(
    root,
    'src/app/components/lawyer/criminal-system/CriminalDashboardResolvedRuntime.tsx',
);
const orchestrationPath = path.join(
    root,
    'src/app/components/lawyer/criminal-system/useCriminalDashboardResolvedOrchestration.ts',
);
const registryPath = path.join(
    root,
    'src/app/components/lawyer/criminal-system/criminalDashboardLazyRegistry.ts',
);

const dossierBodyPath = path.join(
    root,
    'src/app/components/lawyer/criminal-system/CriminalDashboardDossierBody.tsx',
);

function readRuntimeSource(): string {
    return fs.readFileSync(dashboardPath, 'utf8');
}

function readOrchestrationSource(): string {
    return fs.readFileSync(orchestrationPath, 'utf8');
}

describe('CriminalDashboard structural splits', () => {
    it('ResolvedRuntime is a thin shell over useCriminalDashboardResolvedOrchestration', () => {
        const runtimeSource = readRuntimeSource();
        expect(runtimeSource).toContain('useCriminalDashboardResolvedOrchestration');
        expect(runtimeSource).toContain('CriminalDashboardResolvedRuntimeShell');
        expect(runtimeSource).not.toContain('useCriminalDashboardStoreBindings');
        expect(runtimeSource).not.toContain('useCriminalDashboardCaseFacts');
        expect(runtimeSource.length).toBeLessThan(3500);
    });

    it('routes statements and tracking tabs through dedicated lazy containers (via the dossier body host)', () => {
        const runtimeSource = readRuntimeSource();
        const dossierBodySource = fs.readFileSync(dossierBodyPath, 'utf8');
        expect(dossierBodySource).toContain('LazyCriminalDashboardStatementsTab');
        expect(dossierBodySource).toContain('CriminalDossierTrackingPanel');
        expect(runtimeSource).not.toContain('useCriminalDashboardStatementsTabData');
        expect(dossierBodySource).not.toContain('useCriminalDashboardStatementsTabData');
    });

    it('registers statements and tracking containers in the criminal lazy registry', () => {
        const registrySource = fs.readFileSync(registryPath, 'utf8');
        expect(registrySource).toContain('criminalDashboardStatementsTabImport');
        expect(registrySource).toContain('criminalDashboardTrackingTabImport');
        expect(registrySource).toContain('LazyCriminalDashboardStatementsTab');
        expect(registrySource).toContain('LazyCriminalDashboardTrackingTab');
    });

    it('delegates the modals host JSX to a dedicated component instead of inlining it', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain('assembleCriminalDashboardModalsHostProps');
        expect(orchestrationSource).not.toContain('<JudicialCassationAppealModal');

        const modalsHostPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHost.tsx',
        );
        const modalsHostSource = fs.readFileSync(modalsHostPath, 'utf8');
        expect(modalsHostSource).toContain('export function CriminalDashboardModalsHost');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostCassation');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostInvestigation');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostTrial');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostRequests');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostIdentity');
        expect(modalsHostSource).toContain("from './criminalDashboardModalsHostProps'");
        expect(modalsHostSource).toContain('IdentityEditState');
        expect(modalsHostSource).toContain('ConfirmActionState');
        expect(modalsHostSource).toContain('CriminalDashboardModalsHostProps');

        const cassationPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/CriminalDashboardModalsHostCassation.tsx',
        );
        const cassationSource = fs.readFileSync(cassationPath, 'utf8');
        expect(cassationSource).toContain('<JudicialCassationAppealModal');
        expect(cassationSource).toContain('export function CriminalDashboardModalsHostCassation');
    });

    it('delegates the stage closer submit logic to the orchestrators layer instead of a local function body', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).not.toMatch(/const submitStageCloser = \(/);
        expect(orchestrationSource).not.toMatch(/const submitPrivateRightWaiverDecision = \(/);
        expect(orchestrationSource).toContain(
            "import { useCriminalStageCloserSubmit } from './orchestrators/useCriminalStageCloserSubmit';",
        );
        expect(orchestrationSource).toContain('useCriminalStageCloserSubmit({');

        const submitPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/orchestrators/useCriminalStageCloserSubmit.ts',
        );
        const submitSource = fs.readFileSync(submitPath, 'utf8');
        expect(submitSource).toContain('export function useCriminalStageCloserSubmit');
        expect(submitSource).toContain('const submitStageCloser = ()');
    });

    it('delegates the requests-modal derived logic + handlers to a dedicated controller hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).not.toMatch(/const buildRequestPayloadBase = \(/);
        expect(orchestrationSource).not.toMatch(/const commitCreateRequest = \(/);
        expect(orchestrationSource).not.toMatch(/const commitFinalizeRequest = \(/);
        expect(orchestrationSource).not.toMatch(/const loadRequestIntoModal = \(/);
        expect(orchestrationSource).not.toMatch(/const applyJudicialTemplate = \(/);
        expect(orchestrationSource).not.toMatch(/const applyLawyerTemplate = \(/);
        expect(orchestrationSource).toContain(
            "import { useCriminalRequestsModalController } from './useCriminalRequestsModalController';",
        );
        expect(orchestrationSource).toContain('useCriminalRequestsModalController({');

        const controllerPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalRequestsModalController.ts',
        );
        const controllerSource = fs.readFileSync(controllerPath, 'utf8');
        expect(controllerSource).toContain('export function useCriminalRequestsModalController');
        // بناء الحمولة + إنشاء/إغلاق الطلب انتقلت إلى وحدة فرعية مخصّصة (composer فقط يجمع الناتج).
        expect(controllerSource).not.toMatch(/const buildRequestPayloadBase = \(/);
        expect(controllerSource).not.toMatch(/const commitCreateRequest = \(/);
        expect(controllerSource).not.toMatch(/const commitFinalizeRequest = \(/);
        expect(controllerSource).toContain(
            "import { useCriminalRequestCommitFlow } from './useCriminalRequestCommitFlow';",
        );
        expect(controllerSource).toContain('useCriminalRequestCommitFlow({');

        const commitFlowPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalRequestCommitFlow.ts',
        );
        const commitFlowSource = fs.readFileSync(commitFlowPath, 'utf8');
        expect(commitFlowSource).toContain('export function useCriminalRequestCommitFlow');
        expect(commitFlowSource).toContain('const buildRequestPayloadBase = ()');
        expect(commitFlowSource).toContain('const commitCreateRequest = (');
        expect(commitFlowSource).toContain('const commitFinalizeRequest = (');
    });

    it('splits the requests-modal controller into dedicated party-scope/template/specialty/form-flags/openers submodules', () => {
        const controllerPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalRequestsModalController.ts',
        );
        const controllerSource = fs.readFileSync(controllerPath, 'utf8');
        for (const [importName, fileName] of [
            ['useCriminalRequestPartyScope', 'useCriminalRequestPartyScope'],
            ['useCriminalRequestTemplateHandlers', 'useCriminalRequestTemplateHandlers'],
            ['useCriminalRequestSpecialtyFields', 'useCriminalRequestSpecialtyFields'],
            ['useCriminalRequestFormFlags', 'useCriminalRequestFormFlags'],
            ['useCriminalRequestModalOpeners', 'useCriminalRequestModalOpeners'],
        ]) {
            expect(controllerSource).toContain(`import { ${importName} } from './${fileName}';`);
            expect(controllerSource).toContain(`${importName}({`);

            const submodulePath = path.join(root, `src/app/components/lawyer/criminal-system/${fileName}.ts`);
            const submoduleSource = fs.readFileSync(submodulePath, 'utf8');
            expect(submoduleSource).toContain(`export function ${importName}`);
        }
    });

    it('delegates the dossier body JSX (header/banners/parties/tabs) to a dedicated presentational host', () => {
        const runtimeSource = readRuntimeSource();
        const shellPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/CriminalDashboardResolvedRuntimeShell.tsx',
        );
        const shellSource = fs.readFileSync(shellPath, 'utf8');
        expect(shellSource).toContain('CriminalDashboardDossierBody');
        expect(shellSource).toContain(
            "import { CriminalDashboardDossierBody } from './CriminalDashboardDossierBody';",
        );
        expect(runtimeSource).not.toContain('<LazyCriminalDashboardHeader');
        expect(runtimeSource).not.toContain('<LazyCriminalPartiesGrid');
        expect(runtimeSource).not.toContain('<LazyCriminalDashboardRequestsTab');
        expect(runtimeSource).not.toContain('<LazyCriminalDashboardStatementsTab');
        expect(runtimeSource).not.toContain('<LazyCriminalDashboardTrackingTab');
        expect(runtimeSource).not.toContain('<CaseJourneyHeader');
        expect(runtimeSource).not.toContain('<CriminalDossierTopBanners');
        expect(runtimeSource).not.toContain('<CriminalDossierMidBanners');
        // ModalsHost يُحمَّل lazy داخل Shell + مسار التفريق يبقى هنا
        expect(shellSource).toContain('<LazyCriminalDashboardModalsHost');
        expect(shellSource).toContain("import('./CriminalDashboardModalsHost')");
        expect(shellSource).toContain('isInlineSeveranceFormOpen && pendingSeveranceContext?.parentCaseId === id');
        expect(runtimeSource).toContain('CriminalDashboardResolvedRuntimeShell');

        const dossierBodySource = fs.readFileSync(dossierBodyPath, 'utf8');
        expect(dossierBodySource).toContain('export function CriminalDashboardDossierBody');
        expect(dossierBodySource).toContain('<LazyCriminalDashboardHeader');
        expect(dossierBodySource).toContain('<LazyCriminalPartiesGrid');
        expect(dossierBodySource).toContain('<LazyCriminalDashboardStatementsTab');
        expect(dossierBodySource).toContain('<CaseJourneyHeader');
        expect(dossierBodySource).toContain('<CriminalDossierTopBanners');
        expect(dossierBodySource).toContain('<CriminalDossierMidBanners');
        expect(dossierBodySource).toContain('<CriminalDossierRequestsPanel');
        expect(dossierBodySource).toContain('<CriminalDossierTrackingPanel');
        expect(dossierBodySource).not.toContain('<CriminalDashboardModalsHost');

        const requestsPanelSource = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/criminal-system/CriminalDossierRequestsPanel.tsx'),
            'utf8',
        );
        const trackingPanelSource = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/criminal-system/CriminalDossierTrackingPanel.tsx'),
            'utf8',
        );
        expect(requestsPanelSource).toContain('<LazyCriminalDashboardRequestsTab');
        expect(trackingPanelSource).toContain('<LazyCriminalDashboardTrackingTab');
    });

    it('delegates the Escape/back navigation guard to a dedicated hook instead of a local handler + effect', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).not.toMatch(/const handleDashboardBack = useCallback\(/);
        expect(orchestrationSource).not.toContain("window.addEventListener('keydown', onKeyDown, true)");
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardNavigationGuard } from './useCriminalDashboardNavigationGuard';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardNavigationGuard({');
        expect(orchestrationSource).toContain(
            'const { handleDashboardBack, dossierNestedNav } = useCriminalDashboardNavigationGuard(',
        );
        // handleDashboardBack is forwarded to the dossier body via the props-bag builder (shorthand), not inline JSX.
        expect(orchestrationSource).toMatch(
            /useCriminalDashboardDossierBodyProps\(\{[\s\S]*?\bhandleDashboardBack\b[\s\S]*?\bdossierNestedNav\b[\s\S]*?\}\);/,
        );

        const navigationGuardPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardNavigationGuard.ts',
        );
        const navigationGuardSource = fs.readFileSync(navigationGuardPath, 'utf8');
        expect(navigationGuardSource).toContain('export function useCriminalDashboardNavigationGuard');
        expect(navigationGuardSource).toContain('const handleDashboardBack = useCallback(');
        expect(navigationGuardSource).toContain('tryCloseCriminalDashboardOverlayLayer');
        // Bubble Escape so local canvas/hearing capture handlers can win first.
        expect(navigationGuardSource).toContain("window.addEventListener('keydown', onKeyDown)");
        expect(navigationGuardSource).not.toContain("window.addEventListener('keydown', onKeyDown, true)");
        expect(navigationGuardSource).toMatch(/طبقات محلية|criminalLocalOverlayBackStack|useProceduralCanvasOverlayEscape/);
        expect(navigationGuardSource).toContain('return { handleDashboardBack, dossierNestedNav };');

        const overlayClosePath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/tryCloseCriminalDashboardOverlayLayer.ts',
        );
        const overlayCloseSource = fs.readFileSync(overlayClosePath, 'utf8');
        expect(overlayCloseSource).toContain('tryPopCriminalLocalOverlayBack()');
        expect(overlayCloseSource).toContain('export function tryCloseCriminalDashboardOverlayLayer');

        const canvasPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/components/RecursiveProceduralCanvas.tsx',
        );
        const canvasSource = fs.readFileSync(canvasPath, 'utf8');
        expect(canvasSource).toContain('useProceduralCanvasOverlayEscape');

        const requestsTabPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/CriminalDashboardRequestsTab.tsx',
        );
        const requestsTabSource = fs.readFileSync(requestsTabPath, 'utf8');
        expect(requestsTabSource).toContain('useCriminalLocalOverlayEscape');
    });

    it('delegates the useCriminalStore selector bindings to a dedicated hook instead of dozens of inline calls', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardStoreBindings } from './useCriminalDashboardStoreBindings';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardStoreBindings(id)');

        const directStoreCalls = orchestrationSource.match(/useCriminalStore\(/g) ?? [];
        expect(directStoreCalls.length).toBeLessThanOrEqual(5);

        const bindingsPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardStoreBindings.ts',
        );
        const bindingsSource = fs.readFileSync(bindingsPath, 'utf8');
        expect(bindingsSource).toContain('export function useCriminalDashboardStoreBindings');
        const bindingsStoreCalls = bindingsSource.match(/useCriminalStore\(/g) ?? [];
        expect(bindingsStoreCalls.length).toBeGreaterThanOrEqual(60);
    });

    it('delegates case-facts derived state (identity/parties/edit permissions) to a dedicated hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardCaseFacts } from './useCriminalDashboardCaseFacts';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardCaseFacts({');
        expect(orchestrationSource).not.toMatch(/const ourRepresentation: OurRepresentation = \(\(\) => \{/);

        const caseFactsPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardCaseFacts.ts',
        );
        const caseFactsSource = fs.readFileSync(caseFactsPath, 'utf8');
        expect(caseFactsSource).toContain('export function useCriminalDashboardCaseFacts');
        expect(caseFactsSource).toContain('const ourRepresentation: OurRepresentation = (() => {');
        expect(caseFactsSource).toContain('const activeParties = useMemo(');
    });

    it('delegates the stage journey + material read-only flags to a dedicated orchestrator', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalJourneyStageAccessOrchestrator } from './orchestrators/useCriminalJourneyStageAccessOrchestrator';",
        );
        expect(orchestrationSource).toContain('useCriminalJourneyStageAccessOrchestrator({');
        expect(orchestrationSource).not.toMatch(/const isDecisionsTabMaterialReadOnly =\s*\n\s*isTimelineArchiveReadOnly \|\|\s*\n\s*isDashboardReadOnly \|\|\s*\n\s*isInterventionReview \|\|\s*\n\s*isInvestigationMaterialReadOnly;/);

        const orchestratorPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/orchestrators/useCriminalJourneyStageAccessOrchestrator.ts',
        );
        const orchestratorSource = fs.readFileSync(orchestratorPath, 'utf8');
        expect(orchestratorSource).toContain('export function useCriminalJourneyStageAccessOrchestrator');
        expect(orchestratorSource).toContain('repairSameCourtRemandJourneyNodes');
        expect(orchestratorSource).toContain('isDecisionsTabMaterialReadOnly');
    });

    it('delegates modal/edit local UI state (state + setters only) to a dedicated hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardModalUiState } from './useCriminalDashboardModalUiState';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardModalUiState({ id })');
        expect(orchestrationSource).not.toMatch(/const \[isStatementModalOpen, setIsStatementModalOpen\] = useState/);
        expect(orchestrationSource).not.toMatch(/const \[forfeitureModal, setForfeitureModal\] = useState/);

        const modalUiStatePath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardModalUiState.ts',
        );
        const modalUiStateSource = fs.readFileSync(modalUiStatePath, 'utf8');
        expect(modalUiStateSource).toContain('export function useCriminalDashboardModalUiState');
        expect(modalUiStateSource).toContain('const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);');
        expect(modalUiStateSource).toContain('const [forfeitureModal, setForfeitureModal] = useState<CriminalDashboardForfeitureModal>(null);');
        // Submit handlers for cassation/merge live in useCriminalDashboardCassationMergeActions, not here.
        expect(modalUiStateSource).not.toContain('const submitMergeCases');
        expect(modalUiStateSource).not.toContain('const submitSendToCassation');
        expect(modalUiStateSource).not.toContain('const openSendToCassation');
        expect(modalUiStateSource).not.toContain('const openMergeCases');
    });

    it('delegates cassation-deadline/in-absentia banners and merge derivations to a dedicated hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardCaseBanners } from './useCriminalDashboardCaseBanners';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardCaseBanners({');
        expect(orchestrationSource).not.toMatch(/const inAbsentiaBanners = useMemo\(\(\) => \{/);

        const bannersPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardCaseBanners.ts',
        );
        const bannersSource = fs.readFileSync(bannersPath, 'utf8');
        expect(bannersSource).toContain('export function useCriminalDashboardCaseBanners');
        expect(bannersSource).toContain('const inAbsentiaBanners = useMemo(() => {');
        expect(bannersSource).toContain('const mergedCaseDisplayLinks = useMemo(');
    });

    it('delegates cassation send + merge open/submit handlers to a dedicated actions hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { useCriminalDashboardCassationMergeActions } from './useCriminalDashboardCassationMergeActions';",
        );
        expect(orchestrationSource).toContain('useCriminalDashboardCassationMergeActions({');
        expect(orchestrationSource).not.toMatch(/const openSendToCassation = \(\) => \{/);
        expect(orchestrationSource).not.toMatch(/const submitSendToCassation = \(\) => \{/);
        expect(orchestrationSource).not.toMatch(/const openMergeCases = \(\) => \{/);
        expect(orchestrationSource).not.toMatch(/const submitMergeCases = \(\) => \{/);
        expect(orchestrationSource).not.toMatch(/const sendToCassationOnVerdictCard =/);

        const actionsPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/useCriminalDashboardCassationMergeActions.ts',
        );
        const actionsSource = fs.readFileSync(actionsPath, 'utf8');
        expect(actionsSource).toContain('export function useCriminalDashboardCassationMergeActions');
        expect(actionsSource).toContain('const openSendToCassation = () => {');
        expect(actionsSource).toContain('const submitSendToCassation = () => {');
        expect(actionsSource).toContain('const openMergeCases = () => {');
        expect(actionsSource).toContain('const submitMergeCases = () => {');
        expect(actionsSource).toContain('const sendToCassationOnVerdictCard =');
    });

    it('delegates the header title resolution to a pure helper function', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).toContain(
            "import { resolveCriminalDashboardHeaderTitle } from './criminalDashboardHeaderTitle';",
        );
        expect(orchestrationSource).toContain('resolveCriminalDashboardHeaderTitle(criminalCase, stage, caseStage, isInvestigationPhase, isTrialCourtStage)');
        expect(orchestrationSource).not.toContain('const buildCaseReferenceMetaParts = ()');

        const headerTitlePath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/criminalDashboardHeaderTitle.ts',
        );
        const headerTitleSource = fs.readFileSync(headerTitlePath, 'utf8');
        expect(headerTitleSource).toContain('export function resolveCriminalDashboardHeaderTitle');
        expect(headerTitleSource).toContain('const buildCaseReferenceMetaParts = ()');
    });

    it('does not leave dead/unused code from earlier extraction waves in the orchestration hook', () => {
        const orchestrationSource = readOrchestrationSource();
        expect(orchestrationSource).not.toMatch(/const _\w+ =/);
        expect(orchestrationSource).not.toContain('_hasMergedChildDossiers');
    });

    it('CriminalDashboard entry re-exports ResolvedRuntime without nested Suspense (Portal owns BootChrome)', () => {
        const entryPath = path.join(
            root,
            'src/app/components/lawyer/criminal-system/CriminalDashboard.tsx',
        );
        const entrySource = fs.readFileSync(entryPath, 'utf8');
        expect(entrySource).toContain('CriminalDashboardResolvedRuntime');
        expect(entrySource).not.toContain('lazy(');
        expect(entrySource).not.toContain('CriminalDashboardBootChrome');
    });

    it('uses lazy surface fallbacks in dossier body instead of null Suspense placeholders', () => {
        const dossierBodySource = fs.readFileSync(dossierBodyPath, 'utf8');
        expect(dossierBodySource).toContain('CriminalDashboardLazySurfaceFallback');
        expect(dossierBodySource).not.toContain('fallback={null}');
        expect(dossierBodySource).toMatch(
            /<CriminalDossierHeaderLazyBoundary[\s\S]*onNavExit=\{onExitToHome\}/,
        );
    });

    it('Portal ErrorBoundary resets with caseId so a crash does not stick across reopens', () => {
        const portal = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/criminal-system/CriminalDashboardPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('ErrorBoundary key={caseId}');
        expect(portal).toContain('criminal-dossier-error-fallback');
    });
});
