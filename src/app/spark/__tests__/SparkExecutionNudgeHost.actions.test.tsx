import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SparkExecutionNudgeHost } from '@/app/spark/ui/SparkExecutionNudgeHost';
import type { ExecutionFile } from '@/app/types/execution';

vi.mock('@/app/spark/shell/useSparkNudgeHostShellBridge', () => ({
    useSparkNudgeHostShellBridge: () => {},
}));

vi.mock('@/app/spark/engine/sparkExecutionEngine', () => ({
    pickExecutionSparkNudgeQueue: () => [
        {
            id: 'exec:taklif',
            kind: 'execution.employee_taklif_active',
            surface: 'execution',
            priority: 4,
            message: 'تكليف نشط',
            source: 'test',
            dossierKey: 'execution:1',
            action: { label: 'فتح التكليف', actionId: 'open_employee_assignment' },
        },
    ],
}));

vi.mock('@/app/spark/shell/shellReviewPayloadBuilders', () => ({
    buildExecutionShellReviewPayload: () => null,
}));

vi.mock('@/app/spark/vault/useExecutionBoundVaultDocs', () => ({
    useExecutionBoundVaultDocs: () => [],
}));

vi.mock('@/app/spark/ui/useSparkActiveNudge', () => ({
    useSparkActiveNudgeFromQueue: ({ queue }: { queue: unknown[] }) => ({
        nudge: queue[0] ?? null,
        visibleQueue: queue,
        handleLater: vi.fn(),
        handleDismiss: vi.fn(),
        hideAfterFollow: vi.fn(),
    }),
}));

const file = {
    id: 'exec-1',
    fileNumber: '1/2026',
    debtors: [{ id: 'd1', name: 'مدين' }],
    timelineEvents: [],
} as ExecutionFile;

describe('SparkExecutionNudgeHost actions', () => {
    it('يربط open_employee_assignment بمعالج التكليف', () => {
        const onOpenEmployeeAssignment = vi.fn();
        render(
            <SparkExecutionNudgeHost
                executionData={file}
                presentation="banner"
                actions={{ onOpenEmployeeAssignment }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /فتح التكليف/i }));
        expect(onOpenEmployeeAssignment).toHaveBeenCalledTimes(1);
    });
});
