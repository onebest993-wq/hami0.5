import { render, screen, waitFor } from '@testing-library/react';
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

import { HqReportsInbox } from '../HqReportsInbox';

const POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee02';
const REPORT_POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01';
const REPORT_COMMENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee04';
const COMMENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee03';

describe('HqReportsInbox', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        fetchSecure.mockResolvedValue({
            ok: true,
            reports: [
                {
                    id: REPORT_POST,
                    postId: POST,
                    reporterId: 'u1',
                    reason: 'سبام منشور',
                    createdAt: '2026-08-27T00:00:00.000Z',
                    status: 'pending',
                    post: { id: POST, title: 'منشور مبلغ', content: 'نص' },
                },
            ],
            commentReports: [
                {
                    id: REPORT_COMMENT,
                    commentId: COMMENT,
                    postId: POST,
                    reason: 'سبام تعليق',
                    createdAt: '2026-08-27T00:00:00.000Z',
                    snippet: 'نص التعليق المبلغ',
                },
            ],
        });
    });

    it('يركّز بلاغات التعليقات عند القفزة من الإحصائيات', async () => {
        render(<HqReportsInbox initialFocus="comments" />);
        await waitFor(() => {
            expect(screen.getByText('نص التعليق المبلغ')).toBeInTheDocument();
        });
        expect(screen.queryByText('منشور مبلغ')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'تعليقات' })).toHaveClass('hq-chip-active');
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/forum/reports',
            expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
        );
    });

    it('يظهر ختم القص عندما تعيد البلاغات capped', async () => {
        fetchSecure.mockResolvedValue({
            ok: true,
            reports: [],
            commentReports: [],
            capped: true,
        });
        render(<HqReportsInbox />);
        expect(
            await screen.findByText('القائمة مقصوصة عند سقف المقر — الأقدم قد لا يظهر.'),
        ).toBeInTheDocument();
    });
});
