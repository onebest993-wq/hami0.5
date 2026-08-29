import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import {
    toDisplayNamePolicy,
    type DisplayNamePolicy,
} from '@/app/domain/profile/displayNameCorrection';

export class DisplayNameCorrectionError extends Error {
    readonly code: 'used' | 'invalid' | 'network';
    constructor(message: string, code: 'used' | 'invalid' | 'network') {
        super(message);
        this.name = 'DisplayNameCorrectionError';
        this.code = code;
    }
}

function asPolicy(raw: unknown): DisplayNamePolicy | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const rec = raw as Record<string, unknown>;
    if (rec.ok === false) return null;
    return toDisplayNamePolicy({
        fullName: String(rec.fullName ?? ''),
        previousFullName: rec.previousFullName == null ? null : String(rec.previousFullName),
        correctedAt: rec.correctedAt == null ? null : String(rec.correctedAt),
        corrections: rec.correctionUsed === true || rec.canCorrect === false ? 1 : 0,
    });
}

export async function fetchOwnDisplayNamePolicy(): Promise<DisplayNamePolicy | null> {
    try {
        const data = await SecureAPIClient.fetchSecure<unknown>('/api/auth/display-name', { method: 'GET' });
        return asPolicy(data);
    } catch {
        return null;
    }
}

export async function submitDisplayNameCorrection(fullName: string): Promise<DisplayNamePolicy> {
    try {
        const data = await SecureAPIClient.fetchSecure<unknown>('/api/auth/display-name', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName }),
        });
        const policy = asPolicy(data);
        if (!policy) {
            throw new DisplayNameCorrectionError('تعذّر حفظ الاسم', 'network');
        }
        return policy;
    } catch (error) {
        if (error instanceof DisplayNameCorrectionError) throw error;
        if (error instanceof SecureFetchError && error.status === 409) {
            throw new DisplayNameCorrectionError('يمكن تصحيح الاسم مرة واحدة فقط', 'used');
        }
        if (error instanceof SecureFetchError && error.status === 400) {
            throw new DisplayNameCorrectionError('الاسم الثلاثي مطلوب', 'invalid');
        }
        throw new DisplayNameCorrectionError('تعذّر حفظ الاسم', 'network');
    }
}
