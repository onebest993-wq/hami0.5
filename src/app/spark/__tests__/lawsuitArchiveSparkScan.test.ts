import { beforeEach, describe, expect, it } from 'vitest';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import { buildLawsuitSparkContextFromArchiveFile } from '@/app/spark/context/lawsuitSparkContextFromFile';
import { resolveLawsuitSparkJurisdiction } from '@/app/spark/context/resolveLawsuitSparkJurisdiction';
import {
    buildArchiveAttentionNudge,
    scanLawsuitArchiveForSpark,
} from '@/app/spark/engine/lawsuitArchiveSparkScan';
import { resetSparkPreferences } from '@/app/spark/memory/sparkPreferenceStore';

function archiveFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const displayStage: CaseStage = {
        id: 'stage-1',
        name: 'البداءة',
        status: 'active',
        stageName: 'مرحلة البداءة',
        isPleadingsClosed: true,
        judgmentForm: 'غيابي',
        lastJudgmentType: 'غيابي',
        finalDecision: 'إجابة الدعوى',
        awaitingAbsentJudgmentNotification: true,
    };

    return {
        id: 'file-42',
        status: 'نشطة',
        caseNo: '42/2026',
        representedParty: 'المدعي',
        lawsuitJurisdiction: 'civil',
        stages: [displayStage],
        activeStageIndex: 0,
        ...overrides,
    };
}

describe('resolveLawsuitSparkJurisdiction', () => {
    it('يميّز الأحوال الشخصية عن المدني', () => {
        expect(resolveLawsuitSparkJurisdiction({ lawsuitJurisdiction: 'personal' })).toBe('personal');
        expect(resolveLawsuitSparkJurisdiction({ lawsuitJurisdiction: 'civil' })).toBe('civil');
    });
});

describe('lawsuitSparkContextFromFile', () => {
    it('يبني سياقاً من ملف أرشيف نشط', () => {
        const ctx = buildLawsuitSparkContextFromArchiveFile(archiveFile());
        expect(ctx?.dossierKey).toBe('lawsuit:42/2026');
        expect(ctx?.jurisdiction).toBe('civil');
        expect(ctx?.representedParty).toBe('المدعي');
    });

    it('يتجاهل الإضابير الجزائية في المسح', () => {
        expect(
            buildLawsuitSparkContextFromArchiveFile(
                archiveFile({ lawsuitJurisdiction: 'criminal', stages: [{ id: 's', name: 'x', status: 'active' }] }),
            ),
        ).toBeNull();
    });
});

describe('lawsuitArchiveSparkScan', () => {
    beforeEach(() => {
        resetSparkPreferences();
    });

    it('يجد إضبارة واحدة تحتاج تبليغ غيابي', () => {
        const hits = scanLawsuitArchiveForSpark([archiveFile()], { jurisdictionTab: 'civil' });
        expect(hits).toHaveLength(1);
        expect(hits[0]?.nudge.kind).toBe('lawsuit.absent_notification_missing');
    });

    it('يبني ملخصاً للأرشيف عند تعدد الإضابير', () => {
        const hits = scanLawsuitArchiveForSpark(
            [archiveFile({ id: '1', caseNo: '1/2026' }), archiveFile({ id: '2', caseNo: '2/2026' })],
            { jurisdictionTab: 'all' },
        );
        const summary = buildArchiveAttentionNudge(hits);
        expect(summary?.kind).toBe('lawsuit.archive_attention_summary');
        expect(summary?.hitCount).toBe(2);
        expect(summary?.message).toContain('2 إضابير');
    });
});
