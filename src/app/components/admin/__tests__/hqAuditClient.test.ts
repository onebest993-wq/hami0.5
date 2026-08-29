import { describe, expect, it, vi } from 'vitest';
import { HQ_AUDIT_MISS_MESSAGE } from '@/app/domain/admin/hqStepUp';

const warning = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { warning: (...a: unknown[]) => warning(...a) },
}));

import { noteHqAuditRecorded } from '../hqAuditClient';

describe('noteHqAuditRecorded', () => {
    it('ينبّه فقط عند auditRecorded=false', () => {
        warning.mockReset();
        noteHqAuditRecorded({ ok: true });
        noteHqAuditRecorded({ ok: true, auditRecorded: true });
        noteHqAuditRecorded(null);
        expect(warning).not.toHaveBeenCalled();
        noteHqAuditRecorded({ ok: true, auditRecorded: false });
        expect(warning).toHaveBeenCalledWith(HQ_AUDIT_MISS_MESSAGE);
    });
});
