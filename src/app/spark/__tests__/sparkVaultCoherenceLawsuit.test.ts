import { describe, expect, it } from 'vitest';
import { buildLawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import { runSparkCoherenceForLawsuit } from '@/app/spark/coherence/runSparkCoherenceForLawsuit';
import { resolveVaultDocsBoundToLawsuit } from '@/app/spark/vault/resolveVaultDocsBoundToLawsuit';
import {
    applyVaultDocsToCoherenceBundle,
    runVaultCoherenceFindings,
} from '@/app/spark/coherence/vault/vaultCoherenceBridge';
import { normalizeCoherenceFromLawsuit } from '@/app/spark/coherence/normalize/fromLawsuit';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

function baseStage(): CaseStage {
    return {
        id: 's1',
        stageName: 'ابتدائية',
        caseNo: '120/2026',
        courtName: 'محكمة الكرخ',
    } as CaseStage;
}

function baseFile() {
    return {
        id: 'law-vault-1',
        caseNo: '120/2026',
        type: 'مدني',
    };
}

function vaultDoc(overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc {
    return {
        id: 'vault-law-1',
        title: 'صحيفة دعوى',
        type: 'pdf',
        tags: [],
        authorId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        fileSize: 1000,
        fileName: 'lawsuit.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:vault:u1:vault-law-1',
        boundDossierId: 'law-vault-1',
        extractedText:
            'صحيفة دعوى مرفوعة بتاريخ 2026-09-20 وتتضمن جلسة مرافعة أولى بتاريخ 2026-10-05',
        ...overrides,
    } as SmartVaultDoc;
}

describe('OCR → تماسك (دعوى مفتوحة)', () => {
    it('يربط المرفقات بمعرّف إضبارة الدعوى', () => {
        const file = baseFile();
        const bound = resolveVaultDocsBoundToLawsuit(
            [vaultDoc(), vaultDoc({ id: 'other', boundDossierId: 'x' })],
            file,
        );
        expect(bound).toHaveLength(1);
        expect(bound[0]?.id).toBe('vault-law-1');
    });

    it('يربط المرفقات برقم القضية', () => {
        const file = baseFile();
        const bound = resolveVaultDocsBoundToLawsuit(
            [vaultDoc({ boundDossierId: 'lawsuit:120/2026' })],
            file,
        );
        expect(bound).toHaveLength(1);
    });

    it('يكتشف تاريخاً في نص OCR غير مسجّل في الإضبارة', () => {
        const ctx = buildLawsuitSparkContext({
            file: baseFile(),
            parentData: { id: 'law-vault-1', caseNo: '120/2026' },
            displayStage: baseStage(),
            stages: [baseStage()],
            displayTimeline: [],
            status: 'جارية',
            boundVaultDocs: [vaultDoc()],
        });
        const report = runSparkCoherenceForLawsuit(ctx);
        expect(report.findings.some((f) => f.id.startsWith('vault:unregistered-dates'))).toBe(
            true,
        );
    });

    it('يستخدم تسمية إضبارة الدعوى في رسالة التماسك', () => {
        const bundle = normalizeCoherenceFromLawsuit(
            buildLawsuitSparkContext({
                file: baseFile(),
                parentData: { id: 'law-vault-1' },
                displayStage: baseStage(),
                stages: [baseStage()],
                displayTimeline: [],
                status: 'جارية',
            }),
        );
        const findings = runVaultCoherenceFindings([vaultDoc()], bundle, {
            dossierLabel: 'إضبارة الدعوى',
        });
        expect(findings.some((f) => f.observation.includes('إضبارة الدعوى'))).toBe(true);
    });

    it('يدمج نص المرفق في حزمة التماسك', () => {
        const bundle = normalizeCoherenceFromLawsuit(
            buildLawsuitSparkContext({
                file: baseFile(),
                parentData: { id: 'law-vault-1' },
                displayStage: baseStage(),
                stages: [baseStage()],
                displayTimeline: [],
                status: 'جارية',
            }),
        );
        const merged = applyVaultDocsToCoherenceBundle(bundle, [vaultDoc()]);
        expect(merged.texts.some((t) => t.source === 'vault_extract')).toBe(true);
    });
});
