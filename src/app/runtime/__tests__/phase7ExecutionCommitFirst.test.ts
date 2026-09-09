import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('phase-7 execution commit-first', () => {
    it('openExecutionDossierWithContract ينفّذ commit قبل أي await', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/runtime/executionOpenContract.ts'),
            'utf8',
        );
        expect(src).toContain('prepareExecutionDossierOpen(mode)');
        expect(src).toContain('commit()');
        expect(src).not.toMatch(/\.then\(commit\)/);
        expect(src).not.toContain('raceWithOpenBudget');
        expect(src).not.toContain('await warmExecutionDossierUntilReady');
    });

    it('إنشاء التنفيذ يفتح عبر openExecutionCreationWithContract', () => {
        const src = readFileSync(
            join(
                process.cwd(),
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('openExecutionCreationWithContract');
        expect(src).not.toMatch(/await\s+m\.prepareExecutionCreationOpen/);
    });

    it('العقود الثلاثة كلها commit-first في المسار المفتوح', () => {
        const runtime = join(process.cwd(), 'src/app/runtime');
        const execution = readFileSync(join(runtime, 'executionOpenContract.ts'), 'utf8');
        const lawsuit = readFileSync(join(runtime, 'lawsuitOpenContract.ts'), 'utf8');
        const criminal = readFileSync(join(runtime, 'criminalOpenContract.ts'), 'utf8');

        expect(execution).toMatch(/prepareExecutionDossierOpen\(mode\);\s*commit\(\)/);
        expect(criminal).toMatch(/commit\(trimmed\);\s*prepareCriminalDossierOpen\(trimmed\)/);
        /*
         * عقد الدعوى لا يُقاس بالتجاور بعد اليوم. كان الشرط `chrome();\s*commit()`
         * أي ألّا يفصل بينهما إلا فراغ، فأُقحم بينهما حارس جلسة واستيراد ديناميّ
         * **غير مُنتظَر** — فانكسر الشرط **والعقد سليم**: commit ما زال يقع قبل أيّ
         * await.
         *
         * ويقيسه الآن `lawsuitOpenContractBehavior.test.ts` سلوكاً: يُستدعى commit
         * ولمّا يهبط الاستيراد الديناميّ بعد. وذلك يبقى صحيحاً مهما أُعيد ترتيب
         * الأسطر، ويخفق فعلاً لو وُضع commit خلف انتظار.
         */
        expect(lawsuit).toContain('prepareLawsuitDossierChrome()');
    });
});
