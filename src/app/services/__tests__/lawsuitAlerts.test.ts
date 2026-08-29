/**
 * اختبارات buildLawsuitAlerts.
 *
 * يتحقّق من:
 *  l1) status === 'paused' + stayReviewDate قريب → URGENT
 *  l2) nextDate خلال أسبوع → HEARING
 *  l3) CaseStage.legalTimers.appealDeadline → DEADLINE
 *  l4) tasks[] بـ dueDate
 *  l5) ركود > 90 يوم → TASK
 *  l6) ملف من النوع 'execution' أو 'transaction' لا يُنتج تنبيه (buildExecutionAlerts/Threading يتولّى)
 */
import { describe, expect, it, vi } from 'vitest';
import { buildLawsuitAlerts } from '../lawsuitAlerts';
import type { DossierRegistry } from '../alertDossierRegistry';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';

function fakeRegistry(): DossierRegistry {
    return {
        resolve: vi.fn((module: string, id: string) => ({
            module,
            entityId: id,
            caseNumber: `LAW-${id}`,
            clientName: 'موكل',
            courtName: 'بداءة بغداد',
            actionType: 'دعوى مدنية',
            clientPhone: '',
        })),
    } as unknown as DossierRegistry;
}

function ymdInDays(daysFromNow: number): string {
    const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function baseFile(overrides: Partial<FileData> & Record<string, unknown> = {}): FileData {
    return {
        id: 1,
        type: 'lawsuit',
        status: 'active',
        caseNo: '50/ب/2026',
        court: 'بداءة',
        parties: [{ id: 1, name: 'المدعي', role: 'مدعي', isClient: true }],
        history: [],
        notes: [],
        images: [],
        date: ymdInDays(-30),
        tasks: [],
        ...overrides,
    } as FileData;
}

describe('buildLawsuitAlerts', () => {
    it("l1) paused + stayReviewDate قريب → URGENT", () => {
        const file = baseFile({
            id: 11,
            status: 'paused',
            stayReason: 'وقف الاستئنافي',
            stayReviewDate: ymdInDays(5),
        });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        const hit = alerts.find((a) => a.id === 'lawsuit:11:stay-review');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('URGENT');
    });

    it('l2) nextDate خلال أسبوع → HEARING', () => {
        const file = baseFile({ id: 12, nextDate: ymdInDays(5) });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        const hit = alerts.find((a) => a.id === 'lawsuit:12:next-date');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('HEARING');
    });

    it('l3) CaseStage.legalTimers.appealDeadline → DEADLINE', () => {
        const file = baseFile({
            id: 13,
            stages: [
                {
                    id: 'st-1',
                    stageName: 'البداءة',
                    status: 'completed',
                    // مرحلة منتهية → تُتجاهَل
                },
                {
                    id: 'st-2',
                    stageName: 'الاستئناف',
                    status: 'active',
                    legalTimers: {
                        appealDeadline: ymdInDays(10),
                        cassationDeadline: ymdInDays(20),
                    },
                },
            ],
        });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        const appeal = alerts.find((a) => a.id === 'lawsuit:13:stage-1:appeal');
        const cassation = alerts.find((a) => a.id === 'lawsuit:13:stage-1:cassation');
        expect(appeal).toBeDefined();
        expect(cassation).toBeDefined();
        // المرحلة المكتملة (stage-0) لا تُنتج
        expect(alerts.find((a) => a.id.startsWith('lawsuit:13:stage-0:'))).toBeUndefined();
    });

    it('l4) tasks[] بـ dueDate قريب → TASK', () => {
        const file = baseFile({
            id: 14,
            tasks: [
                {
                    id: 'tk-1',
                    title: 'تحضير مذكرة',
                    description: 'مذكرة استئناف',
                    dueDate: ymdInDays(2),
                    completed: false,
                } as unknown as FileData['tasks'][number],
            ],
        });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        const hit = alerts.find((a) => a.id === 'lawsuit:14:task:tk-1');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('TASK');
    });

    it('l5) ركود > 90 يوم → TASK', () => {
        const file = baseFile({
            id: 15,
            date: ymdInDays(-120),
            history: [{ id: 1, stage: 'البداءة', result: '', date: ymdInDays(-100) }],
            notes: [],
        });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        const hit = alerts.find((a) => a.id === 'lawsuit:15:dormancy');
        expect(hit).toBeDefined();
        expect(hit?.priority).toBe(4);
    });

    it("l6) type='execution' لا يُنتج (buildExecutionAlerts يتولّى)", () => {
        const file = baseFile({ id: 16, type: 'execution', nextDate: ymdInDays(2) });
        const alerts = buildLawsuitAlerts([file], new Date(), fakeRegistry());
        expect(alerts.length).toBe(0);
    });
});
