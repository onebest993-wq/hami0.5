import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-13 TDZ eviction action ids cut', () => {
    it('executionEvictionActionIds بلا اعتماديات', () => {
        const src = readFileSync(join(root, 'src/app/utils/executionEvictionActionIds.ts'), 'utf8');
        expect(src).toContain('EVICTION_TIMELINE_ACTION_IDS');
        expect(src).not.toMatch(/^import /m);
    });

    it('executorApprovalWorkflow يستورد الثوابت الخفيفة وSecureStore ديناميكياً', () => {
        const src = readFileSync(join(root, 'src/app/utils/executorApprovalWorkflow.ts'), 'utf8');
        expect(src).toContain("from '@/app/utils/executionEvictionActionIds'");
        expect(src).toContain("from '@/app/utils/executionStorageKeysLite'");
        expect(src).toContain("import('@/app/services/SecureStoreService')");
        expect(src).not.toContain("from '@/app/services/SecureStoreService'");
        expect(src).not.toContain("from '@/app/utils/executionModuleStrategies'");
        expect(src).not.toContain("from '@/app/utils/executionStorageKeys'");
    });

    it('vite يعزل executionEvictionActionIds', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'app-execution-eviction-action-ids'");
    });
});
