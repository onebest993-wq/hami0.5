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
    it('keeps extracted phone-body section modules composed (ScrollContent owns Secondary+Deferred)', () => {
        const phoneBody = fs.readFileSync(phoneBodyPath, 'utf8');
        const scrollContentPath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBodyScrollContent.tsx',
        );
        const scrollContent = fs.readFileSync(scrollContentPath, 'utf8');
        // ScrollContent is the extracted live module; PhoneBody still reads scope inline
        // during staged cutover — verify extraction composition here.
        expect(scrollContent).toContain('ExecutionDashboardPhoneBodySecondarySections');
        expect(scrollContent).toContain('ExecutionDashboardPhoneBodyDeferredPanels');
        expect(scrollContent).not.toContain('LazyExecutionDashboardPhoneBodySecondarySections');
        expect(scrollContent).not.toContain('LazyExecutionDashboardPhoneBodyDeferredPanels');
        expect(phoneBody).toContain('useExecutionPhoneBodyScopeRef');
    });

    it('uses grouped handler cluster boundaries and lazy phone body inside the chunk host', () => {
        const source = fs.readFileSync(chunkHostPath, 'utf8');
        expect(source).toContain('ExecutionDashboardHandlerClusterGroups');
        expect(source).toContain('LazyExecutionDashboardCoerciveHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardSeizureHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardFollowupHandlerClusterGroup');
        expect(source).toContain('LazyExecutionDashboardPhoneBody');
        expect(source).not.toMatch(
            /import\s*\{\s*ExecutionDashboardPhoneBody\s*\}\s*from\s*'\.\/ExecutionDashboardPhoneBody'/,
        );
    });

    it('keeps a thin direct view chain and preserves seizure cluster flags in the runtime surface', () => {
        const shellSource = fs.readFileSync(viewPath, 'utf8');
        const resolvedSource = fs.readFileSync(resolvedViewPath, 'utf8');
        const runtimeSurfaceSource = fs.readFileSync(runtimeSurfacePath, 'utf8');
        expect(shellSource).toContain("ExecutionDashboardViewResolved");
        expect(shellSource).not.toContain('LazyExecutionDashboardViewResolved');
        expect(resolvedSource).toContain("ExecutionDashboardResolvedRuntimeSurface");
        expect(resolvedSource).not.toContain('LazyExecutionDashboardResolvedRuntimeSurface');
        expect(runtimeSurfaceSource).toContain('useExecutionDashboardRuntimeAssembly');
        expect(runtimeSurfaceSource).toContain('ExecutionDashboardChunkHost');
        // المسار الحيّ: Core يجمّع؛ Surface لا يستدعي Assembly كـ hook (يمنع double-hook)
        expect(runtimeSurfaceSource).toContain('void useExecutionDashboardRuntimeAssembly');
        expect(runtimeSurfaceSource).not.toMatch(
            /useExecutionDashboardRuntimeAssembly\s*\(\s*vm/,
        );
        expect(runtimeSurfaceSource).not.toContain('LazyExecutionDashboardChunkHost');
        expect(runtimeSurfaceSource).toContain(
            'loadSeizureRequestsHandlerCluster: runtimeVm.loadSeizureRequestsHandlerCluster',
        );
        expect(runtimeSurfaceSource).toContain(
            'loadSeizureLogHandlerCluster: runtimeVm.loadSeizureLogHandlerCluster',
        );
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
        const runtimeAssemblyPath = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardRuntimeAssembly.ts',
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
        const runtimeAssembly = fs.readFileSync(runtimeAssemblyPath, 'utf8');
        const partyLifecycleBridge = fs.readFileSync(partyLifecycleBridgePath, 'utf8');
        const partyDeathBridge = fs.readFileSync(partyDeathBridgePath, 'utf8');
        // المسار الحيّ: Core يملك الفتحات الخفيفة
        expect(coreSource).toContain('useExecutionDashboardPartyDeathOpeners(');
        expect(coreSource).toContain('partyDeathHandlers');
        expect(coreSource).toContain('loadPartyDeathHandlerCluster');
        expect(coreSource).not.toContain('useExecutionDashboardPartyDeathHandlers(');
        // التوأم التاريخي Assembly يحتفظ بنفس العقد (لا يُستدعى من Surface الحيّ)
        expect(runtimeAssembly).toContain('useExecutionDashboardPartyDeathOpeners(');
        // الجسر الحقيقي يحمل الـ hook
        expect(partyDeathBridge).toContain('useExecutionDashboardPartyDeathHandlers');
        // منع عودة النسخة المكررة داخل جسر lifecycle
        expect(partyLifecycleBridge).not.toContain('useExecutionDashboardPartyDeathHandlers');
    });
});
