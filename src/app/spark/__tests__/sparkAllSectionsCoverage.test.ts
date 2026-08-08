import { describe, expect, it } from 'vitest';
import { pickActiveLawsuitSparkNudge } from '@/app/spark/engine/sparkHybridEngine';
import { pickActiveCriminalSparkNudge } from '@/app/spark/engine/sparkCriminalEngine';
import { pickActiveUrgentSparkNudge } from '@/app/spark/engine/sparkUrgentEngine';
import { buildLawsuitSparkContextFromArchiveFile } from '@/app/spark/context/lawsuitSparkContextFromFile';
import { buildCriminalSparkContextFromArchiveRecord } from '@/app/spark/context/criminalSparkContext';
import { buildUrgentSparkContextFromCaseRecord } from '@/app/spark/context/urgentSparkContext';
import { scanLawsuitArchiveForSpark } from '@/app/spark/engine/lawsuitArchiveSparkScan';
import { scanCriminalArchiveForSpark } from '@/app/spark/engine/criminalArchiveSparkScan';
import { scanUrgentCasesForSpark } from '@/app/spark/engine/urgentArchiveSparkScan';
import { pickActiveExecutionSparkNudge } from '@/app/spark/engine/sparkExecutionEngine';
import { buildExecutionSparkContextFromArchiveFile } from '@/app/spark/context/executionSparkContextFromFile';
import { scanExecutionArchiveForSpark } from '@/app/spark/engine/executionArchiveSparkScan';
import { resolveLawsuitSparkJurisdiction } from '@/app/spark/context/resolveLawsuitSparkJurisdiction';

describe('سبارك — تغطية أقسام الدعاوى', () => {
    it('مدني: إضبارة مفتوحة + أرشيف', () => {
        const file = {
            id: 'civil-1',
            status: 'نشطة',
            caseNo: '10/2026',
            lawsuitJurisdiction: 'civil',
            representedParty: 'المدعي',
            stages: [
                {
                    id: 's1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    awaitingAbsentJudgmentNotification: true,
                },
            ],
            activeStageIndex: 0,
        };

        const ctx = buildLawsuitSparkContextFromArchiveFile(file);
        expect(ctx?.jurisdiction).toBe('civil');
        expect(pickActiveLawsuitSparkNudge(ctx!)?.kind).toBe('lawsuit.absent_notification_missing');
        expect(scanLawsuitArchiveForSpark([file], { jurisdictionTab: 'civil' })).toHaveLength(1);
    });

    it('أحوال شخصية: يُمسح ضمن المدني/الكل', () => {
        const file = {
            id: 'ps-1',
            status: 'نشطة',
            caseNo: '20/2026',
            lawsuitJurisdiction: 'personal',
            representedParty: 'المدعي',
            stages: [
                {
                    id: 's1',
                    name: 'أحوال شخصية',
                    status: 'active',
                    stageName: 'أحوال شخصية',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    awaitingAbsentJudgmentNotification: true,
                },
            ],
            activeStageIndex: 0,
        };

        expect(resolveLawsuitSparkJurisdiction(file)).toBe('personal');
        const ctx = buildLawsuitSparkContextFromArchiveFile(file);
        expect(pickActiveLawsuitSparkNudge(ctx!)?.kind).toBe('lawsuit.absent_notification_missing');
        expect(scanLawsuitArchiveForSpark([file], { jurisdictionTab: 'personal' })).toHaveLength(1);
    });

    it('جزائي: إضبارة + أرشيف', () => {
        const record = {
            id: 'crim-1',
            verdictCards: [
                {
                    id: 'v1',
                    outcome: 'conviction',
                    issuedAt: '2026-01-01',
                    appealDeadline: '2026-02-01',
                    presenceType: 'غيابي',
                },
            ],
            basics: { caseNumber: 'CR-55/2026' },
        };

        const ctx = buildCriminalSparkContextFromArchiveRecord(record);
        expect(ctx?.jurisdiction).toBe('criminal');
        expect(pickActiveCriminalSparkNudge(ctx!)?.kind).toBe('criminal.absentia_publication_missing');
        expect(scanCriminalArchiveForSpark([record])).toHaveLength(1);
    });

    it('مستعجل: إضبارة + قائمة', () => {
        const urgentCase = {
            id: 'urg-1',
            requestNumber: 'U-100',
            fileStatus: 'grievance',
            activeLifecycleStep: 'grievance',
            judgeDecision: { decision: 'rejected', decisionDate: '2026-03-01', requiresGuarantee: false },
            grievanceDecisionNotificationConfirmed: false,
            grievanceData: { rejectionNotificationDate: '', outcome: 'filed', filingDate: '' },
            executionData: { executionDate: '', notificationDate: '', deadlineDays: 3, authority: '', notes: '' },
            cassationData: { filedBy: null, outcome: '', filingDate: '', fileNumber: '' },
        };

        const ctx = buildUrgentSparkContextFromCaseRecord(urgentCase);
        expect(pickActiveUrgentSparkNudge(ctx!)?.kind).toBe('urgent.grievance_notification_unconfirmed');
        expect(scanUrgentCasesForSpark([urgentCase])).toHaveLength(1);
    });

    it('تنفيذ: إضبارة + أرشيف', () => {
        const execFile = {
            id: 'exec-1',
            executionCaseNumber: 'EX-55/2026',
            dossier_lifecycle_status: 'active',
            debtors: [{ id: 'd1', name: 'مدين' }],
            execution_memo_anchor_date: '2020-01-01',
            notice_voluntary_period_end_declared: false,
        };

        const ctx = buildExecutionSparkContextFromArchiveFile(execFile);
        expect(ctx?.dossierKey).toBe('execution:EX-55/2026');
        expect(pickActiveExecutionSparkNudge(ctx!)?.kind).toBe('execution.voluntary_period_end');
        expect(scanExecutionArchiveForSpark([execFile])).toHaveLength(1);
    });
});
