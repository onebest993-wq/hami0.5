import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SparkShell } from '@/app/spark/ui/SparkShell';

const emptySources = {
    lawsuitFiles: [],
    executionFiles: [],
    criminalCases: [],
    urgentCases: [],
    threadingTransactions: [],
    threadingTasks: [],
    notes: [],
    fieldTasks: [],
    vaultDocs: [],
    calendarEvents: [],
    ready: true,
};

describe('SparkShell', () => {
    it('يفتح اللوحة عند الضغط على زر الشرارة', () => {
        render(
            <SparkShell
                clusterScanSources={emptySources}
                onNavigateRoute={vi.fn()}
            />,
        );

        expect(screen.getByTestId('spark-shell-fab')).toBeInTheDocument();
        expect(screen.queryByTestId('spark-shell-panel')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId('spark-shell-fab'));

        expect(screen.getByTestId('spark-shell-panel')).toBeInTheDocument();
        expect(screen.getByText(/لا فجوات إجرائية الآن/)).toBeInTheDocument();
    });
});
