import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN = path.resolve(__dirname, '../../ExecutionCreationView.tsx');
const BUILDERS = path.resolve(
    __dirname,
    '../hooks/executionCreationSubmitBuilders.ts',
);

describe('ExecutionCreationView intake legal snapshot honesty', () => {
    it('يربط تحذيرات التقادم/القانون بلقطة الحفظ دون عرض بصري', () => {
        const main = fs.readFileSync(MAIN, 'utf8');
        expect(main).toContain('intakeLegalSnapshot:');
        expect(main).toContain('useLegalWarnings');
        expect(main).toContain('useStatuteCalculations');
        expect(main).not.toMatch(/currentLegalInfo:\s*_/);
        expect(main).not.toContain('useImprisonmentEligibility');
    });

    it('applyClosingFinancialAndMetaFields يكتب intake_legal_snapshot', () => {
        const builders = fs.readFileSync(BUILDERS, 'utf8');
        expect(builders).toContain('intake_legal_snapshot');
        expect(builders).toContain('intakeLegalSnapshot');
    });
});
