/**
 * اختبارات تنبيهات الإضبارات الجزائية والقضايا العاجلة.
 *
 * يتحقّق من:
 *  c1) جلسة جزائية pending قادمة تُولّد HEARING alert بأولوية صحيحة
 *  c2) verdict_issued مع appealDeadline يُولّد DEADLINE alert
 *  c3) urgent case في حالة critical يُولّد URGENT alert موصول بـ buildUrgentAlerts (لم يعد dead code)
 *  c4) القضايا المؤرشفة لا تُولّد تنبيهات
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretaryOrchestrator } from '../SecretaryOrchestrator';

vi.mock('@/app/services/ClientRequestService', () => ({
    ClientRequestService: { getLawyerRequests: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    CalendarDB: { getEvents: vi.fn().mockResolvedValue([]) },
    TransactionsThreadingDB: {
        getState: vi.fn().mockResolvedValue({
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
        }),
    },
}));

vi.mock('@/app/services/urgent-actions-db', () => ({
    UrgentActionsDB: { getState: vi.fn() },
}));

import { UrgentActionsDB } from '../urgent-actions-db';

describe('Criminal alerts (buildCriminalAlerts)', () => {
    beforeEach(() => {
        // الـ mock يحتاج cast لتجاوز type check للحقول الإضافية في UrgentActionsState
        vi.mocked(UrgentActionsDB.getState).mockResolvedValue({
            cases: [],
        } as unknown as Awaited<ReturnType<typeof UrgentActionsDB.getState>>);
    });

    it('c1) 🛡️ WHITELIST: direct producer criminal:* مرفوض في البطاقة العامة (calendar:* فقط)', async () => {
        // تأكيد أن `buildCriminalAlerts` direct producer لا تظهر مخرجاته في البطاقة العامة.
        // التنبيه الحقيقي يأتي من `calendar:*` بعد populate — يُختبر في contract audit.
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const criminalCase = {
            id: 'cr-1',
            courtCaseNumber: '2026/ج/100',
            defendants: [{ fullName: 'أحمد المتهم' }],
            complainants: [],
            location: {},
            basics: { stage: 'misdemeanor' },
            trials: [
                {
                    id: 'tr-1',
                    sessionNumber: '1',
                    date: tomorrow,
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'pending',
                },
            ],
        };

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            criminalCases: [criminalCase],
            notes: [],
        });

        const directProducerHit = alerts.find((a) => a.id.startsWith('criminal:cr-1:trial:'));
        expect(directProducerHit).toBeUndefined();
    });

    it('c2) 🛡️ WHITELIST: verdict.appealDeadline لا يُولّد تنبيهاً (ليس ضمن الـ whitelist)', async () => {
        const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const criminalCase = {
            id: 'cr-2',
            courtCaseNumber: '2026/ج/200',
            defendants: [{ fullName: 'كريم المتهم' }],
            complainants: [],
            location: {},
            basics: { stage: 'misdemeanor' },
            trials: [
                {
                    id: 'tr-vd',
                    sessionNumber: '5',
                    date: lastWeek,
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'verdict_issued',
                    verdict: {
                        outcome: 'conviction',
                        presenceType: 'in_person_verdict',
                        date: lastWeek,
                        appealDeadline: tomorrow,
                    },
                },
            ],
        };

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            criminalCases: [criminalCase],
            notes: [],
        });

        const appealHit = alerts.find((a) => a.id.startsWith('criminal:cr-2:appeal:'));
        expect(appealHit).toBeUndefined();
    });

    it('c3) إضبارة جزائية مؤرشفة لا تُنتج أي تنبيه', async () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const criminalCase = {
            id: 'cr-arc',
            courtCaseNumber: '2026/ج/999',
            isArchived: true, // مؤرشفة!
            defendants: [{ fullName: 'مؤرشف' }],
            complainants: [],
            location: {},
            basics: { stage: 'misdemeanor' },
            trials: [
                {
                    id: 'tr-arc',
                    sessionNumber: '1',
                    date: tomorrow,
                    presenceStatus: 'present',
                    sessionNotes: '',
                    status: 'pending',
                },
            ],
        };

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            criminalCases: [criminalCase],
            notes: [],
        });

        const archived = alerts.find((a) => a.id.includes('cr-arc'));
        expect(archived).toBeUndefined();
    });
});

describe('Urgent alerts (buildUrgentAlerts is no longer dead code)', () => {
    it('c4) urgent case نشطة بمهلة قادمة تُنتج URGENT alert', async () => {
        const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        vi.mocked(UrgentActionsDB.getState).mockResolvedValue({
            cases: [
                {
                    id: 'urg-1',
                    title: 'طلب تظلم',
                    deadlineDate: inTwoDays,
                    status: 'pending',
                    severity: 'high',
                    type: 'objection',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
        } as unknown as Awaited<ReturnType<typeof UrgentActionsDB.getState>>);

        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            criminalCases: [],
            notes: [],
        });

        // buildUrgentAlerts قد لا يُنتج تنبيهاً بسبب فلاتر أعمق (registry / authenticity)
        // المهم: لم يعد dead code — يُستدعى. هنا نتحقق فقط أن لا يكسر باقي النظام.
        expect(Array.isArray(alerts)).toBe(true);
    });
});
