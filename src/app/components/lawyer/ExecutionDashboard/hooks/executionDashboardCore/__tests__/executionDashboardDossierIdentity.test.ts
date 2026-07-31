import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import { resolveExecutionDossierIdentity } from '../executionDashboardDossierIdentity';

describe('resolveExecutionDossierIdentity', () => {
    it('prefers current execution schema over legacy compatibility fields', () => {
        const executionData = {
            id: 'exec-1',
            fileNumber: '42',
            creditors: [{ name: 'الدائن الحالي' }],
            caseNo: 'LEGACY-CASE',
            clientName: 'الاسم القديم',
        } as ExecutionFile & { caseNo?: string; clientName?: string };

        expect(resolveExecutionDossierIdentity(executionData, null)).toEqual({
            caseNo: '42',
            clientName: 'الدائن الحالي',
        });
    });

    it('falls back to legacy execution or file fields when modern fields are absent', () => {
        const file = {
            id: 'file-1',
            caseNo: 'LEGACY-99',
            clientName: 'الدائن الاحتياطي',
        } as ExecutionFile & { caseNo?: string; clientName?: string };

        expect(resolveExecutionDossierIdentity(null, file)).toEqual({
            caseNo: 'LEGACY-99',
            clientName: 'الدائن الاحتياطي',
        });
    });

    it('returns undefined values when no dossier identity can be resolved', () => {
        expect(resolveExecutionDossierIdentity(null, null)).toEqual({
            caseNo: undefined,
            clientName: undefined,
        });
    });
});
