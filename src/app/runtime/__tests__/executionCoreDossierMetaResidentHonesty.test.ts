import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * عقد W0a: المسار الحي (Core) يستضيف workflow تعديل الإضبارة مقيماً،
 * ولا يقرأ العلم من Zustand ModalStates الميت.
 */
describe('execution Core — resident dossier meta workflow honesty', () => {
    const coreSrc = readFileSync(
        join(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'),
        'utf8',
    );
    const modalScopeSrc = readFileSync(
        join(
            process.cwd(),
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreModalScopeInput.ts',
        ),
        'utf8',
    );
    const storeSrc = readFileSync(
        join(process.cwd(), 'src/app/stores/executionDashboardStore.ts'),
        'utf8',
    );

    it('Core يستورد ويستضيف useExecutionDashboardUnifiedDossierMetaWorkflow', () => {
        expect(coreSrc).toContain('useExecutionDashboardUnifiedDossierMetaWorkflow');
        expect(coreSrc).toMatch(
            /const dossierMetaWorkflow = useExecutionDashboardUnifiedDossierMetaWorkflow\(/,
        );
        expect(coreSrc).toContain('...dossierMetaWorkflow');
        expect(coreSrc).toContain('dossierMetaWorkflow,');
    });

    it('Core لا يمرّر setShowEditDossierMetaModal من dossierLifecyclePanel', () => {
        expect(coreSrc).not.toMatch(
            /setShowEditDossierMetaModal:\s*dossierLifecyclePanel\.setShowEditDossierMetaModal/,
        );
        expect(coreSrc).toMatch(
            /setShowEditDossierMetaModal:\s*dossierMetaWorkflow\.setShowEditDossierMetaModal/,
        );
        expect(coreSrc).toMatch(
            /showEditDossierMetaModal:\s*dossierMetaWorkflow\.showEditDossierMetaModal/,
        );
    });

    it('modalScopeInput يقرأ العلم من المعامل لا من modals.showEditDossierMetaModal', () => {
        expect(modalScopeSrc).not.toMatch(
            /showEditDossierMetaModal:\s*modals\.showEditDossierMetaModal/,
        );
        expect(modalScopeSrc).toMatch(
            /showEditDossierMetaModal:\s*Boolean\(p\.showEditDossierMetaModal\)/,
        );
    });

    it('Zustand ModalStates ما زال بلا showEditDossierMetaModal (العقد: workflow محلي)', () => {
        const modalBlock = storeSrc.slice(
            storeSrc.indexOf('interface ModalStates'),
            storeSrc.indexOf('interface NoteFormData'),
        );
        expect(modalBlock).not.toContain('showEditDossierMetaModal');
    });
});

describe('execution Core — resident followup open honesty (W0b)', () => {
    const coreSrc = readFileSync(
        join(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'),
        'utf8',
    );
    const handlerClusterRuntimeSrc = readFileSync(
        join(
            process.cwd(),
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerClusterRuntime.ts',
        ),
        'utf8',
    );
    const prefetchEffectsSrc = readFileSync(
        join(
            process.cwd(),
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerPrefetchEffects.ts',
        ),
        'utf8',
    );
    const shellSrc = readFileSync(
        join(
            process.cwd(),
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionFollowupModalShell.tsx',
        ),
        'utf8',
    );

    it('Core يستضيف handleMemoFollowupClick ومعالجات notes على Core مباشرة', () => {
        expect(coreSrc).toMatch(/const handleMemoFollowupClick = useCallback\(/);
        expect(coreSrc).toContain('followupDebtor.openFollowupModalPersisted');
        expect(coreSrc).toContain('useExecutionDashboardCoreResidentHandlers');
        expect(coreSrc).toContain('...coreResidentHandlers');
        expect(handlerClusterRuntimeSrc).toMatch(
            /shouldLoadExecutionHandlerClusterLight\(handlerClusterGateInput\)/,
        );
        expect(handlerClusterRuntimeSrc).toMatch(
            /shouldLoadExecutionHandlerClusterFollowupAdminSpecial\(handlerClusterGateInput\)/,
        );
        expect(handlerClusterRuntimeSrc).toMatch(
            /shouldLoadExecutionHandlerClusterFollowupDossierControls\(handlerClusterGateInput\)/,
        );
        expect(handlerClusterRuntimeSrc).toMatch(
            /shouldLoadExecutionHandlerClusterFollowupOtherParty\(handlerClusterGateInput\)/,
        );
        expect(handlerClusterRuntimeSrc).toMatch(
            /shouldLoadExecutionHandlerClusterDossierSupport\(handlerClusterGateInput\)/,
        );
        expect(coreSrc).toContain('useExecutionDashboardCoreHandlerPrefetchEffects');
        expect(prefetchEffectsSrc).toContain('registerExecutionHandlerStubNotifier');
        expect(prefetchEffectsSrc).toContain('prefetchExecutionHandlersForStubPath');
        expect(prefetchEffectsSrc).toContain('followup-admin-special');
        expect(prefetchEffectsSrc).toContain('followup-dossier-controls');
    });

    it('Shell الحي يحمل عقود e2e testid', () => {
        expect(shellSrc).toContain('data-testid="execution-followup-modal"');
        expect(shellSrc).toContain('data-testid="execution-followup-modal-close"');
    });
});
