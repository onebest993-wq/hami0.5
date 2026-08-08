import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SparkCriminalNudgeHost } from '@/app/spark/ui/SparkCriminalNudgeHost';
import { SparkUrgentNudgeHost } from '@/app/spark/ui/SparkUrgentNudgeHost';
import { resetSparkPreferences } from '@/app/spark/memory/sparkPreferenceStore';

describe('Spark section hosts', () => {
    beforeEach(() => {
        resetSparkPreferences();
    });

    it('يعرض سبارك الجزائي عند غياب تاريخ النشر', () => {
        render(
            <SparkCriminalNudgeHost
                caseId="crim-1"
                caseNumber="CR-1/2026"
                verdictCards={[
                    {
                        id: 'v1',
                        outcome: 'conviction',
                        issuedAt: '2026-01-01',
                        appealDeadline: '2026-02-01',
                        presenceType: 'غيابي',
                    },
                ]}
            />,
        );
        expect(screen.getByTestId('spark-smart-badge')).toBeInTheDocument();
        expect(screen.getByText(/تاريخ النشر\/التبليغ غير مسجّل/)).toBeInTheDocument();
    });

    it('يعرض سبارك المستعجل عند غياب تأكيد تبليغ التظلم', () => {
        render(
            <SparkUrgentNudgeHost
                caseId="urg-1"
                requestNumber="U-1"
                lifecycle={{
                    fileStatus: 'grievance',
                    activeLifecycleStep: 'grievance',
                    judgeDecision: { decision: 'rejected', decisionDate: '2026-03-01', requiresGuarantee: false },
                    executionData: {
                        executionDate: '',
                        notificationDate: '',
                        deadlineDays: 3,
                        authority: '',
                        notes: '',
                    },
                    grievanceData: { rejectionNotificationDate: '', outcome: 'filed', filingDate: '' },
                    grievanceDecisionNotificationConfirmed: false,
                    cassationData: { filedBy: null, outcome: '', filingDate: '', fileNumber: '' },
                }}
                onConfirmGrievanceNotification={vi.fn()}
            />,
        );
        expect(screen.getByTestId('spark-smart-badge')).toBeInTheDocument();
        expect(screen.getByText(/تبليغ قرار التظلم غير مؤكّد/)).toBeInTheDocument();
    });
});
