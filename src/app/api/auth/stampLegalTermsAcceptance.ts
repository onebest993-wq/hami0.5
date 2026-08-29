import { getGoTrueAdminApi, getSupabaseAdminClient } from '../security/supabaseAdminClient.ts';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '../../services/auth/legalTermsVersion.ts';

/**
 * يخزّن قبول الشروط في app_metadata (غير قابل للتعديل من العميل).
 * أفضل جهد — لا يُفشل الدخول إن تعذّر العميل الإداري.
 */
export async function stampLegalTermsAcceptance(userId: string): Promise<void> {
    const id = userId.trim();
    if (!id) return;
    const admin = getSupabaseAdminClient();
    if (!admin) return;
    try {
        await getGoTrueAdminApi(admin).updateUserById(id, {
            app_metadata: {
                legalTermsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION,
                legalTermsAcceptedAt: new Date().toISOString(),
            },
        });
    } catch {
        /* لا نمنع الجلسة إن تعذّر الختم */
    }
}
