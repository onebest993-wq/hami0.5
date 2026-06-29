import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';

/** واجهة no-op — تحافظ على call sites دون تنفيذ (سجل النشاطات مُلغى). */
export type DisabledAuditHandler = (...args: unknown[]) => NotificationModel | null;

export function createDisabledAuditDomain(): Record<string, DisabledAuditHandler> {
    return new Proxy(
        {},
        {
            get: () => () => null,
        },
    );
}
