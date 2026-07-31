import { describe, expect, it } from 'vitest';
import { mergeHeaderFields } from '@/app/components/lawyer/ExecutionDashboard/components/dashboardHeaderSectionHelpers';
import { resolveDossierHeaderFields } from '@/app/utils/executionDossierHeaderFields';

describe('DashboardHeader fileNumber safety', () => {
    it('resolveDossierHeaderFields لا يرمي عند file=null', () => {
        const fields = resolveDossierHeaderFields(null);
        expect(fields.fileNumber).toBe('');
        expect(fields.fileRefDisplay).toBe('—');
    });

    it('mergeHeaderFields يتحمل primary غير صالح', () => {
        const merged = mergeHeaderFields(undefined, resolveDossierHeaderFields(null));
        expect(merged.fileNumber).toBe('');
    });
});
