import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ArchivePortalExecutionSurface } from '../../ArchivePortalExecutionSurface';
import { ExecutionArchiveHostOpenContext } from '@/app/components/lawyer/dashboard/executionArchiveHostOpenContext';

const baseFile = {
    id: 'exec-archive-1',
    fileNumber: '501',
    fileYear: '2026',
    directorate: 'مديرية',
    status: 'active',
    debtors: [{ name: 'مدين' }],
    creditors: [{ name: 'دائن' }],
};

function renderExecutionSurface(
    extra?: Partial<{
        onArchiveExecution: ReturnType<typeof vi.fn>;
        onMoveExecutionToTrash: ReturnType<typeof vi.fn>;
    }>,
) {
    const onArchiveExecution = extra?.onArchiveExecution ?? vi.fn();
    const onMoveExecutionToTrash = extra?.onMoveExecutionToTrash ?? vi.fn();
    return render(
        <ArchivePortalExecutionSurface
            embedded
            hideHeader
            type="executions"
            files={[baseFile]}
            theme={{} as never}
            shapeClass=""
            onClose={vi.fn()}
            onFileClick={vi.fn()}
            onAddAction={vi.fn()}
            onArchiveExecution={onArchiveExecution}
            onMoveExecutionToTrash={onMoveExecutionToTrash}
        />,
    );
}

describe('ArchivePortalExecutionSurface archive/trash dialogs', () => {
    it('يفتح حوار الأرشفة عند النقر على زر البطاقة (embedded)', async () => {
        const onArchiveExecution = vi.fn();
        renderExecutionSurface({ onArchiveExecution });

        fireEvent.click(await screen.findByTestId('execution-smart-card-archive'));

        expect(screen.getByTestId('execution-archive-confirm-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('execution-archive-trash-dialogs-layer')).toBeInTheDocument();
    });

    it('يفتح حوار المهملات عند النقر على زر البطاقة (embedded)', async () => {
        renderExecutionSurface();

        fireEvent.click(await screen.findByTestId('execution-smart-card-trash'));

        expect(screen.getByTestId('execution-trash-confirm-dialog')).toBeInTheDocument();
    });

    it('ينفّذ الأرشفة عند التأكيد', async () => {
        const onArchiveExecution = vi.fn();
        renderExecutionSurface({ onArchiveExecution });

        fireEvent.click(await screen.findByTestId('execution-smart-card-archive'));
        fireEvent.click(screen.getByTestId('execution-archive-confirm-submit'));

        expect(onArchiveExecution).toHaveBeenCalledWith('exec-archive-1');
    });

    it('يبوّب حوار التأكيد إلى document.body خارج visibility:hidden', async () => {
        render(
            <div data-testid="hidden-archive-ancestor" style={{ visibility: 'hidden' }}>
                <ArchivePortalExecutionSurface
                    embedded
                    hideHeader
                    type="executions"
                    files={[baseFile]}
                    theme={{} as never}
                    shapeClass=""
                    onClose={vi.fn()}
                    onFileClick={vi.fn()}
                    onAddAction={vi.fn()}
                    onArchiveExecution={vi.fn()}
                    onMoveExecutionToTrash={vi.fn()}
                />
            </div>,
        );

        fireEvent.click(await screen.findByTestId('execution-smart-card-archive'));

        const dialog = screen.getByTestId('execution-archive-confirm-dialog');
        expect(dialog).toBeVisible();
        expect(dialog.closest('[data-testid="hidden-archive-ancestor"]')).toBeNull();
        expect(document.body.contains(dialog)).toBe(true);
    });

    it('يزيل حوار التأكيد من body عند إغلاق قشرة المخزن', async () => {
        const surface = (
            <ArchivePortalExecutionSurface
                embedded
                hideHeader
                type="executions"
                files={[baseFile]}
                theme={{} as never}
                shapeClass=""
                onClose={vi.fn()}
                onFileClick={vi.fn()}
                onAddAction={vi.fn()}
                onArchiveExecution={vi.fn()}
                onMoveExecutionToTrash={vi.fn()}
            />
        );

        const { rerender } = render(
            <ExecutionArchiveHostOpenContext.Provider value={true}>
                {surface}
            </ExecutionArchiveHostOpenContext.Provider>,
        );

        fireEvent.click(await screen.findByTestId('execution-smart-card-archive'));
        expect(screen.getByTestId('execution-archive-confirm-dialog')).toBeInTheDocument();

        rerender(
            <ExecutionArchiveHostOpenContext.Provider value={false}>
                {surface}
            </ExecutionArchiveHostOpenContext.Provider>,
        );

        expect(screen.queryByTestId('execution-archive-confirm-dialog')).not.toBeInTheDocument();
        expect(screen.queryByTestId('execution-archive-trash-dialogs-layer')).not.toBeInTheDocument();
    });
});
