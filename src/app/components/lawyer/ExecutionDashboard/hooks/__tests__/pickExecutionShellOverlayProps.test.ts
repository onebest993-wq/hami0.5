import { describe, expect, it } from 'vitest';
import { EXECUTION_SHELL_OVERLAY_PROP_KEYS } from '../executionShellOverlayPropKeys';
import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../../followupSnapshotFieldKeys';
import { pickExecutionFollowupModalSnapshotFields } from '../executionFollowupModalSnapshotFields';
import {
    assignExecutionShellOverlayScope,
    pickExecutionShellOverlayProps,
} from '../pickExecutionShellOverlayProps';

describe('pickExecutionShellOverlayProps', () => {
    it('picks only curated shell keys', () => {
        const sources = {
            showDocumentsModal: true,
            noise: 'ignored',
            LazyPoliceAssistanceDetailsModal: 'lazy-police',
        };
        const picked = pickExecutionShellOverlayProps(sources);
        expect(picked.showDocumentsModal).toBe(true);
        expect((picked as Record<string, unknown>).noise).toBeUndefined();
        expect((picked as Record<string, unknown>).PoliceAssistanceDetailsModal).toBe('lazy-police');
    });

    it('يحمل فجوة مصاريف التخلية دون مفاتيح محضر المتابعة', () => {
        const chipRef = { current: null };
        const picked = pickExecutionShellOverlayProps({
            showDocumentsModal: true,
            showEvictionExpenseModal: true,
            setShowEvictionExpenseModal: () => {},
            followupModalChipTablistRef: chipRef,
        });
        expect((picked as Record<string, unknown>).showEvictionExpenseModal).toBe(true);
        expect(typeof (picked as Record<string, unknown>).setShowEvictionExpenseModal).toBe('function');
        expect((picked as Record<string, unknown>).followupModalChipTablistRef).toBeUndefined();
    });

    it('تعبئة ref النوافذ لا تنسخ كيس المحضر', () => {
        const chipRef = { current: null };
        const target: Record<string, unknown> = {};
        assignExecutionShellOverlayScope(target, {
            showDocumentsModal: true,
            followupModalChipTablistRef: chipRef,
            unifiedModalTab: 'personal',
        });
        expect(target.showDocumentsModal).toBe(true);
        expect(target.followupModalChipTablistRef).toBeUndefined();
        expect(target.unifiedModalTab).toBeUndefined();
    });

    it('has no duplicate bogus component alias keys in registry', () => {
        const banned = [
            'GuarantorDetailsPostApprovalModal',
            'PartyDeathReportModal',
            'PremiumTimelineAuditLog',
            'StayOfExecutionModal',
            'PoliceAssistanceDetailsModal',
        ];
        for (const key of banned) {
            expect(EXECUTION_SHELL_OVERLAY_PROP_KEYS as readonly string[]).not.toContain(key);
        }
    });
});

describe('pickExecutionFollowupModalSnapshotFields', () => {
    it('picks only followup snapshot fields', () => {
        const fields = pickExecutionFollowupModalSnapshotFields({
            activeCoerciveActions: [],
            showToast: jestLikeFn(),
            extra: 'drop',
        });
        expect(fields.activeCoerciveActions).toEqual([]);
        expect(fields.showToast).toBeTypeOf('function');
        expect(fields.extra).toBeUndefined();
    });

    it('followup field registry is non-empty', () => {
        expect(EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS.length).toBeGreaterThan(100);
    });
});

function jestLikeFn() {
    return () => {};
}
