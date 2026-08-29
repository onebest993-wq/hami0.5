import { describe, expect, it, vi } from 'vitest';
import { buildExtraPartyBadgeDefinitions } from '../partyInteractiveBadges/buildExtraPartyBadgeDefinitions';

describe('buildExtraPartyBadgeDefinitions', () => {
    it('يربط onDismiss النشر الصحفي بالممرّر من المكوّن', () => {
        const onDismissPublicationNoticeBadge = vi.fn();
        const extra = buildExtraPartyBadgeDefinitions({
            party: 'debtor',
            isPrimaryDebtor: true,
            executionData: null,
            memoBadge: null,
            publicationNoticeBadge: {
                publicationDateYmd: '2026-08-01',
                deadlineYmd: '2026-08-15',
                remaining: 6,
                graceExpired: false,
                newspaper1: 'الصباح',
                newspaper2: 'الزمان',
                recordedAt: new Date().toISOString(),
            },
            regularTablighBadge: null,
            absenceBadge: null,
            taklifAssignmentBadge: null,
            evictionGraceBadge: null,
            policeAssistanceBadge: null,
            showSummonsBadge: false,
            onDismissPublicationNoticeBadge,
            executionBadgeKey: 'k',
            executionId: 'exec-1',
            debtorAttendedVoluntarilyProp: false,
            voluntaryAttendanceCountProp: 0,
            personalCoerciveDecisionBadges: true,
            debtorArrested: false,
            forcedAttendancePending: false,
            taklifAssignmentSignalKey: '',
            activeDebtorKey: 'd1',
            primaryDebtorKey: 'd1',
        });

        const pub = extra.find((b) => b.id === 'publication_notice');
        expect(pub).toBeTruthy();
        pub?.onDismiss?.();
        expect(onDismissPublicationNoticeBadge).toHaveBeenCalledTimes(1);
    });
});
