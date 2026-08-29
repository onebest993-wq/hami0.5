import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { HqForumAdminPanel } from '../HqForumAdminPanel';

describe('HqForumAdminPanel', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        fetchSecure.mockImplementation(async (path: string) => {
            if (path === '/api/forum/stats') {
                return {
                    ok: true,
                    stats: {
                        totalPosts: 1,
                        totalComments: 0,
                        totalUpvotes: 0,
                        totalReports: 0,
                        pendingReports: 0,
                        totalDocuments: 0,
                        totalBannedUsers: 1,
                        topTags: [],
                    },
                };
            }
            if (path === '/api/forum/ban') {
                return {
                    ok: true,
                    bannedUsers: [
                        {
                            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee09',
                            userName: 'محظور',
                            reason: 'إساءة',
                            bannedAt: '2026-08-01T00:00:00.000Z',
                        },
                    ],
                };
            }
            if (path === '/api/admin/consultations') {
                return { ok: true, consultations: [] };
            }
            return { ok: true, users: [] };
        });
    });

    it('يفتح تبويب الحظر من قفزة الإحصائيات', async () => {
        render(<HqForumAdminPanel initialForumTab="bans" />);
        await waitFor(() => {
            expect(screen.getByText('حظر مستخدم من المنتدى')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'الحظر' })).toHaveClass('hq-chip-active');
        expect(screen.queryByText('إجمالي المنشورات')).not.toBeInTheDocument();
    });

    it('من مقياس المحظورين ينتقل إلى قائمة الحظر', async () => {
        render(<HqForumAdminPanel initialForumTab="stats" />);
        fireEvent.click(await screen.findByRole('button', { name: 'مستخدمين محظورين: 1' }));
        expect(await screen.findByText('حظر مستخدم من المنتدى')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'الحظر' })).toHaveClass('hq-chip-active');
    });

    it('يظهر ختم القص عندما تعيد قائمة الحظر capped', async () => {
        fetchSecure.mockImplementation(async (path: string) => {
            if (path === '/api/forum/stats') {
                return {
                    ok: true,
                    stats: {
                        totalPosts: 0,
                        totalComments: 0,
                        totalUpvotes: 0,
                        totalReports: 0,
                        pendingReports: 0,
                        totalDocuments: 0,
                        totalBannedUsers: 0,
                        topTags: [],
                    },
                };
            }
            if (path === '/api/forum/ban') {
                return { ok: true, bannedUsers: [], capped: true };
            }
            if (path === '/api/admin/consultations') {
                return { ok: true, consultations: [] };
            }
            return { ok: true, users: [] };
        });
        render(<HqForumAdminPanel initialForumTab="bans" />);
        expect(
            await screen.findByText('قائمة الحظر مقصوصة عند سقف المقر — الأقدم قد لا يظهر.'),
        ).toBeInTheDocument();
    });

    it('من مقياس المنشورات يفتح قائمة المنشورات', async () => {
        render(<HqForumAdminPanel initialForumTab="stats" />);
        fireEvent.click(await screen.findByRole('button', { name: 'إجمالي المنشورات: 1' }));
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'المنشورات' })).toHaveClass('hq-chip-active');
        });
    });
});
