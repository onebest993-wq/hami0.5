import { describe, expect, it } from 'vitest';
import { buildSubsequentNoticePresentation } from '../buildSubsequentNoticePresentation';

describe('buildSubsequentNoticePresentation', () => {
    it('builds memo notice badge when first notice is pending and no blockers exist', () => {
        const result = buildSubsequentNoticePresentation({
            notificationCount: 1,
            subsequentNoticeUnlocked: false,
            isEvictionExecutionModule: false,
            executionDebtorNotificationDate: '2026-01-10',
            executionMemoAnchorDate: '2026-01-10',
            executionEvictionFirstNoticeDate: null,
            executionNoticeVoluntaryPeriodEndDeclared: false,
            executionEvictionVoluntaryPeriodEndDeclared: false,
            debtorNotificationDate: null,
            manualGraceCalendarExtra: false,
            debtorAttendedVoluntarily: false,
            voluntaryAttendanceCount: 0,
            lawyerStartedPostNoticeExecution: false,
            noticeVoluntaryPeriodEndOptimistic: false,
            voluntaryEndOptimistic: false,
            anyExecutorDecisionResolvedForMemoBadge: false,
            primaryDebtorTaklifActive: false,
            activeDebtorNoticeScope: {},
            executionDebtorSummonsMarkerId: null,
            debtorSummonsMarkerLocalId: null,
            effectiveDebtors: [],
            isEvictionGraceExpiredNow: false,
            isGracePeriodExpiredNow: false,
            now: new Date('2026-01-11T00:00:00.000Z'),
        });

        expect(result.primaryMemoNoticeBadge?.anchor).toBe('2026-01-10');
        expect(result.showDebtorUnservedMemoBadge).toBe(false);
    });

    it('shows attendance and absence badges after voluntary period ends', () => {
        const result = buildSubsequentNoticePresentation({
            notificationCount: 1,
            subsequentNoticeUnlocked: true,
            isEvictionExecutionModule: false,
            executionDebtorNotificationDate: null,
            executionMemoAnchorDate: null,
            executionEvictionFirstNoticeDate: null,
            executionNoticeVoluntaryPeriodEndDeclared: true,
            executionEvictionVoluntaryPeriodEndDeclared: false,
            debtorNotificationDate: null,
            manualGraceCalendarExtra: false,
            debtorAttendedVoluntarily: false,
            voluntaryAttendanceCount: 0,
            lawyerStartedPostNoticeExecution: false,
            noticeVoluntaryPeriodEndOptimistic: false,
            voluntaryEndOptimistic: false,
            anyExecutorDecisionResolvedForMemoBadge: false,
            primaryDebtorTaklifActive: false,
            activeDebtorNoticeScope: {},
            executionDebtorSummonsMarkerId: 'marker-1',
            debtorSummonsMarkerLocalId: null,
            effectiveDebtors: [],
            isEvictionGraceExpiredNow: true,
            isGracePeriodExpiredNow: true,
            now: new Date('2026-01-11T00:00:00.000Z'),
        });

        expect(result.primaryDebtorAbsenceBadge?.label).toBe('عدم حضور المدين');
        expect(result.showDebtorSummonsAttendanceBadge).toBe(true);
    });
});
