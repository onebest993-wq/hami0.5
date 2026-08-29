import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const phoneBodyPath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx',
);
const chunkHostPath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardChunkHost.tsx',
);
const viewPath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.tsx',
);
const resolvedViewPath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/hooks/ExecutionDashboardViewResolved.tsx',
);
const runtimeSurfacePath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/hooks/ExecutionDashboardResolvedRuntimeSurface.tsx',
);
const coerciveLifecycleBridgePath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterCoerciveLifecycleBridge.tsx',
);

describe('ExecutionDashboard structural splits', () => {
    it('keeps phone body on live scope ref without orphaned scroll-content split', () => {
        const phoneBody = fs.readFileSync(phoneBodyPath, 'utf8');
        const scrollContentPath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyScrollContent.tsx',
        );
        expect(fs.existsSync(scrollContentPath)).toBe(false);
        expect(phoneBody).toContain('useExecutionDashboardPhoneBodyScope');
        expect(phoneBody).toContain('ExecutionDashboardPhoneBodySecondarySections');
        expect(phoneBody).toContain('ExecutionDashboardPhoneBodyQuaternaryPanels');
        expect(phoneBody).toContain('ExecutionDashboardPhoneBodyTertiaryPanels');
        expect(phoneBody).toContain('includeCustodyRemoval={false}');
        expect(phoneBody).not.toContain('LazyActionGridSection');
        expect(phoneBody).not.toContain('LazyExecutionFinancialHubPortal');
    });

    it('uses grouped handler cluster boundaries and lazy phone body inside the chunk host', () => {
        const source = [
            fs.readFileSync(chunkHostPath, 'utf8'),
            fs.readFileSync(
                path.join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardChunkHostClusters.tsx',
                ),
                'utf8',
            ),
        ].join('\n');
        expect(source).toContain('ExecutionDashboardHandlerClusterGroups');
        expect(source).toContain('LazyExecutionDashboardCoerciveHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardSeizureHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardFollowupHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardPhoneBody');
        expect(source).not.toMatch(
            /import\s*\{\s*ExecutionDashboardPhoneBody\s*\}\s*from\s*'\.\/ExecutionDashboardPhoneBody'/,
        );
    });

    it('boot pipeline binds modal aliases via imported helper (no implicit global)', () => {
        const impl = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreBootPipelineImpl.ts',
            ),
            'utf8',
        );
        expect(impl).toMatch(/from\s+['"]\.\/bindExecutionDashboardBootModalAliases['"]/);
        expect(impl).toContain('bindExecutionDashboardBootModalAliases(modals, setExecutionModal)');
    });

    it('keeps a thin direct view chain and preserves seizure cluster flags in the runtime surface', () => {
        const shellSource = fs.readFileSync(viewPath, 'utf8');
        const resolvedSource = fs.readFileSync(resolvedViewPath, 'utf8');
        const runtimeSurfaceSource = fs.readFileSync(runtimeSurfacePath, 'utf8');
        const corePath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
        );
        expect(shellSource).toContain("ExecutionDashboardViewResolved");
        expect(shellSource).not.toContain('LazyExecutionDashboardViewResolved');
        expect(resolvedSource).toContain("ExecutionDashboardResolvedRuntimeSurface");
        expect(resolvedSource).not.toContain('LazyExecutionDashboardResolvedRuntimeSurface');
        expect(resolvedSource).toContain('useExecutionDashboardCore');
        expect(runtimeSurfaceSource).toContain('useExecutionDashboardCore');
        expect(runtimeSurfaceSource).toContain('ExecutionDashboardChunkHost');
        expect(runtimeSurfaceSource).not.toContain('useExecutionDashboardRuntimeAssembly');
        expect(runtimeSurfaceSource).not.toContain('LazyExecutionDashboardChunkHost');
        expect(runtimeSurfaceSource).toContain(
            'loadSeizureRequestsHandlerCluster: runtimeVm.loadSeizureRequestsHandlerCluster',
        );
        expect(runtimeSurfaceSource).toContain(
            'loadSeizureLogHandlerCluster: runtimeVm.loadSeizureLogHandlerCluster',
        );
        expect(fs.existsSync(corePath)).toBe(true);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardRuntimeAssembly.ts',
                ),
            ),
        ).toBe(false);
    });

    it('splits coercive lifecycle into dedicated lazy bridges', () => {
        const source = fs.readFileSync(coerciveLifecycleBridgePath, 'utf8');
        expect(source).toContain('LazyExecutionDashboardHandlerClusterCoerciveFoundationBridge');
        expect(source).toContain('LazyExecutionDashboardHandlerClusterCoerciveStayBridge');
        expect(source).toContain('LazyExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge');
    });

    it('hosts party death openers on the live Core path and loads real handlers via lazy bridge', () => {
        const corePath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
        );
        const residentSegmentPath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreDossierAndResidentSegment.ts',
        );
        const partyLifecycleBridgePath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterCoercivePartyLifecycleBridge.tsx',
        );
        const partyDeathBridgePath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterPartyDeathBridge.tsx',
        );
        const coreSource = fs.readFileSync(corePath, 'utf8');
        const residentSegment = fs.readFileSync(residentSegmentPath, 'utf8');
        const partyLifecycleBridge = fs.readFileSync(partyLifecycleBridgePath, 'utf8');
        const partyDeathBridge = fs.readFileSync(partyDeathBridgePath, 'utf8');
        expect(coreSource).toContain('useExecutionDashboardCoreDossierAndResidentSegment');
        expect(coreSource).toContain('loadPartyDeathHandlerCluster');
        expect(residentSegment).toContain('useExecutionDashboardPartyDeathOpeners(');
        expect(residentSegment).toContain('partyDeathHandlers');
        expect(residentSegment).toContain('loadPartyDeathHandlerCluster');
        expect(residentSegment).not.toContain('useExecutionDashboardPartyDeathHandlers(');
        expect(partyDeathBridge).toContain('useExecutionDashboardPartyDeathHandlers');
        expect(partyLifecycleBridge).not.toContain('useExecutionDashboardPartyDeathHandlers');
    });

    it('does not keep superseded monolithic handler-cluster bridges', () => {
        const coreDir = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
        );
        const removed = [
            'ExecutionDashboardHandlerClusterCoerciveHeavyBridge.tsx',
            'ExecutionDashboardHandlerClusterSeizureLogBridge.tsx',
            'ExecutionDashboardHandlerClusterSeizureRequestsBridge.tsx',
            'ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridge.tsx',
            'useExecutionDashboardCoreHandlerClusterCoerciveHeavy.ts',
        ];
        for (const file of removed) {
            expect(fs.existsSync(path.join(coreDir, file))).toBe(false);
        }

        const groupsPath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardHandlerClusterGroups.tsx',
        );
        const groupsSource = fs.readFileSync(groupsPath, 'utf8');
        expect(groupsSource).toContain('LazyExecutionDashboardHandlerClusterSeizureHeavyBridge');
        expect(groupsSource).toContain('LazyExecutionDashboardHandlerClusterSeizureLogAssetModalBridge');
        expect(groupsSource).toContain('LazyExecutionDashboardHandlerClusterSeizureLogResolutionBridge');
        expect(groupsSource).not.toContain('SeizureRequestsBridge');
        expect(groupsSource).not.toContain('SeizureLogBridge');
        expect(groupsSource).not.toContain('CoerciveHeavyBridge');
    });
});
