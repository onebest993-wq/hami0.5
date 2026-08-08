import { describe, expect, it } from 'vitest';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import {
    countRepositoryAttentionFromHomeHits,
    countRepositoryAttentionSignals,
    countSecretaryAlertsByHubSection,
    mergeHubSectionAttentionCounts,
    mergeHubSectionAttentionDeduped,
    resolveHubTileAttentionCounts,
    resolveHubTileAttentionCountsFromHits,
    resolveSecretaryAlertHubSection,
} from '@/app/spark/engine/hubAttentionAggregate';
import type { HomeSparkHit } from '@/app/spark/engine/homeSparkAggregateScan';

const secretaryAlert = (overrides: Partial<SecretaryAlert> = {}): SecretaryAlert =>
    ({
        id: 'sec-1',
        type: 'DEADLINE',
        title: 'مهلة',
        summary: 'ملخص',
        aiDeepDive: 'تفاصيل',
        target: 'execution',
        priority: 3,
        ...overrides,
    }) as SecretaryAlert;

describe('hubAttentionAggregate', () => {
    it('يحلّ قسم Secretary للتنفيذ والدعوى', () => {
        expect(resolveSecretaryAlertHubSection(secretaryAlert({ target: 'lawsuit' }))).toBe('lawsuit');
        expect(
            resolveSecretaryAlertHubSection(
                secretaryAlert({
                    target: 'schedule',
                    calendarSource: { module: 'calendar', entityId: '1', dossierModule: 'execution' },
                }),
            ),
        ).toBe('execution');
    });

    it('يدمج المسح مع Secretary بأخذ الأعلى', () => {
        const merged = mergeHubSectionAttentionCounts(
            { lawsuit: 2, execution: 1 },
            { lawsuit: 1, execution: 4 },
        );
        expect(merged.lawsuit).toBe(2);
        expect(merged.execution).toBe(4);
    });

    it('resolveHubTileAttentionCounts يضمّ الجزائي للدعوى وthreading للمعاملات', () => {
        const tiles = resolveHubTileAttentionCounts(
            { lawsuit: 1, criminal: 2, threading: 3, execution: 0 },
            { lawsuit: 4, execution: 1 },
        );
        expect(tiles.lawsuit).toBe(6);
        expect(tiles.execution).toBe(1);
        expect(tiles.transaction).toBe(3);
    });

    it('mergeHubSectionAttentionDeduped يتحاد على إضبارة واحدة', () => {
        const hits: HomeSparkHit[] = [
            {
                section: 'execution',
                targetFileId: 'exec-1',
                dossierKey: 'execution:exec-1',
                caseLabel: 'تنفيذ 1',
                kind: 'execution.secretary_deadline',
                kindLabel: 'مهلة',
                routePath: 'workspace:execution:exec-1',
            },
        ];
        const counts = mergeHubSectionAttentionDeduped(hits, [
            secretaryAlert({ target: 'execution', entityId: 'exec-1' }),
        ]);
        expect(counts.execution).toBe(1);
    });

    it('resolveHubTileAttentionCountsFromHits يستخدم dedupe وthreading', () => {
        const hits: HomeSparkHit[] = [
            {
                section: 'lawsuit',
                targetFileId: 'law-1',
                dossierKey: 'lawsuit:law-1',
                caseLabel: 'دعوى',
                kind: 'lawsuit.hearing_document_gap',
                kindLabel: 'جلسة',
                routePath: 'workspace:lawsuit:law-1',
            },
            {
                section: 'threading',
                targetFileId: 'tx-1',
                dossierKey: 'threading:tx-1',
                caseLabel: 'معاملة',
                kind: 'threading.task_deadline_near',
                kindLabel: 'مهلة',
                routePath: 'workspace:threading:tx-1',
            },
            {
                section: 'repository',
                targetFileId: 'note-1',
                dossierKey: 'repository:session',
                caseLabel: 'ملاحظة',
                kind: 'repository.note_reminder_near',
                kindLabel: 'تذكير',
                routePath: 'repository:session',
            },
        ];
        const tiles = resolveHubTileAttentionCountsFromHits(hits, []);
        expect(tiles.lawsuit).toBe(1);
        expect(tiles.transaction).toBe(1);
        expect(countRepositoryAttentionFromHomeHits(hits)).toBe(1);
    });

    it('يعدّ تنبيهات Secretary حسب القسم', () => {
        const counts = countSecretaryAlertsByHubSection([
            secretaryAlert({ target: 'execution' }),
            secretaryAlert({ id: 'sec-2', target: 'lawsuit' }),
        ]);
        expect(counts.execution).toBe(1);
        expect(counts.lawsuit).toBe(1);
    });

    it('يحسب إشارات المستودع من الملاحظات والخزنة', () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const signals = countRepositoryAttentionSignals({
            vaultDocs: [
                {
                    id: 'v1',
                    boundDossierId: null,
                    type: 'pdf',
                    extractedText: 'محضر بتاريخ 2099-01-01',
                } as import('@/app/services/vault/vaultTypes').SmartVaultDoc,
            ],
            notes: [
                {
                    id: 'n1',
                    title: 'تذكير',
                    reminder_at: tomorrow,
                } as import('@/app/components/lawyer/LawyerDashboardParts/types').GlobalNote,
            ],
            lawsuitFiles: [],
            executionFiles: [],
        });
        expect(signals).toBeGreaterThanOrEqual(1);
    });
});
