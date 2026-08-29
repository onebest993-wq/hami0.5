import { applyWifeSecurityHeaders } from '../security/wifeSecurityHeaders.ts';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '../../services/auth/legalTermsVersion.ts';

export function readTermsVersionFromBody(body: Record<string, unknown> | null | undefined): string {
    const raw = body?.termsVersion;
    return typeof raw === 'string' ? raw.trim() : '';
}

export function termsVersionRejectedResponse(version: string): Response | null {
    if (version === LEGAL_TERMS_ACCEPTANCE_VERSION) return null;
    return applyWifeSecurityHeaders(
        new Response(
            JSON.stringify({
                ok: false,
                error: 'يلزم الموافقة على الشروط والأحكام الحالية قبل المتابعة',
                code: 'TERMS_REQUIRED',
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
        ),
    );
}
