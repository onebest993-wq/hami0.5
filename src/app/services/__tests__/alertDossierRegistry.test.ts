import { describe, expect, it } from 'vitest';
import {
    buildDossierRegistry,
    isActiveExecutionFile,
    isActiveLawsuitFile,
} from '../alertDossierRegistry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('alertDossierRegistry', () => {
    it('يتجاهل الدعاوى المؤرشفة', () => {
        expect(
            isActiveLawsuitFile({
                id: 1,
                status: 'archived',
            } as FileData),
        ).toBe(false);
    });

    it('يتجاهل التنفيذ المنتهي', () => {
        expect(
            isActiveExecutionFile({
                id: 'ex-1',
                dossier_lifecycle_status: 'finished',
            }),
        ).toBe(false);
    });

    it('لا يحل سياق إضبارة مغلقة في السجل', () => {
        const registry = buildDossierRegistry({
            lawsuitFiles: [
                {
                    id: 9,
                    type: 'lawsuit',
                    status: 'archived',
                    caseNo: '2026/9',
                    court: 'كرخ',
                    parties: [{ id: 1, name: 'موكل', isClient: true, role: 'مدعي' }],
                } as FileData,
            ],
            executionFiles: [],
            urgentCases: [],
        });
        expect(registry.isActive('lawsuit', '9')).toBe(false);
        expect(registry.resolve('lawsuit', '9')).toBeNull();
    });

    it('يعدّ مواعيد Threading نشطة دون إدخالها في سجل الإضابير', () => {
        const registry = buildDossierRegistry({
            lawsuitFiles: [],
            executionFiles: [],
            urgentCases: [],
        });
        expect(registry.isActive('threading', 'tx-9')).toBe(true);
        expect(registry.isActive('task', 'ft-1')).toBe(true);
        expect(registry.isActive('lawsuit', 'missing')).toBe(false);
    });
});
