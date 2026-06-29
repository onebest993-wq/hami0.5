import { SecureFetchError } from '@/app/services/SecureAPIClient';

/** أخطاء BFF متوقعة في التطوير أو بدون جلسة — لا تُلوّث الكونسول */
export function isBenignSecureFetchError(error: unknown): boolean {
    if (!(error instanceof SecureFetchError)) return false;
    return (
        error.message === 'api_unavailable' ||
        error.message === 'unauthenticated' ||
        error.status === 503 ||
        error.status === 401
    );
}
