import { noteHqAuditRecorded } from '@/app/components/admin/hqAuditClient';
import { isHqStepUpRequired, promptHqStepUp } from '@/app/components/admin/hqStepUpClient';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';

async function fetchNoted<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const data = await SecureAPIClient.fetchSecure<T>(endpoint, options);
    noteHqAuditRecorded(data);
    return data;
}

/** جلب طفرة مقر: إن طُلب رمز تحقق جديد يفتح الغطاء ثم يعيد المحاولة مرة واحدة. */
export async function hqMutatingFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
        return await fetchNoted<T>(endpoint, options);
    } catch (error) {
        if (!isHqStepUpRequired(error)) throw error;
        await promptHqStepUp();
        return await fetchNoted<T>(endpoint, options);
    }
}
