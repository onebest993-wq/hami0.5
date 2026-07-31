import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareProcedureModal } from '@/app/components/lawyer/TransactionsThreading/ShareProcedureModal';

const createPost = vi.fn();

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));
vi.mock('@/app/context/AuthContext', () => ({
    useAuthSafe: () => ({
        user: { id: 'lawyer-1', email: 'a@b.com', user_metadata: { fullName: 'محامي' } },
        isLoading: false,
        hasRole: () => true,
    }),
}));
vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        createPost: (...args: unknown[]) => createPost(...args),
    },
}));
vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

describe('ShareProcedureModal', () => {
    beforeEach(() => {
        createPost.mockReset();
        createPost.mockResolvedValue({ id: 'p1' });
    });

    it('يعرض بطاقات الخطوات ويسمح بتحرير النص وينشر للمنتدى', async () => {
        const onOpenChange = vi.fn();
        render(
            <ShareProcedureModal
                open
                onOpenChange={onOpenChange}
                clientNameForScrub="أحمد"
                draft={{
                    title: 'دليل إجرائي — نقل ملكية',
                    body: '┌─ البطاقة 1\n│  تقديم الطلب\nhami-action:open-transactions',
                    tags: ['#دليل_إجرائي'],
                    steps: [
                        {
                            id: 's1',
                            number: '1',
                            title: 'تقديم الطلب',
                            notes: 'راجع القسم',
                            depth: 0,
                            parentTaskId: null,
                        },
                        {
                            id: 's2',
                            number: '1.1',
                            title: 'استلام',
                            notes: '',
                            depth: 1,
                            parentTaskId: 's1',
                        },
                    ],
                    documents: [{ title: 'هوية', ownerTag: 'للموكل' }],
                }}
            />,
        );

        expect(screen.getByTestId('share-procedure-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('share-step-card-1')).toBeInTheDocument();
        expect(screen.getByText(/مستمسكات \(عناوين فقط\)/)).toBeInTheDocument();
        expect(screen.queryByLabelText(/الدائرة/)).not.toBeInTheDocument();

        const body = screen.getByLabelText(/نص الإجراءات/) as HTMLTextAreaElement;
        fireEvent.change(body, {
            target: { value: 'نص معدّل يدوياً\n┌─ البطاقة 1\n│  خطوة\nhami-action:open-transactions' },
        });

        fireEvent.click(screen.getByTestId('share-procedure-publish'));

        await waitFor(() => expect(createPost).toHaveBeenCalledTimes(1));
        const post = createPost.mock.calls[0]?.[0] as { content: string; tags: string[]; authorId: string };
        expect(post.authorId).toBe('lawyer-1');
        expect(post.content).toContain('نص معدّل يدوياً');
        expect(post.content).toContain('hami-action:open-transactions');
        expect(post.content).toContain('hami-guide-data:');
        expect(post.tags).toContain('#دليل_إجرائي');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
