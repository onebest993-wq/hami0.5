import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave3 quantum stem cut', () => {
    it('QuantumTasksProvider لا يستدعي قراءة قرص متزامنة عند الإنشاء', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/context/QuantumTasksProvider.tsx'), 'utf8');
        expect(src).not.toContain('readQuantumTasksFromDiskSync');
        expect(src).toContain('storageHydrated');
        expect(src).toContain('ensurePersistedReady');
        expect(src).not.toMatch(/import SecureStoreService from/);
        expect(src).toContain("import('@/app/services/SecureStoreService')");
    });

    it('quantumTasksStorage بلا SecureStore sync على المسار المتزامن', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/utils/quantumTasksStorage.ts'), 'utf8');
        expect(src).not.toMatch(/import SecureStoreService from/);
        expect(src).not.toContain('getItemSync');
        expect(src).not.toContain('setItemSync');
        expect(src).toContain("import('@/app/services/SecureStoreService')");
    });

    it('FieldTasks overlay لا يستورد QuantumTasksProvider', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(src).not.toMatch(/<QuantumTasksProvider/);
    });

    it('QuantumTasksProvider خارج stem اللوحة — داخل InnerRuntime بعد mark', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardQuantumShell.tsx'),
            'utf8',
        );
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            'utf8',
        );
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(runtime).toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(runtime).toMatch(/<QuantumTasksProvider/);
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
