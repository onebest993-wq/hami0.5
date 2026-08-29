import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('execution Phase 6 types debt honesty', () => {
    it('LightBridge بلا @ts-nocheck', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/ExecutionDashboardHandlerClusterLightBridge.tsx',
            ),
            'utf8',
        );
        expect(src).not.toMatch(/^\/\/ @ts-nocheck/m);
    });

    it('SalarySeizureLogDetailCard بلا @ts-nocheck', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard.tsx',
            ),
            'utf8',
        );
        expect(src).not.toMatch(/^\/\/ @ts-nocheck/m);
    });

    it('applyDossierSpecialFollowupOutcome يقلّل any ويستخدم helpers مُنَوَّعة', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/utils/applyDossierSpecialFollowupOutcome.ts',
            ),
            'utf8',
        );
        expect(src).toContain('asExecutionFiles');
        expect(src).toContain('parseDecisionPayload');
        expect(src).toContain('ExecutionFileLike');
        const anyCount = (src.match(/\bany\b/g) || []).length;
        expect(anyCount).toBe(0);
    });

    it('seizureRequestsTabHelpers hot paths بلا any', () => {
        const src = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/components/seizureRequestsTabHelpers.ts',
            ),
            'utf8',
        );
        expect(src).toContain('type SeizureDecisionRow');
        expect(src).toContain('resolveGoverningSalaryDecision');
        expect(src).toContain('isSeizureRequestFullyRegistered');
        expect(src).toContain('isSeizureRegistrationComplete');
        expect((src.match(/\bany\b/g) || []).length).toBe(0);
    });

    it('SeizureRequestsTabAssetBlocks / decisions / financial hub / PartiesSection بلا any', () => {
        const files = [
            'src/app/components/lawyer/ExecutionDashboard/components/SeizureThirdPartyRequestBlock.tsx',
            'src/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRequestsTabDecisions.ts',
            'src/app/components/lawyer/ExecutionDashboard/components/executionFinancialHub/ExecutionFinancialHubPortalDialog.tsx',
            'src/app/components/lawyer/ExecutionDashboard/components/PartiesSection.tsx',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect((src.match(/\bany\b/g) || []).length, rel).toBe(0);
        }
    });
});
