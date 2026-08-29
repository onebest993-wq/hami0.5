import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('execution Phase 5 HandlerCluster hygiene honesty', () => {
    it('stubs تُوثّق عقد stub→real ولا تُحذف', () => {
        const stubs = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionHandlerClusterStubs.ts',
            ),
            'utf8',
        );
        expect(stubs).toContain('stub → real');
        expect(stubs).toContain('registerExecutionHandlerStubNotifier');
        expect(stubs).toContain('usePublishHandlerClusterWhenFingerprintChanges');
        expect(stubs).toContain('executionHandlerNotReadyFallback');
        expect(stubs).toContain("Symbol.for('hami.executionHandlerStub')");
    });

    it('vite يحتفظ بأسماء execution-handler-cluster-*', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        for (const name of [
            'execution-handler-cluster-shared',
            'execution-handler-cluster-coercive',
            'execution-handler-cluster-seizure',
            'execution-handler-cluster-seizure-inline',
            'execution-handler-cluster-followup',
            'execution-handler-cluster-light',
            'execution-handler-cluster-dossier',
            'execution-handler-cluster-party',
            'execution-handler-cluster-publication',
            'execution-handler-cluster-runtime',
            'execution-handler-cluster-foundation',
            'execution-handler-cluster-eviction',
            'execution-handler-cluster-handlers',
            'execution-handler-cluster-core',
        ]) {
            expect(vite).toContain(`return '${name}'`);
        }
    });

    it('vite يفصل أوراق دعم ED (pipelines + lazy-registry) بعد handler-cluster', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('function resolveExecutionDashboardSupportChunk');
        for (const name of [
            'execution-dashboard-pipelines',
            'execution-dashboard-boot-pipeline',
            'execution-dashboard-workspace-pipeline',
            'execution-dashboard-claim-pipeline',
            'execution-dashboard-persist-pipeline',
            'execution-dashboard-scope',
            'execution-lazy-registry',
        ]) {
            expect(vite).toContain(`return '${name}'`);
        }
        const handlerPos = vite.indexOf('resolveExecutionHandlerClusterChunk(id)');
        const supportPos = vite.indexOf('resolveExecutionDashboardSupportChunk(id)');
        expect(handlerPos).toBeGreaterThan(-1);
        expect(supportPos).toBeGreaterThan(handlerPos);
        const budget = JSON.parse(
            fs.readFileSync(path.join(root, 'scripts/perf-budget.json'), 'utf8'),
        ) as { namedChunkMaxRawKb: Record<string, number> };
        expect(budget.namedChunkMaxRawKb['execution-dashboard-pipelines']).toBe(200);
        expect(budget.namedChunkMaxRawKb['execution-dashboard-boot-pipeline']).toBe(200);
        expect(budget.namedChunkMaxRawKb['execution-dashboard-workspace-pipeline']).toBe(200);
        expect(budget.namedChunkMaxRawKb['execution-dashboard-claim-pipeline']).toBe(200);
        expect(budget.namedChunkMaxRawKb['execution-dashboard-persist-pipeline']).toBe(208);
        expect(budget.namedChunkMaxRawKb['execution-dashboard-scope']).toBe(120);
        expect(budget.namedChunkMaxRawKb['execution-lazy-registry']).toBe(80);
    });

    it('جسور Bridge تشارك handlerClusterPublishUtils', () => {
        const bridgeDir = path.join(
            root,
            'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
        );
        const bridges = fs
            .readdirSync(bridgeDir)
            .filter((f) => f.startsWith('ExecutionDashboardHandlerCluster') && f.endsWith('Bridge.tsx'));
        expect(bridges.length).toBeGreaterThan(10);
        const withPublish = bridges.filter((f) =>
            fs.readFileSync(path.join(bridgeDir, f), 'utf8').includes('handlerClusterPublishUtils'),
        );
        expect(withPublish.length).toBeGreaterThan(10);
    });
});
