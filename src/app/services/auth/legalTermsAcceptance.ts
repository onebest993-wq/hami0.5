/**
 * قبول الشروط والأحكام — إلزامي قبل التسجيل/الدخول/الضيف أو فتح اللوحة بجلسة. الترتيب: اختيار المسار أولاً ثم الوثيقة كاملة.
 * النسخة تُبطِل القبول القديم عند تحديث الوثيقة القانونية.
 */

import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion';

export { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion';

const ACCEPT_KEY = 'hami:legal:terms-accepted:v1';
const ACCEPT_COOKIE = 'hami_legal_terms_accepted';

export type LegalTermsAcceptanceRecord = {
    version: string;
    acceptedAt: string;
};

function canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readCookieVersion(): string | null {
    if (typeof document === 'undefined') return null;
    try {
        const match = document.cookie
            .split(';')
            .map((p) => p.trim())
            .find((p) => p.startsWith(`${ACCEPT_COOKIE}=`));
        if (!match) return null;
        const value = decodeURIComponent(match.slice(ACCEPT_COOKIE.length + 1)).trim();
        return value || null;
    } catch {
        return null;
    }
}

function writeCookieVersion(version: string | null): void {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = version
            ? `${ACCEPT_COOKIE}=${encodeURIComponent(version)}; path=/; max-age=31536000; SameSite=Lax`
            : `${ACCEPT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
        /* ignore */
    }
}

function parseRecord(raw: string | null): LegalTermsAcceptanceRecord | null {
    if (!raw) return null;
    try {
        const data = JSON.parse(raw) as LegalTermsAcceptanceRecord;
        if (typeof data?.version !== 'string' || typeof data?.acceptedAt !== 'string') return null;
        return data;
    } catch {
        return null;
    }
}

export function readLegalTermsAcceptance(): LegalTermsAcceptanceRecord | null {
    if (canUseStorage()) {
        try {
            const fromStore = parseRecord(window.localStorage.getItem(ACCEPT_KEY));
            if (fromStore) return fromStore;
        } catch {
            /* ignore */
        }
    }
    const cookieVersion = readCookieVersion();
    if (!cookieVersion) return null;
    return { version: cookieVersion, acceptedAt: '' };
}

/** E2E / shell bypass — لا تُحجب الشروط في مسار القياس */
export function isLegalTermsGateRequired(): boolean {
    if (isShellAuthBypassed()) return false;
    return !hasAcceptedCurrentLegalTerms();
}

export function hasAcceptedCurrentLegalTerms(): boolean {
    const record = readLegalTermsAcceptance();
    if (!record) return false;
    if (record.version !== LEGAL_TERMS_ACCEPTANCE_VERSION) return false;
    return true;
}

function persistLegalTermsRecord(record: LegalTermsAcceptanceRecord): void {
    if (canUseStorage()) {
        try {
            window.localStorage.setItem(ACCEPT_KEY, JSON.stringify(record));
        } catch {
            /* ignore quota */
        }
    }
    writeCookieVersion(record.version);
}

export function markLegalTermsAccepted(now = new Date()): LegalTermsAcceptanceRecord {
    const record: LegalTermsAcceptanceRecord = {
        version: LEGAL_TERMS_ACCEPTANCE_VERSION,
        acceptedAt: now.toISOString(),
    };
    persistLegalTermsRecord(record);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hami:legal-terms-accepted'));
    }
    return record;
}

/** لقطة قبل localStorage.clear — موافقة الجهاز ليست بيانات حساب */
export function captureLegalTermsAcceptance(): LegalTermsAcceptanceRecord | null {
    const record = readLegalTermsAcceptance();
    if (!record || record.version !== LEGAL_TERMS_ACCEPTANCE_VERSION) return null;
    return {
        version: record.version,
        acceptedAt: record.acceptedAt || new Date().toISOString(),
    };
}

export function restoreLegalTermsAcceptance(record: LegalTermsAcceptanceRecord | null): void {
    if (!record || record.version !== LEGAL_TERMS_ACCEPTANCE_VERSION) return;
    persistLegalTermsRecord({
        version: record.version,
        acceptedAt: record.acceptedAt || new Date().toISOString(),
    });
}

export function clearLegalTermsAcceptance(): void {
    if (canUseStorage()) {
        try {
            window.localStorage.removeItem(ACCEPT_KEY);
        } catch {
            /* ignore */
        }
    }
    writeCookieVersion(null);
}

/** يُستدعى من مسارات الدخول لمنع أي ثغرة برمجية */
export function assertLegalTermsAcceptedOrThrow(): void {
    if (isShellAuthBypassed()) return;
    if (hasAcceptedCurrentLegalTerms()) return;
    throw new Error('يلزم الموافقة على الشروط والأحكام وسياسة الاستخدام والخصوصية قبل المتابعة');
}
