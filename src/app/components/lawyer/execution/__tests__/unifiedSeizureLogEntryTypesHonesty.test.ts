import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const EXECUTION = path.resolve(__dirname, '..');
const DASH_UTILS = path.resolve(__dirname, '../../ExecutionDashboard/utils');
const DASH_HOOKS = path.resolve(__dirname, '../../ExecutionDashboard/hooks');
const TYPES_FILE = path.join(EXECUTION, 'unifiedSeizureLogEntryTypes.ts');
const TAB_TYPES_FILE = path.join(EXECUTION, 'unifiedSeizureLogTabTypes.ts');
const MODAL_FILE = path.join(EXECUTION, 'UnifiedSeizureLogModal.tsx');
const UNIFIED_HOOK = path.join(DASH_HOOKS, 'useUnifiedSeizureLog.ts');
const ENTITY_HOOK = path.join(DASH_HOOKS, 'useSeizureLogEntityData.ts');

describe('unifiedSeizureLogEntryTypes — سجل الحجز مُزال', () => {
    it('لا يبقى مودال/أنواع/هوكس السجل في المسار الحي', () => {
        expect(fs.existsSync(TYPES_FILE)).toBe(false);
        expect(fs.existsSync(TAB_TYPES_FILE)).toBe(false);
        expect(fs.existsSync(MODAL_FILE)).toBe(false);
        expect(fs.existsSync(UNIFIED_HOOK)).toBe(false);
        expect(fs.existsSync(ENTITY_HOOK)).toBe(false);
        expect(fs.existsSync(path.join(DASH_UTILS, 'unifiedSeizureLogEntries.ts'))).toBe(false);
        expect(fs.existsSync(path.join(DASH_UTILS, 'buildUnifiedSeizureLogPropertyEntries.ts'))).toBe(
            false,
        );
        expect(
            fs.existsSync(
                path.join(
                    DASH_HOOKS,
                    'executionDashboardCore/ExecutionDashboardHandlerClusterSeizureLogAssetModalBridge.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    DASH_HOOKS,
                    'executionDashboardCore/ExecutionDashboardHandlerClusterSeizureLogResolutionBridge.tsx',
                ),
            ),
        ).toBe(false);
        const coreDir = path.join(DASH_HOOKS, 'executionDashboardCore');
        for (const file of [
            'useExecutionDashboardCoreHandlerClusterSeizureAssetModal.ts',
            'useExecutionDashboardSeizureAssetModalHandlers.ts',
            'useExecutionDashboardSeizureAssetModalHandlers.types.ts',
            'useExecutionDashboardSeizureAssetModalSaveHandlers.ts',
            'useExecutionDashboardCoreHandlerClusterSeizureFollowupRequests.ts',
            'useExecutionDashboardCoreHandlerClusterSeizureResolution.ts',
        ]) {
            expect(fs.existsSync(path.join(coreDir, file))).toBe(false);
        }
        const pickCore = fs.readFileSync(path.join(coreDir, 'pickCoreAssemblyHandlers.ts'), 'utf8');
        expect(pickCore).not.toContain('seizureAssetModalHandlers');
        const heavy = fs.readFileSync(
            path.join(coreDir, 'useExecutionDashboardCoreHandlerClusterSeizureHeavy.ts'),
            'utf8',
        );
        expect(heavy).toContain('focusSeizurePropertyInlineCompletion: noopFocus');
        expect(heavy).toContain('useExecutionDashboardCoreHandlerClusterSeizureFollowup');
    });

    it('لا يبقى onShowSeizureLog في المركز المالي', () => {
        const focRoot = path.resolve(__dirname, '../../FinancialOperationsCenter');
        const props = fs.readFileSync(path.join(focRoot, 'focProps.ts'), 'utf8');
        const header = fs.readFileSync(path.join(focRoot, 'components/FocFundsCardHeader.tsx'), 'utf8');
        expect(props).not.toContain('onShowSeizureLog');
        expect(header).not.toContain('onShowSeizureLog');
        expect(header).not.toContain('سجل الحجوزات');
    });
});
