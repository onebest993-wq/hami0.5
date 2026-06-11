import { describe, it, expect } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    areDebtorSummonsMarkersEqual,
    buildDebtorNoticePatchForKey,
    buildDebtorNotificationCountPatchForKey,
    buildDebtorSummonsMarkerPatchForKey,
    getDebtorNoticeStateForKey,
    getDebtorNotificationCountForKey,
    getDebtorSummonsMarkerForKey,
    isDebtorNotifiedForCoerciveActions,
} from '@/app/utils/noticeDebtorScope';

const primaryKey = 'primary_debtor';
const extraKey = 'debtor_extra_1';

function baseFile(over: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'f1',
        directorate: 'x',
        fileNumber: '1',
        fileYear: '2026',
        debtors: [{ id: 'primary_debtor', name: 'أحمد' }],
        ...over,
    } as ExecutionFile;
}

describe('noticeDebtorScope — getDebtorNoticeStateForKey', () => {
    it('primary debtor reads legacy root when maps empty', () => {
        const file = baseFile({
            debtorNotificationDate: '2026-03-01',
            execution_memo_anchor_date: '2026-03-02',
            activeNoticeState: 'initial_notice',
            notice_voluntary_period_end_declared: true,
            debtor_absence_badge_dismissed: true,
        });
        const s = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
        expect(s.notificationDate).toBe('2026-03-01');
        expect(s.memoAnchorDate).toBe('2026-03-02');
        expect(s.activeNoticeState).toBe('initial_notice');
        expect(s.voluntaryPeriodEndDeclared).toBe(true);
        expect(s.absenceBadgeDismissed).toBe(true);
    });

    it('non-primary debtor does not inherit legacy root dates', () => {
        const file = baseFile({
            debtorNotificationDate: '2026-03-01',
            activeNoticeState: 'forced_attendance',
        });
        const s = getDebtorNoticeStateForKey(file, extraKey, primaryKey);
        expect(s.notificationDate).toBeNull();
        expect(s.memoAnchorDate).toBeNull();
        expect(s.activeNoticeState).toBeNull();
        expect(s.voluntaryPeriodEndDeclared).toBe(false);
        expect(s.absenceBadgeDismissed).toBe(false);
    });

    it('per-debtor maps override legacy for matching key', () => {
        const file = baseFile({
            debtorNotificationDate: '2026-01-01',
            debtor_notification_date_by_debtor: { [primaryKey]: '2026-04-01' },
            debtor_absence_badge_dismissed_by_debtor: { [extraKey]: true },
        });
        const primary = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
        expect(primary.notificationDate).toBe('2026-04-01');
        const extra = getDebtorNoticeStateForKey(file, extraKey, primaryKey);
        expect(extra.notificationDate).toBeNull();
        expect(extra.absenceBadgeDismissed).toBe(true);
    });

    it('invalid YMD in map is ignored; primary falls back to legacy', () => {
        const file = baseFile({
            debtorNotificationDate: '2026-05-01',
            debtor_notification_date_by_debtor: { [primaryKey]: 'not-a-date' },
        });
        const s = getDebtorNoticeStateForKey(file, primaryKey, primaryKey);
        expect(s.notificationDate).toBe('2026-05-01');
    });
});

describe('noticeDebtorScope — buildDebtorNoticePatchForKey', () => {
    it('updates maps and primary root fields when debtor is primary', () => {
        const file = baseFile();
        const patch = buildDebtorNoticePatchForKey(file, primaryKey, primaryKey, {
            notificationDate: '2026-06-01',
            absenceBadgeDismissed: true,
        });
        expect(patch.debtorNotificationDate).toBe('2026-06-01');
        expect(patch.debtor_absence_badge_dismissed).toBe(true);
        const dismissed = patch.debtor_absence_badge_dismissed_by_debtor as Record<string, boolean>;
        expect(dismissed[primaryKey]).toBe(true);
    });

    it('does not set notificationCount on notice patch', () => {
        const patch = buildDebtorNoticePatchForKey(baseFile(), primaryKey, primaryKey, {
            notificationDate: '2026-07-01',
        });
        expect(patch).not.toHaveProperty('notificationCount');
    });

    it('clears activeNoticeState in map and root when set to empty', () => {
        const file = baseFile({
            activeNoticeState: 'initial_notice',
            active_notice_state_by_debtor: { [primaryKey]: 'forced_attendance' },
        });
        const patch = buildDebtorNoticePatchForKey(file, primaryKey, primaryKey, {
            activeNoticeState: '',
        });
        const map = patch.active_notice_state_by_debtor as Record<string, string>;
        expect(map[primaryKey]).toBeUndefined();
        expect(patch.activeNoticeState).toBeNull();
    });
});

describe('noticeDebtorScope — notification count', () => {
    it('getDebtorNotificationCountForKey uses map then legacy for primary', () => {
        expect(
            getDebtorNotificationCountForKey(
                baseFile({ notification_count_by_debtor: { [primaryKey]: 2 } }),
                primaryKey,
                primaryKey
            )
        ).toBe(2);
        expect(getDebtorNotificationCountForKey(baseFile({ notificationCount: 3 }), primaryKey, primaryKey)).toBe(
            3
        );
        expect(getDebtorNotificationCountForKey(baseFile({ notificationCount: 3 }), extraKey, primaryKey)).toBe(0);
    });

    it('clamps negative and non-finite counts to >= 0', () => {
        expect(
            getDebtorNotificationCountForKey(
                baseFile({ notification_count_by_debtor: { [primaryKey]: -5 } }),
                primaryKey,
                primaryKey
            )
        ).toBe(0);
        expect(
            getDebtorNotificationCountForKey(
                baseFile({ notification_count_by_debtor: { [primaryKey]: NaN as unknown as number } }),
                primaryKey,
                primaryKey
            )
        ).toBe(0);
    });

    it('buildDebtorNotificationCountPatchForKey floors and rejects negatives', () => {
        const file = baseFile();
        const p = buildDebtorNotificationCountPatchForKey(file, primaryKey, primaryKey, -3.7);
        expect(p.notificationCount).toBe(0);
        expect((p.notification_count_by_debtor as Record<string, number>)[primaryKey]).toBe(0);
    });

    it('buildDebtorNotificationCountPatchForKey mirrors primary to root', () => {
        const file = baseFile({ notification_count_by_debtor: {} });
        const p = buildDebtorNotificationCountPatchForKey(file, primaryKey, primaryKey, 4);
        expect(p.notificationCount).toBe(4);
        expect((p.notification_count_by_debtor as Record<string, number>)[primaryKey]).toBe(4);
        const p2 = buildDebtorNotificationCountPatchForKey(file, extraKey, primaryKey, 1);
        expect(p2).not.toHaveProperty('notificationCount');
    });
});

describe('areDebtorSummonsMarkersEqual', () => {
    it('treats null pairs and identical refs as equal', () => {
        expect(areDebtorSummonsMarkersEqual(null, null)).toBe(true);
        const m = { id: '1', date: '2026-01-01', purpose: 'x' };
        expect(areDebtorSummonsMarkersEqual(m, m)).toBe(true);
    });

    it('compares fields', () => {
        expect(
            areDebtorSummonsMarkersEqual(
                { id: '1', date: '2026-01-01', purpose: 'a' },
                { id: '1', date: '2026-01-01', purpose: 'b' }
            )
        ).toBe(false);
    });
});

describe('noticeDebtorScope — summons marker', () => {
    it('getDebtorSummonsMarkerForKey scopes by debtor', () => {
        const marker = { id: 'm1', date: '2026-01-10', purpose: 'حضور' };
        const file = baseFile({
            debtor_summons_marker: marker,
            debtor_summons_marker_by_debtor: { [extraKey]: { id: 'm2', date: '2026-02-10', purpose: '' } },
        });
        expect(getDebtorSummonsMarkerForKey(file, primaryKey, primaryKey)).toEqual(marker);
        expect(getDebtorSummonsMarkerForKey(file, extraKey, primaryKey)).toEqual({
            id: 'm2',
            date: '2026-02-10',
            purpose: 'تبليغ',
        });
    });

    it('buildDebtorSummonsMarkerPatchForKey clears primary root when marker null', () => {
        const file = baseFile({
            debtor_summons_marker: { id: 'x', date: '2026-01-01', purpose: 'p' },
        });
        const patch = buildDebtorSummonsMarkerPatchForKey(file, primaryKey, primaryKey, null);
        expect(patch.debtor_summons_marker).toBeNull();
    });

    it('returns null when marker missing id or date', () => {
        expect(
            getDebtorSummonsMarkerForKey(
                baseFile({ debtor_summons_marker: { id: '', date: '2026-01-01', purpose: 'x' } as any }),
                primaryKey,
                primaryKey
            )
        ).toBeNull();
        expect(
            getDebtorSummonsMarkerForKey(
                baseFile({ debtor_summons_marker: { id: '1', date: '', purpose: 'x' } as any }),
                primaryKey,
                primaryKey
            )
        ).toBeNull();
    });
});

describe('noticeDebtorScope — isDebtorNotifiedForCoerciveActions', () => {
    it('returns false when debtor has no notification record', () => {
        expect(isDebtorNotifiedForCoerciveActions(baseFile(), primaryKey, primaryKey)).toBe(false);
    });

    it('returns true when notification date or memo anchor exists', () => {
        expect(
            isDebtorNotifiedForCoerciveActions(
                baseFile({ debtorNotificationDate: '2026-04-01' }),
                primaryKey,
                primaryKey,
            ),
        ).toBe(true);
        expect(
            isDebtorNotifiedForCoerciveActions(
                baseFile({ execution_memo_anchor_date: '2026-04-02' }),
                primaryKey,
                primaryKey,
            ),
        ).toBe(true);
    });

    it('returns true when summons marker or notification count is recorded', () => {
        expect(
            isDebtorNotifiedForCoerciveActions(
                baseFile({
                    debtor_summons_marker: { id: 's1', date: '2026-04-03', purpose: 'تبليغ' },
                }),
                primaryKey,
                primaryKey,
            ),
        ).toBe(true);
        expect(
            isDebtorNotifiedForCoerciveActions(
                baseFile({ notificationCount: 1 }),
                primaryKey,
                primaryKey,
            ),
        ).toBe(true);
    });
});
