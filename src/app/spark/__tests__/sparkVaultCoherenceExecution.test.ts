import { describe, expect, it } from 'vitest';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { runSparkCoherenceForExecutionOpen } from '@/app/spark/coherence/runSparkCoherenceForExecutionOpen';
import { resolveVaultDocsBoundToExecution } from '@/app/spark/vault/resolveVaultDocsBoundToExecution';
import {
    applyVaultDocsToCoherenceBundle,
    runVaultCoherenceFindings,
} from '@/app/spark/coherence/vault/vaultCoherenceBridge';
import { normalizeCoherenceFromExecutionOpen } from '@/app/spark/coherence/normalize/fromExecutionOpen';
import type { ExecutionFile } from '@/app/types/execution';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

function baseFile(): ExecutionFile {
    return {
        id: 'exec-vault-1',
        directorate: 'بغداد',
        fileNumber: '400/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2025-12-01',
        creditors: [{ name: 'موكل', isClient: true }],
        debtors: [{ id: 'd1', name: 'مدين' }],
        debtAmount: 1_000_000,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        status: 'UNNOTIFIED',
        isPaused: false,
        timelineEvents: [],
        dossier_lifecycle_status: 'active',
    } as ExecutionFile;
}

function vaultDoc(overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc {
    return {
        id: 'vault-1',
        title: 'محضر تبليغ',
        type: 'pdf',
        tags: [],
        authorId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        fileSize: 1000,
        fileName: 'notice.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:vault:u1:vault-1',
        boundDossierId: 'exec-vault-1',
        extractedText:
            'محضر تبليغ رسمي بتاريخ 2026-09-15 يتضمن مهلة للمدين خلال أسبوع من تاريخ التبليغ',
        ...overrides,
    } as SmartVaultDoc;
}

describe('OCR → تماسك (تنفيذ مفتوح — تجريبي)', () => {
    it('يربط المرفقات بمعرّف الإضبارة', () => {
        const file = baseFile();
        const bound = resolveVaultDocsBoundToExecution(
            [vaultDoc(), vaultDoc({ id: 'other', boundDossierId: 'x' })],
            file,
        );
        expect(bound).toHaveLength(1);
        expect(bound[0]?.id).toBe('vault-1');
    });

    it('يكتشف تاريخاً في نص OCR غير مسجّل في الإضبارة', () => {
        const file = baseFile();
        const ctx = buildExecutionSparkContext({
            executionData: file,
            boundVaultDocs: [vaultDoc()],
        });
        const report = runSparkCoherenceForExecutionOpen(ctx);
        expect(report.findings.some((f) => f.id.startsWith('vault:unregistered-dates'))).toBe(
            true,
        );
    });

    it('ينبّه عند غياب نص مستخرج', () => {
        const bundle = normalizeCoherenceFromExecutionOpen(
            buildExecutionSparkContext({ executionData: baseFile() }),
        );
        const findings = runVaultCoherenceFindings(
            [vaultDoc({ extractedText: '', aiSummary: '' })],
            bundle,
        );
        expect(findings.some((f) => f.id === 'vault:pending-extraction')).toBe(true);
    });

    it('يدمج نص المرفق في حزمة التماسك', () => {
        const bundle = normalizeCoherenceFromExecutionOpen(
            buildExecutionSparkContext({ executionData: baseFile() }),
        );
        const merged = applyVaultDocsToCoherenceBundle(bundle, [vaultDoc()]);
        expect(merged.texts.some((t) => t.source === 'vault_extract')).toBe(true);
    });
});
