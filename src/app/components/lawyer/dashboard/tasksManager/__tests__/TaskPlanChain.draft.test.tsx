import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskPlanChainDraftEditor } from '@/app/components/lawyer/dashboard/tasksManager/TaskPlanChain';

describe('TaskPlanChainDraftEditor', () => {
    it('يضيف حلقة في سلسلة تلتف أفقياً بخيوط', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <TaskPlanChainDraftEditor
                steps={[{ id: 'a', title: 'خطوة ١' }]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByTestId('tasks-plan-chain-add'));
        expect(onChange).toHaveBeenCalledTimes(1);
        const next = onChange.mock.calls[0]![0] as { id: string; title: string }[];
        expect(next).toHaveLength(2);
        expect(next[1]!.title).toBe('');

        rerender(<TaskPlanChainDraftEditor steps={next} onChange={onChange} />);
        const draft = screen.getByTestId('tasks-plan-chain-draft');
        expect(draft.className).toContain('min-w-0');
        const track = draft.querySelector('[role="list"]');
        expect(track?.className).toContain('flex-wrap');
        expect(track?.className).not.toContain('overflow-x-auto');
        expect(draft.querySelectorAll('input').length).toBe(2);
        expect(draft.textContent).toContain('سلسلة الخطة');
    });

    it('يحذف حلقة ويُبقي واحدة فارغة على الأقل', () => {
        const onChange = vi.fn();
        render(
            <TaskPlanChainDraftEditor
                steps={[
                    { id: 'a', title: 'أ' },
                    { id: 'b', title: 'ب' },
                ]}
                onChange={onChange}
            />,
        );
        fireEvent.click(screen.getByLabelText('حذف الخطوة 1'));
        expect(onChange).toHaveBeenCalledWith([{ id: 'b', title: 'ب' }]);
    });
});
