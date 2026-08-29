import { SmartToast } from '@/app/components/ui/SmartToast';
import { HQ_AUDIT_MISS_MESSAGE } from '@/app/domain/admin/hqStepUp';

/** ينبّه المشغّل فقط عندما يصرّح الخادم أن الإجراء نجح والسجل لم يُكتب. */
export function noteHqAuditRecorded(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    if ((data as { auditRecorded?: unknown }).auditRecorded === false) {
        SmartToast.warning(HQ_AUDIT_MISS_MESSAGE);
    }
}
