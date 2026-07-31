import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walkTsFiles(dir: string, out: string[] = []): string[] {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkTsFiles(p, out);
        else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
    }
    return out;
}

describe('wave3 financial specialty + criminal surfaces', () => {
    it('ExecutionDashboard لا يستورد مسارات FinancialOperationsCenter المباشرة', () => {
        const ed = path.join(root, 'src/app/components/lawyer/ExecutionDashboard');
        const hits: string[] = [];
        for (const file of walkTsFiles(ed)) {
            const t = fs.readFileSync(file, 'utf8');
            if (t.includes('@/app/components/lawyer/FinancialOperationsCenter/')) {
                hits.push(path.relative(root, file));
            }
        }
        expect(hits).toEqual([]);
    });

    it('specialtyPublic و ledgerPublic و storePublic موجودة كعقود شريحة', () => {
        expect(fs.existsSync(path.join(root, 'src/app/slices/financial/specialtyPublic.ts'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'src/app/slices/financial/ledgerPublic.ts'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'src/app/slices/criminal/storePublic.ts'))).toBe(true);
    });

    it('criminal/public يصدّر CriminalCase من storePublic لا من criminalStore مباشرة', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/slices/criminal/public.ts'), 'utf8');
        expect(src).toContain("from '@/app/slices/criminal/storePublic'");
        expect(src).not.toContain("from '@/app/components/lawyer/criminal-system/criminalStore'");
    });

    it('FOC بالكامل لا يستورد مسارات ExecutionDashboard المباشرة', () => {
        const foc = path.join(root, 'src/app/components/lawyer/FinancialOperationsCenter');
        const hits: string[] = [];
        for (const file of walkTsFiles(foc)) {
            const t = fs.readFileSync(file, 'utf8');
            if (t.includes('@/app/components/lawyer/ExecutionDashboard/')) {
                hits.push(path.relative(root, file));
            }
        }
        expect(hits).toEqual([]);
    });

    it('FOC StandardFinancialLedger يستورد الأزرار من shared', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/FinancialOperationsCenter/components/StandardFinancialLedger.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('@/app/components/shared/ExecutionInlineExecutorDecisionActions');
    });

    it('FOC settlementSalaryExclusion لا يستورد ExecutionDashboard', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/FinancialOperationsCenter/settlementSalaryExclusion.ts',
            ),
            'utf8',
        );
        expect(src).not.toContain('ExecutionDashboard');
        expect(src).toContain('@/app/utils/execution/isSalarySeizureAsset');
    });
});
