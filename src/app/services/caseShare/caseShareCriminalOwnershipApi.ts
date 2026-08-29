import { SecureAPIClient } from '@/app/services/SecureAPIClient';

type ApiOk = { ok: true; dossierId?: string };

/**
 * يسجّل إثبات ملكية جزائية على الخادم (بعد تحقق محلي من criminalStore).
 * مطلوب قبل CaseShare create عبر API للوحدة criminal.
 */
export async function registerCriminalCaseOwnershipOnServer(dossierId: string): Promise<void> {
    const id = String(dossierId ?? '').trim();
    if (!id) throw new Error('DOSSIER_ID_REQUIRED');
    const res = await SecureAPIClient.fetchSecure<ApiOk>('/api/case-share/criminal-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', dossierId: id }),
    });
    if (!res?.ok) throw new Error('CRIMINAL_OWNERSHIP_REGISTER_FAILED');
}

/** إلغاء إثبات الملكية بعد حذف الإضبارة — best-effort */
export async function unregisterCriminalCaseOwnershipOnServer(dossierId: string): Promise<void> {
    const id = String(dossierId ?? '').trim();
    if (!id) return;
    try {
        await SecureAPIClient.fetchSecure<ApiOk>('/api/case-share/criminal-ownership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unregister', dossierId: id }),
        });
    } catch {
        /* ignore — الحذف المحلي والـ revoke يبقيان المصدر */
    }
}

export function scheduleUnregisterCriminalCaseOwnership(dossierId: string | number): void {
    void unregisterCriminalCaseOwnershipOnServer(String(dossierId)).catch(() => undefined);
}
