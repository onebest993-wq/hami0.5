import { describe, expect, it } from 'vitest';
import { resolveDossierHeaderFields } from '@/app/utils/executionDossierHeaderFields';

describe('DashboardHeader fileNumber safety', () => {
    it('resolveDossierHeaderFields لا يرمي عند file=null', () => {
        const fields = resolveDossierHeaderFields(null);
        expect(fields.fileNumber).toBe('');
        expect(fields.fileRefDisplay).toBe('—');
    });
});
