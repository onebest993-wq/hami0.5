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
            const rel = path.relative(root, file).replace(/\\/g, '/');
            if (rel.endsWith('executionFinancialOperationsCenterLazy.tsx')) continue;
            const t = fs.readFileSync(file, 'utf8');
            if (t.includes('@/app/components/lawyer/FinancialOperationsCenter/')) {
                hits.push(rel);
            }
        }
        expect(hits).toEqual([]);
    });

    it('specialtyPublic و ledgerPublic موجودان كعقدَي شريحة موصولَين', () => {
        expect(fs.existsSync(path.join(root, 'src/app/slices/financial/specialtyPublic.ts'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'src/app/slices/financial/ledgerPublic.ts'))).toBe(true);
    });

    /*
     * حُذف حدّ الشريحة الجزائية بكامله — `criminal/public.ts` و`criminal/storePublic.ts`:
     * لم يستورد أحدٌ الأوّل، ولم يستورد الثاني إلا الأوّل. ومعهما ثمانية عقود
     * `public.ts` أخرى في `slices/` بلا مستورد واحد. الباقي هنا ما تعبره شيفرة
     * حقيقية، وهو المحروس أعلاه. حدٌّ لا يعبره أحد ليس حدّاً بل اسم ملفّ.
     *
     * الضمانة المقابلة الحيّة: لا شيء خارج `criminal-system` يستورد `criminalStore`
     * مباشرة — وهذا يُقاس على الشيفرة الحيّة لا على عقد مُعلَن.
     */
    it('لا مستورد لـcriminalStore من خارج criminal-system', () => {
        const outside: string[] = [];
        for (const dir of ['src/app/components/lawyer/ExecutionDashboard', 'src/app/hooks', 'src/app/runtime']) {
            const abs = path.join(root, dir);
            if (!fs.existsSync(abs)) continue;
            for (const file of walkTsFiles(abs)) {
                const t = fs.readFileSync(file, 'utf8');
                if (/from\s+'@\/app\/components\/lawyer\/criminal-system\/criminalStore'/.test(t)) {
                    outside.push(path.relative(root, file));
                }
            }
        }
        expect(outside).toEqual([]);
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
