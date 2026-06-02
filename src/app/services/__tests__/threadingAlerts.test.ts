import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretaryOrchestrator } from '../SecretaryOrchestrator';
import { TransactionsThreadingDB } from '../lawyer-cloud';

vi.mock('@/app/services/ClientRequestService', () => ({
    ClientRequestService: { getLawyerRequests: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/services/lawyer-cloud', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lawyer-cloud')>();
    return {
        ...actual,
        getCommunityPosts: vi.fn().mockResolvedValue([]),
        CalendarDB: { getEvents: vi.fn().mockResolvedValue([]) },
        TransactionsThreadingDB: {
            getState: vi.fn(),
        },
    };
});

vi.mock('@/app/infrastructure/NotificationRepository', () => ({
    NotificationRepository: { fetchNotifications: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/services/urgent-actions-db', () => ({
    UrgentActionsDB: { getState: vi.fn().mockResolvedValue({ cases: [] }) },
}));

describe('threading alerts', () => {
    beforeEach(() => {
        vi.mocked(TransactionsThreadingDB.getState).mockResolvedValue({
            transactions: [
                {
                    id: 'tx-1',
                    title: 'تسجيل عقار',
                    clientName: 'شركة الأفق',
                    targetDepartment: 'الطابو',
                    status: 'Paused',
                    agreedFees: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ],
            tasks: [],
            financeRecords: [],
            documents: [],
        });
    });

    it('🛡️ WHITELIST: تنبيهات Threading status (Paused/Blocked) لا تظهر في البطاقة العامة', async () => {
        // المستخدم طلب فقط tarikh مهلة المهام (deadline) من قسم المعاملات
        // — تنبيهات الحالة (paused/blocked) ليست ضمن الـ whitelist.
        const alerts = await SecretaryOrchestrator.getUnifiedAlerts({
            lawyerId: 'lawyer-1',
            files: [],
            executionFiles: [],
            notes: [],
        });

        const hit = alerts.find((a) => a.id.startsWith('threading:paused:') && a.target === 'threading');
        expect(hit).toBeUndefined();
    });
});
