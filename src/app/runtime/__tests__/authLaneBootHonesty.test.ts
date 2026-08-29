import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('auth lane boot honesty', () => {
    it('مسار الهوية لا يسحب FullBoot ساكناً من البوابة', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/LawyerDashboardGate.tsx'),
            'utf8',
        );
        expect(gate).not.toContain('LawyerDashboardFullBootPath');
        expect(gate).not.toContain("from '@/app/components/lawyer/dashboard/LawyerDashboardInner'");
        expect(gate).toContain('LawyerAuthLaneHost');
        expect(gate).toContain('prefetchLawyerAuthLane');
        const lane = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerAuth/LawyerAuthLaneHost.tsx'),
            'utf8',
        );
        expect(lane).toContain('authHydrating');
        const dashboardAuth = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardAuth.tsx'),
            'utf8',
        );
        expect(dashboardAuth).toContain('authHydrating');
        expect(dashboardAuth).toContain('lawyer-auth-gate-loading');
        expect(dashboardAuth).not.toMatch(/authLoading = false/);
        const authCtx = fs.readFileSync(path.join(root, 'src/app/context/AuthContext.tsx'), 'utf8');
        expect(authCtx).toContain('shouldHoldAuthGateUntilSessionProbe');
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/context/authProviderRuntime.ts'),
            'utf8',
        );
        expect(runtime).toContain('isCurrentBffAuthSyncGeneration');
        expect(runtime).toContain('nextBffAuthSyncGeneration');
        expect(runtime).toContain('stopBffSessionKeeper');
        expect(runtime).toContain('publishAuthLogout');
        expect(gate).toContain('setLaneReleased(false)');
        expect(gate).toContain('subscribeSameTabAuthLogout');
        expect(gate).toContain('forcedAuthLane');
        expect(gate).toContain('resolveLawyerBoardEnter');
        expect(gate).not.toContain('if (!authUser?.id) setLaneReleased(false)');
        expect(runtime).not.toContain("/api/security/csrf");
        expect(authCtx).not.toContain("throw new Error('bff_logout_failed')");
        expect(authCtx).toContain('خرجت من هذا الجهاز');
    });

    it('Inner ما زال يسحب FullBoot ساكناً بعد عبور الهوية', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
    });
});
