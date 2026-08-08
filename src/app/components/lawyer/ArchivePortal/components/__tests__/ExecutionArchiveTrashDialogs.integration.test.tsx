import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ArchivePortalExecutionSurface } from '../../ArchivePortalExecutionSurface';

vi.mock('@/app/spark/ui/SparkExecutionArchiveInsight', () => ({
    SparkExecutionArchiveInsight: () => null,
}));

const baseFile = {
    id: 'exec-archive-1',
    fileNumber: '501',
    fileYear: '2026',
    directorate: 'مديرية',
    status: 'active',
    debtors: [{ name: 'مدين' }],
    creditors: [{ name: 'دائن' }],
};

describe('ArchivePortalExecutionSurface archive/trash dialogs', () => {
    it('يفتح حوار الأرشفة عند النقر على زر البطاقة (embedded)', () => {
        const onArchiveExecution = vi.fn();

        render(
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
                onMoveExecutionToTrash={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('execution-smart-card-archive'));

        expect(screen.getByTestId('execution-archive-confirm-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('execution-archive-trash-dialogs-layer')).toBeInTheDocument();
    });

    it('يفتح حوار المهملات عند النقر على زر البطاقة (embedded)', () => {
        render(
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
            />,
        );

        fireEvent.click(screen.getByTestId('execution-smart-card-trash'));

        expect(screen.getByTestId('execution-trash-confirm-dialog')).toBeInTheDocument();
    });

    it('ينفّذ الأرشفة عند التأكيد', () => {
        const onArchiveExecution = vi.fn();

        render(
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
                onMoveExecutionToTrash={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('execution-smart-card-archive'));
        fireEvent.click(screen.getByTestId('execution-archive-confirm-submit'));

        expect(onArchiveExecution).toHaveBeenCalledWith('exec-archive-1');
    });
});
