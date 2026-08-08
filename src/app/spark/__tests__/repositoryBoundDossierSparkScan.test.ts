import { describe, expect, it } from 'vitest';
import {
    findUnregisteredVaultDateHints,
    resolveBoundDossierRef,
    scanBoundVaultDocDateGap,
} from '@/app/spark/engine/repositoryBoundDossierSparkScan';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

const lawsuitFile = (overrides: Partial<FileData> = {}): FileData =>
    ({
        id: 42,
        caseNo: '100/2026',
        history: [{ id: 1, stage: 'جلسة', result: 'تأجيل', date: '2026-03-01' }],
        notes: [],
        date: '2026-01-01',
        ...overrides,
    }) as FileData;

const vaultDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc =>
    ({
        id: 'doc-bound',
        title: 'محضر',
        type: 'pdf',
        boundDossierId: '42',
        extractedText: 'محضر جلسة رسمية بتاريخ 2026-05-20 في المحكمة',
        ...overrides,
    }) as SmartVaultDoc;

describe('repositoryBoundDossierSparkScan', () => {
    it('يحلّ إضبارة دعوى من معرّف الربط', () => {
        const ref = resolveBoundDossierRef('42', [lawsuitFile()], []);
        expect(ref?.kind).toBe('lawsuit');
        expect(ref?.label).toBe('100/2026');
    });

    it('يكشف تواريخ المرفق غير المسجّلة في السجل', () => {
        const ref = resolveBoundDossierRef('42', [lawsuitFile()], []);
        expect(ref).not.toBeNull();
        const missing = findUnregisteredVaultDateHints(['2026-05-20', '2026-03-01'], ref!.registeredDates);
        expect(missing).toEqual(['2026-05-20']);
    });

    it('يُنتج تنبيهاً عند فجوة تواريخ مرفق مربوط', () => {
        const nudge = scanBoundVaultDocDateGap({
            doc: vaultDoc(),
            lawsuitFiles: [lawsuitFile()],
            executionFiles: [],
        });
        expect(nudge?.kind).toBe('repository.vault_bound_date_unregistered');
        expect(nudge?.targetFileId).toBe('doc-bound');
    });

    it('لا تنبيه عند تطابق التواريخ', () => {
        const nudge = scanBoundVaultDocDateGap({
            doc: vaultDoc({ extractedText: 'جلسة بتاريخ 2026-03-01' }),
            lawsuitFiles: [lawsuitFile()],
            executionFiles: [],
        });
        expect(nudge).toBeNull();
    });
});
