import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const coreSrc = readFileSync(
    join(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'),
    'utf8',
);
const residentSegmentSrc = readFileSync(
    join(
        process.cwd(),
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreDossierAndResidentSegment.ts',
    ),
    'utf8',
);

/**
 * عقد W0a: المسار الحي (Core → DossierAndResidentSegment) يستضيف workflow تعديل الإضبارة مقيماً،
 * ولا يقرأ العلم من Zustand ModalStates الميت.
 */
describe('execution Core — resident dossier meta workflow honesty', () => {
    const modalScopeSrc = readFileSync(
        join(
            process.cwd(),
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardCoreModalScopeInput.ts',
        ),
        'utf8',
    );
    const storeTypesSrc = readFileSync(
        join(process.cwd(), 'src/app/stores/executionDashboardStore/types.ts'),
        'utf8',
    );

    it('Core يركّب DossierAndResidentSegment الذي يستضيف UnifiedDossierMetaWorkflow', () => {
        expect(coreSrc).toContain('useExecutionDashboardCoreDossierAndResidentSegment');
        expect(coreSrc).toContain('dossierMetaWorkflow');
        expect(residentSegmentSrc).toContain('useExecutionDashboardUnifiedDossierMetaWorkflow');
        expect(residentSegmentSrc).toMatch(
            /const dossierMetaWorkflow = useExecutionDashboardUnifiedDossierMetaWorkflow\(/,
        );
        expect(residentSegmentSrc).toContain('dossierMetaWorkflow,');
        expect(coreSrc).toContain('loadError: boot.loadError');
    });

    it('Core لا يمرّر setShowEditDossierMetaModal من dossierLifecyclePanel', () => {
        const modalChunkSrc = readFileSync(
            join(
                process.cwd(),
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreModalAndChunkInputs.ts',
            ),
            'utf8',
        );
        expect(coreSrc).not.toMatch(
            /setShowEditDossierMetaModal:\s*dossierLifecyclePanel\.setShowEditDossierMetaModal/,
        );
        expect(coreSrc).toContain('dossierMetaWorkflow');
        expect(coreSrc).toContain('useExecutionDashboardCoreModalAndChunkInputs');
        expect(modalChunkSrc).toMatch(
            /setShowEditDossierMetaModal:\s*p\.dossierMetaWorkflow\.setShowEditDossierMetaModal/,
        );
        expect(modalChunkSrc).toMatch(
            /showEditDossierMetaModal:\s*p\.dossierMetaWorkflow\.showEditDossierMetaModal/,
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
        const modalBlock = storeTypesSrc.slice(
            storeTypesSrc.indexOf('export interface ModalStates'),
            storeTypesSrc.indexOf('export interface NoteFormData'),
        );
        expect(modalBlock.length).toBeGreaterThan(0);
        expect(modalBlock).not.toContain('showEditDossierMetaModal');
    });
});

describe('execution Core — resident followup open honesty (W0b)', () => {
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

    it('Core يمرّر coreResidentHandlers من Segment الذي يستضيف handleMemoFollowupClick', () => {
        expect(coreSrc).toContain('useExecutionDashboardCoreDossierAndResidentSegment');
        expect(coreSrc).toContain('coreResidentHandlers');
        expect(residentSegmentSrc).toMatch(/const handleMemoFollowupClick = useCallback\(/);
        expect(residentSegmentSrc).toContain('followupDebtor.openFollowupModalPersisted');
        expect(residentSegmentSrc).toContain('useExecutionDashboardCoreResidentHandlers');
        expect(residentSegmentSrc).toContain('...coreResidentHandlers');
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
