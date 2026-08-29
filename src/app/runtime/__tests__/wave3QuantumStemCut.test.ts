import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave3 quantum stem cut', () => {
    it('QuantumTasksProvider يقرأ localStorage sync للستارة ثم يُكمِل SecureStore بعد content-ready', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/context/QuantumTasksProvider.tsx'), 'utf8');
        expect(src).toContain('readQuantumTasksFromDiskSync');
        expect(src).toContain('storageHydrated');
        expect(src).toContain('ensurePersistedReady');
        expect(src).toContain('onBootContentReady');
        expect(src).not.toMatch(/import SecureStoreService from/);
        expect(src).toContain("import('@/app/services/SecureStoreService')");
    });

    it('quantumTasksStorage: قراءة الستارة بلا getItemSync؛ الحفظ المتزامن عبر SecureStore', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/utils/quantumTasksStorage.ts'), 'utf8');
        expect(src).not.toMatch(/import SecureStoreService from/);
        expect(src).not.toMatch(/\bgetItemSync\b/);
        expect(src).not.toMatch(/\bsetItemSync\b/);
        expect(src).toContain('writeSecureAndClearLegacySync');
        expect(src).not.toMatch(/localStorage\.setItem\(QUANTUM_TASKS_STORAGE_KEY/);
        expect(src).toContain("import('@/app/services/SecureStoreService')");
        const lite = fs.readFileSync(
            path.join(root, 'src/app/utils/quantumTasksStorageDeserialize.ts'),
            'utf8',
        );
        expect(lite).toContain('deserializeQuantumTasks');
        expect(lite).not.toMatch(/from ['"][^'"]*nlpParser['"]/);
        expect(lite).not.toMatch(/from ['"][^'"]*tasksManager\/utils['"]/);
        expect(lite).not.toContain('SecureStore');
    });

    it('FieldTasks overlay يركّب EnsureQuantumTasksProvider لا Provider ساكن على FullBoot', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('EnsureQuantumTasksProvider');
        expect(src).not.toMatch(/<QuantumTasksProvider>/);
        expect(src).not.toMatch(/import\s*\{\s*QuantumTasksProvider\s*\}/);
    });

    it('QuantumTasksProvider خارج stem واللوحة FullBoot — شارة الدوك عبر prime metrics', () => {
        const stem = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx'),
            'utf8',
        );
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(stem).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(fullBoot).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(fullBoot).not.toMatch(/<QuantumTasksProvider/);
        expect(fullBoot).toContain('primeQuantumTasksBootMetrics');
        expect(fullBoot).toContain("from '@/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration'");
        expect(fullBoot).not.toContain("from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration'");
        expect(fullBoot).toContain('CriminalDashboardBridgeLazyProvider');
        expect(fullBoot).not.toContain('CriminalDashboardBridgeProvider');
        const prime = fs.readFileSync(
            path.join(root, 'src/app/utils/primeQuantumTasksBootMetrics.ts'),
            'utf8',
        );
        expect(prime).toContain('quantumTasksStorageDeserialize');
        expect(prime).not.toMatch(/from ['"][^'"]*nlpParser['"]/);
        expect(prime).not.toMatch(/from ['"][^'"]*useQuantumTasks['"]/);
        expect(prime).not.toMatch(/from ['"][^'"]*quantumTasksStorage['"]/);
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('quantumTasksStorageDeserialize');
        expect(vite).toContain('primeQuantumTasksBootMetrics');
        const qLite = vite.slice(
            vite.indexOf('const quantumLite'),
            vite.indexOf("return 'lawyer-quantum-lite'"),
        );
        expect(qLite).toContain('quantumTasksStorage\\.(ts|tsx|js)');
        expect(qLite).not.toContain('quantumTasksContext');
        expect(qLite).not.toContain('quantumTasksStorageDeserialize');
        expect(qLite).not.toContain('quantumTasksEvents');
        expect(qLite).not.toContain('voiceNoteCodec');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            ),
        ).toBe(false);
    });

    it('execution settlement ledger يستورد من ledgerPublic لا utils FOC', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSettlementLedger.ts',
            ),
            'utf8',
        );
        expect(src).toContain("from '@/app/slices/financial/ledgerPublic'");
        expect(src).not.toContain('FinancialOperationsCenter/utils');
    });

    it('لا يبقى deep-import Execution→FinancialOperationsCenter/utils', () => {
        const ed = path.join(root, 'src/app/components/lawyer/ExecutionDashboard');
        const hit: string[] = [];
        const walk = (dir: string) => {
            for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, ent.name);
                if (ent.isDirectory()) walk(p);
                else if (/\.(ts|tsx)$/.test(ent.name)) {
                    const t = fs.readFileSync(p, 'utf8');
                    if (t.includes("FinancialOperationsCenter/utils")) hit.push(path.relative(root, p));
                }
            }
        };
        walk(ed);
        expect(hit).toEqual([]);
    });
});
