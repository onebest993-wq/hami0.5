import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HqLiveOverview } from '@/app/components/admin/hqLiveOverview';
import { HQ_FOLD_STORAGE_KEY } from '@/app/components/admin/useHqFold';
import { clearPrimedHeadquartersStatus, primeHeadquartersCourts } from '@/app/services/admin/hqDevSessionPrime';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { HqCourtStatsPanel } from '../HqCourtStatsPanel';

const OVERVIEW: HqLiveOverview = {
    system: 'connected',
    db: true,
    kvOk: true,
    pendingVerification: 2,
    verificationApproved: 5,
    verificationRejected: 1,
    pendingReports: 3,
    pendingCommentReports: 1,
    usersTotal: 12,
    usersFrozen: 2,
    usersLocked: 0,
    usersActive: 10,
    usersLawyer: 9,
    usersModerator: 2,
    usersAdmin: 1,
    usersNew24h: 1,
    usersNew7d: 4,
    forumPosts: 40,
    forumComments: 11,
    forumBans: 4,
    forumBansActive: 2,
    forumDocuments: 6,
    forumPinned: 1,
    forumLocked: 0,
    verificationCapped: false,
    contentPartial: false,
    contentGaps: [],
    fetchedAt: '2026-08-27T21:00:00.000Z',
    stale: false,
    sessionRequired: false,
};

describe('HqCourtStatsPanel', () => {
    beforeEach(() => {
        sessionStorage.removeItem(HQ_FOLD_STORAGE_KEY);
        clearPrimedHeadquartersStatus();
        fetchSecure.mockReset();
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
    });

    it('يعرض طابور العمل والإحصائيات الحية ولا يخترع توزيع محاكم فارغ', async () => {
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
        const onJump = vi.fn();
        render(<HqCourtStatsPanel liveOverview={OVERVIEW} onJump={onJump} />);
        await waitFor(() => {
            expect(screen.getByTestId('hq-stats-monitor')).toBeInTheDocument();
        });
        expect(screen.getByTestId('hq-stats-queue')).toBeInTheDocument();
        expect(screen.getByTestId('hq-stats-health')).toBeInTheDocument();
        expect(screen.getByTestId('hq-stats-accounts')).toBeInTheDocument();
        expect(screen.getByTestId('hq-stats-verification')).toBeInTheDocument();
        expect(screen.getByTestId('hq-stats-forum')).toBeInTheDocument();
        expect(screen.getByText('حسابات نشطة')).toBeInTheDocument();
        expect(screen.getByText('حسابات آخر 24 ساعة')).toBeInTheDocument();
        expect(screen.getByText('توثيق معتمد')).toBeInTheDocument();
        expect(screen.getByText('حظر منتدى ساري')).toBeInTheDocument();
        expect(screen.getByText('منشورات مثبّتة')).toBeInTheDocument();
        expect(screen.getByText('بلاغات تعليقات معلّقة')).toBeInTheDocument();
        expect(screen.getByText('منشورات عامة')).toBeInTheDocument();
        expect(screen.getByText('إجمالي البلاغات المعلّقة')).toBeInTheDocument();
        expect(screen.getByText(/آخر تحديث/)).toBeInTheDocument();
        expect(screen.queryByTestId('hq-stats-courts')).not.toBeInTheDocument();
        expect(screen.queryByText('لا توجد دعاوى أو معاملات تنفيذ سحابية')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /حسابات مجمّدة/ }));
        expect(onJump).toHaveBeenCalledWith('users', {
            userStatus: 'frozen',
            userRole: 'all',
            userCreated: 'all',
        });
        fireEvent.click(screen.getByRole('button', { name: /مقفل الدخول/ }));
        expect(onJump).toHaveBeenCalledWith('users', {
            userStatus: 'locked',
            userRole: 'all',
            userCreated: 'all',
        });
        fireEvent.click(screen.getByRole('button', { name: /محامون/ }));
        expect(onJump).toHaveBeenCalledWith('users', {
            userStatus: 'all',
            userRole: 'lawyer',
            userCreated: 'all',
        });
        fireEvent.click(screen.getByRole('button', { name: /حسابات آخر 24 ساعة/ }));
        expect(onJump).toHaveBeenCalledWith('users', {
            userStatus: 'all',
            userRole: 'all',
            userCreated: '24h',
        });
        fireEvent.click(screen.getByRole('button', { name: /حسابات آخر 7 أيام/ }));
        expect(onJump).toHaveBeenCalledWith('users', {
            userStatus: 'all',
            userRole: 'all',
            userCreated: '7d',
        });
        fireEvent.click(screen.getByRole('button', { name: /توثيق معتمد/ }));
        expect(onJump).toHaveBeenCalledWith('requests', { verificationStatus: 'active' });
        fireEvent.click(screen.getByRole('button', { name: /توثيق مرفوض/ }));
        expect(onJump).toHaveBeenCalledWith('requests', { verificationStatus: 'rejected' });
        fireEvent.click(screen.getByRole('button', { name: /إجمالي يحتاج إجراء/ }));
        expect(onJump).toHaveBeenCalledWith('requests', { verificationStatus: 'pending' });
        fireEvent.click(screen.getByRole('button', { name: /حظر منتدى ساري/ }));
        expect(onJump).toHaveBeenCalledWith('forum', { forumTab: 'bans' });
        fireEvent.click(screen.getByRole('button', { name: /منشورات مثبّتة/ }));
        expect(onJump).toHaveBeenCalledWith('forum', { forumTab: 'posts', forumPostKind: 'pinned' });
        fireEvent.click(screen.getByRole('button', { name: /بلاغات تعليقات معلّقة/ }));
        expect(onJump).toHaveBeenCalledWith('reports', { reportFocus: 'comments' });
        fireEvent.click(screen.getByRole('button', { name: /إجمالي البلاغات المعلّقة/ }));
        expect(onJump).toHaveBeenCalledWith('reports', { reportFocus: 'all' });
    });

    it('يطوي قسم الحسابات ويُبقي الملخص ظاهراً', async () => {
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
        render(<HqCourtStatsPanel liveOverview={OVERVIEW} />);
        await waitFor(() => {
            expect(screen.getByText('حسابات نشطة')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'الحسابات — طي القسم' }));
        const expand = screen.getByRole('button', {
            name: 'الحسابات — 12 حساب · 2 مجمّد · 0 مقفل — توسيع القسم',
        });
        expect(expand).toHaveAttribute('aria-expanded', 'false');
        const panel = document.getElementById(expand.getAttribute('aria-controls') || '');
        expect(panel).toHaveAttribute('hidden');
        expect(screen.getByText('12 حساب · 2 مجمّد · 0 مقفل')).toBeInTheDocument();
    });

    it('يبقي آخر الأرقام عند تعذّر التحديث ولا يعرض أصفاراً كواقع', async () => {
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
        render(<HqCourtStatsPanel liveOverview={{ ...OVERVIEW, system: 'down', stale: true }} />);
        await waitFor(() => {
            expect(screen.getByText('تعذّر التحديث — تُعرض آخر أرقام ناجحة.')).toBeInTheDocument();
        });
        expect(screen.getByText('حسابات نشطة')).toBeInTheDocument();
        expect(screen.queryByText('تعذّر تحميل الإحصائيات')).not.toBeInTheDocument();
    });

    it('تحديث يعيد نبض الحالة مع توزيع المحاكم', async () => {
        fetchSecure.mockResolvedValue({
            ok: true,
            courts: [{ court: 'بغداد', lawsuits: 2, transactions: 1 }],
        });
        const listener = vi.fn();
        window.addEventListener('hami-hq-status-refresh', listener);
        render(<HqCourtStatsPanel liveOverview={OVERVIEW} />);
        await waitFor(() => {
            expect(screen.getByTestId('hq-stats-courts')).toBeInTheDocument();
        });
        expect(screen.getByText('بغداد')).toBeInTheDocument();
        expect(screen.getByText('مجموع الدعاوى')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));
        expect(listener).toHaveBeenCalled();
        await waitFor(() => {
            expect(fetchSecure).toHaveBeenCalledWith(
                '/api/admin/stats?fresh=1',
                expect.objectContaining({ method: 'GET' }),
            );
        });
        window.removeEventListener('hami-hq-status-refresh', listener);
    });

    it('إجمالي الإجراء يقفز للبلاغات إن لم يوجد توثيق معلّق', async () => {
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
        const onJump = vi.fn();
        render(
            <HqCourtStatsPanel
                liveOverview={{ ...OVERVIEW, pendingVerification: 0, pendingReports: 2, pendingCommentReports: 0 }}
                onJump={onJump}
            />,
        );
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /إجمالي يحتاج إجراء/ })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /إجمالي يحتاج إجراء/ }));
        expect(onJump).toHaveBeenCalledWith('reports', { reportFocus: 'all' });
    });

    it('يعلن نقص العدّ بتنبيه القسم لا بنص يخوّن الأصفار', async () => {
        fetchSecure.mockResolvedValue({ ok: true, courts: [] });
        render(
            <HqCourtStatsPanel
                liveOverview={{ ...OVERVIEW, contentPartial: true, contentGaps: ['forumComments'] }}
            />,
        );
        await waitFor(() => {
            expect(screen.getByTestId('hq-stats-forum')).toHaveClass('hq-fold-alert');
        });
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByText(/جداول المحتوى غير متاحة/)).not.toBeInTheDocument();
        expect(screen.queryByText(/من سجل طلبات التوثيق/)).not.toBeInTheDocument();
    });

    it('لا يعرض أصفار الحسابات عند انقطاع القاعدة', async () => {
        render(
            <HqCourtStatsPanel
                liveOverview={{
                    ...OVERVIEW,
                    system: 'down',
                    db: false,
                    kvOk: false,
                    usersTotal: 0,
                    stale: false,
                    fetchedAt: '2026-08-27T21:00:00.000Z',
                    contentGaps: ['usersTotal', 'usersFrozen', 'usersLocked', 'usersActive'],
                }}
            />,
        );
        expect(await screen.findByText('تعذّر تحميل الإحصائيات')).toBeInTheDocument();
        expect(screen.queryByText('حسابات نشطة')).toBeNull();
    });

    it('لا يدّعي أن القاعدة متوقفة عند غياب جلسة المقر', async () => {
        fetchSecure.mockClear();
        render(
            <HqCourtStatsPanel
                liveOverview={{
                    ...OVERVIEW,
                    system: 'down',
                    db: false,
                    kvOk: false,
                    fetchedAt: null,
                    sessionRequired: true,
                }}
            />,
        );
        expect(await screen.findByText('بلا جلسة · لم تُفحص الخدمات')).toBeInTheDocument();
        expect(screen.getByText('لم يُفحص')).toBeInTheDocument();
        expect(screen.getByText('لا توجد جلسة خادم لفحص الصحة')).toBeInTheDocument();
        expect(screen.queryByText('متوقفة')).toBeNull();
        expect(screen.queryByText(/^متوقف$/)).toBeNull();
        expect(fetchSecure).not.toHaveBeenCalled();
        expect(screen.getByTestId('hq-stats-health')).not.toHaveClass('hq-fold-alert');
    });

    it('يرسم توزيع المحاكم المُجهَّز دون جلب إضافي', async () => {
        primeHeadquartersCourts([{ court: 'الكرخ', lawsuits: 3, transactions: 1 }]);
        render(<HqCourtStatsPanel liveOverview={OVERVIEW} />);
        expect(await screen.findByTestId('hq-stats-courts')).toBeInTheDocument();
        expect(screen.getByText('الكرخ')).toBeInTheDocument();
        await waitFor(() => expect(fetchSecure).not.toHaveBeenCalled());
    });

    it('يبقي توزيع المحاكم إن فشل التحديث اللاحق', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            courts: [{ court: 'بغداد', lawsuits: 2, transactions: 1 }],
        });
        render(<HqCourtStatsPanel liveOverview={OVERVIEW} />);
        expect(await screen.findByText('بغداد')).toBeInTheDocument();
        fetchSecure.mockRejectedValueOnce(new Error('down'));
        fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));
        await waitFor(() => {
            expect(fetchSecure).toHaveBeenCalledWith(
                '/api/admin/stats?fresh=1',
                expect.objectContaining({ method: 'GET' }),
            );
        });
        expect(screen.getByText('بغداد')).toBeInTheDocument();
        expect(screen.queryByText('تعذّر تحميل توزيع المحاكم')).not.toBeInTheDocument();
    });
});
