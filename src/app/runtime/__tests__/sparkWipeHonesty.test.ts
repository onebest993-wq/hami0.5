import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('spark wipe honesty', () => {
    it('مجلد spark والجسور محذوفة', () => {
        expect(existsSync(join(root, 'src/app/spark'))).toBe(false);
        expect(existsSync(join(root, 'src/app/services/alerts/homeHubSparkInsightGate.ts'))).toBe(
            false,
        );
        expect(existsSync(join(root, 'src/app/services/alerts/sparkRuntimeBridge.ts'))).toBe(false);
        expect(existsSync(join(root, 'src/app/services/alerts/homeHubSparkInsightBridge.ts'))).toBe(
            false,
        );
        expect(
            existsSync(join(root, 'src/app/hooks/lawyerDashboard/useHomeTabSparkAttention.ts')),
        ).toBe(false);
        expect(existsSync(join(root, 'src/app/services/alerts/homeTabSparkAttention.types.ts'))).toBe(
            false,
        );
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardSparkNudgeBridge.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/dashboard/commandHub/HubSparkAttentionBadge.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationSparkFocus.ts',
                ),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubSecretaryPanel.tsx',
                ),
            ),
        ).toBe(false);
    });

    it('vite واللوحة والهاب بلا Spark أو تبويب سكرتير', () => {
        const vite = src('vite.config.mts');
        expect(vite).not.toContain('lawyer-spark-runtime');
        expect(vite).not.toContain('sparkRuntimeBridge');
        expect(vite).not.toContain('resolveLawyerSparkRuntimeChunk');
        expect(vite).not.toContain('homeHubSparkInsightGate');
        expect(vite).not.toContain('/src/app/spark/');

        const main = src('src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx');
        expect(main).not.toContain('SparkShell');
        expect(main).not.toContain('@/app/spark');

        const model = src('src/app/components/lawyer/dashboard/useHomeTabContentModel.ts');
        expect(model).not.toContain('useHomeTabSparkAttention');
        expect(model).not.toContain('@/app/spark');

        const tabs = src('src/app/components/lawyer/LawyerHomeHubCard/components/HubPanelTabs.tsx');
        expect(tabs).toContain("aria-label=\"التنبيهات والتثبيت\"");
        expect(tabs).not.toContain('السكرتير');
        expect(tabs).not.toContain("'secretary'");

        const nav = src('src/app/hooks/useLawyerDashboardNavigation.ts');
        expect(nav).not.toContain('@/app/spark');
        expect(nav).not.toContain('SPARK_');

        const repo = src(
            'src/app/components/lawyer/SmartRepository/SmartRepositoryUnifiedFeed.tsx',
        );
        expect(repo).not.toContain('@/app/spark');
        expect(repo).not.toContain('SparkRepositoryInsight');
    });
});
