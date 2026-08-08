import { describe, expect, it } from 'vitest';
import {
    clearSparkAuditNudges,
    setSparkAuditNudge,
    toDocumentCompletenessNudge,
    readSparkAuditNudge,
} from '@/app/spark/audit/sparkAuditNudgeStore';
import { pickActiveLawsuitSparkNudge } from '@/app/spark/engine/sparkHybridEngine';
import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

describe('spark audit nudge store', () => {
    it('يحوّل نتيجة التدقيق إلى تنبيه document_completeness', () => {
        const nudge = toDocumentCompletenessNudge('lawsuit:9/2026', {
            present: ['نص الطلب'],
            missing: ['تاريخ محدد'],
            summary: 'لم أجد تاريخاً واضحاً في النص.',
        });
        expect(nudge?.kind).toBe('lawsuit.document_completeness');
        expect(nudge?.presence?.missing).toContain('تاريخ محدد');
    });

    it('يُظهر تنبيه التدقيق عند غياب قواعد أعلى أولوية', () => {
        clearSparkAuditNudges();
        const stage: CaseStage = {
            id: 's1',
            name: 'البداءة',
            status: 'active',
            stageName: 'مرحلة البداءة',
        };
        const lawsuitCtx: LawsuitSparkContext = {
            dossierKey: 'lawsuit:9/2026',
            fileId: 'f9',
            jurisdiction: 'civil',
            representedParty: 'المدعي',
            status: 'نشطة',
            isPaused: false,
            pauseReason: '',
            displayStage: stage,
            stages: [stage],
            timeline: [],
        };

        const auditNudge = toDocumentCompletenessNudge('lawsuit:9/2026', {
            present: ['نص'],
            missing: ['رقم القضية'],
            summary: 'رقم القضية غير مذكور.',
        });
        setSparkAuditNudge('lawsuit:9/2026', auditNudge);

        expect(readSparkAuditNudge('lawsuit:9/2026')?.kind).toBe('lawsuit.document_completeness');
        expect(pickActiveLawsuitSparkNudge(lawsuitCtx)?.kind).toBe('lawsuit.document_completeness');
    });
});
