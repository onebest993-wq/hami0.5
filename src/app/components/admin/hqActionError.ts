import { SecureFetchError } from '@/app/services/SecureFetchError';

export function hqActionErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof SecureFetchError) {
        if (error.status === 429) return 'تجاوزت حد عمليات المقر — حاول لاحقاً';
        try {
            const parsed = JSON.parse(error.bodyText) as { error?: unknown };
            const msg = String(parsed.error ?? '').trim();
            if (msg) return msg;
        } catch {
            /* نص غير JSON */
        }
    }
    return fallback;
}
