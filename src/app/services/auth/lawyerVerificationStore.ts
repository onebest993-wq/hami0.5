import {
    clearSecureJsonValue,
    readSecureJsonRaw,
    readSecureJsonRawSync,
    writeSecureJsonValue,
} from '@/app/services/storage/syncSecureJson';

/**
 * سجل تحقق محلي لطلب تسجيل المحامي (KYC خفيف).
 * الصور تُحفظ كـ data URL مضغوطة اختيارياً — الحجم محدود عمداً.
 */

export type LawyerVerificationStatus = 'guest' | 'pending' | 'active' | 'rejected';

export type LawyerRegistrationPayload = {
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    idFrontDataUrl: string | null;
    idBackDataUrl: string | null;
    faceSelfieDataUrl: string | null;
    faceAssistOptedIn: boolean;
};

export type LawyerVerificationRecord = {
    userId: string;
    status: Exclude<LawyerVerificationStatus, 'guest'>;
    submittedAt: string;
    updatedAt: string;
    rejectionReason?: string;
    payload: Omit<LawyerRegistrationPayload, never> & {
        /** لا نخزّن كلمة المرور */
        password?: undefined;
    };
};

export const LAWYER_VERIFICATION_STORE_KEY = 'hami:auth:lawyer-verification:v1';
const CHANGE_EVENT = 'hami:lawyer-verification-changed';
const MAX_IMAGE_CHARS = 420_000;

type StoreShape = Record<string, LawyerVerificationRecord>;

let verificationUiReadyUserId: string | null = null;
let verificationHydrateStarted = false;

function emitLawyerVerificationStoreChange(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function scheduleLawyerVerificationHydrate(): void {
    if (verificationHydrateStarted || typeof window === 'undefined') return;
    verificationHydrateStarted = true;
    void readSecureJsonRaw(LAWYER_VERIFICATION_STORE_KEY).then((raw) => {
        if (!raw?.trim()) return;
        emitLawyerVerificationStoreChange();
    });
}

export function markLawyerVerificationUiReady(userId: string): void {
    const id = userId.trim();
    if (!id) return;
    verificationUiReadyUserId = id;
    emitLawyerVerificationStoreChange();
}

export function isLawyerVerificationUiReady(userId: string | null | undefined): boolean {
    const id = userId?.trim();
    return Boolean(id) && verificationUiReadyUserId === id;
}

export function resetLawyerVerificationUiReadyForTests(): void {
    verificationUiReadyUserId = null;
}

export function resetLawyerVerificationStoreForTests(): void {
    verificationHydrateStarted = false;
    verificationUiReadyUserId = null;
    clearSecureJsonValue(LAWYER_VERIFICATION_STORE_KEY);
}

export function subscribeLawyerVerificationStore(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    scheduleLawyerVerificationHydrate();
    const onStorage = (event: StorageEvent) => {
        if (event.key === LAWYER_VERIFICATION_STORE_KEY || event.key === null) onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener('storage', onStorage);
    };
}

function parseStore(raw: string | null): StoreShape {
    if (!raw?.trim()) return {};
    try {
        const parsed = JSON.parse(raw) as StoreShape;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function readStore(): StoreShape {
    if (typeof window === 'undefined') return {};
    const fromSync = parseStore(readSecureJsonRawSync(LAWYER_VERIFICATION_STORE_KEY));
    if (Object.keys(fromSync).length === 0) scheduleLawyerVerificationHydrate();
    return fromSync;
}

function slimStoreWithoutImages(next: StoreShape): StoreShape {
    const slim: StoreShape = {};
    for (const [id, rec] of Object.entries(next)) {
        slim[id] = {
            ...rec,
            payload: {
                ...rec.payload,
                idFrontDataUrl: rec.payload.idFrontDataUrl ? '[omitted]' : null,
                idBackDataUrl: rec.payload.idBackDataUrl ? '[omitted]' : null,
                faceSelfieDataUrl: rec.payload.faceSelfieDataUrl ? '[omitted]' : null,
            },
        };
    }
    return slim;
}

function writeStore(next: StoreShape): void {
    if (typeof window === 'undefined') return;
    try {
        if (Object.keys(next).length === 0) {
            clearSecureJsonValue(LAWYER_VERIFICATION_STORE_KEY);
        } else {
            writeSecureJsonValue(LAWYER_VERIFICATION_STORE_KEY, next);
        }
    } catch {
        try {
            writeSecureJsonValue(LAWYER_VERIFICATION_STORE_KEY, slimStoreWithoutImages(next));
        } catch {
            /* ignore */
        }
    }
    emitLawyerVerificationStoreChange();
}

export function truncateImageDataUrl(dataUrl: string | null): string | null {
    if (!dataUrl) return null;
    if (dataUrl.length <= MAX_IMAGE_CHARS) return dataUrl;
    return dataUrl.slice(0, MAX_IMAGE_CHARS);
}

export function readLawyerVerificationRecord(
    userId: string | null | undefined,
): LawyerVerificationRecord | null {
    const id = userId?.trim();
    if (!id) return null;
    return readStore()[id] ?? null;
}

export function writeLawyerVerificationPending(
    userId: string,
    payload: LawyerRegistrationPayload,
): LawyerVerificationRecord {
    const now = new Date().toISOString();
    const existing = readLawyerVerificationRecord(userId);
    const record: LawyerVerificationRecord = {
        userId,
        status: 'pending',
        submittedAt: existing?.submittedAt ?? now,
        updatedAt: now,
        payload: {
            email: payload.email.trim(),
            fullName: payload.fullName.trim(),
            familyName: payload.familyName.trim(),
            phone: payload.phone.trim(),
            governorate: payload.governorate,
            lawyerBarRoom: payload.lawyerBarRoom,
            idFrontDataUrl: truncateImageDataUrl(payload.idFrontDataUrl),
            idBackDataUrl: truncateImageDataUrl(payload.idBackDataUrl),
            faceSelfieDataUrl: truncateImageDataUrl(payload.faceSelfieDataUrl),
            faceAssistOptedIn: payload.faceAssistOptedIn,
        },
    };
    const store = readStore();
    store[userId] = record;
    writeStore(store);
    return record;
}

export function setLawyerVerificationStatus(
    userId: string,
    status: 'pending' | 'active' | 'rejected',
    rejectionReason?: string,
): LawyerVerificationRecord | null {
    const store = readStore();
    const existing = store[userId];
    if (!existing) return null;
    const next: LawyerVerificationRecord = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
        rejectionReason: status === 'rejected' ? rejectionReason ?? existing.rejectionReason : undefined,
    };
    store[userId] = next;
    writeStore(store);
    return next;
}

/** مزامنة حالة التوثيق من الخادم — ينشئ سجلاً محلياً خفيفاً إن لم يوجد */
export function applyLawyerVerificationStatusFromServer(
    userId: string,
    status: 'pending' | 'active' | 'rejected',
    rejectionReason?: string,
): LawyerVerificationRecord {
    const existing = readLawyerVerificationRecord(userId);
    if (existing) {
        const updated = setLawyerVerificationStatus(userId, status, rejectionReason);
        return updated ?? existing;
    }
    const now = new Date().toISOString();
    const record: LawyerVerificationRecord = {
        userId,
        status,
        submittedAt: now,
        updatedAt: now,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        payload: {
            email: '',
            fullName: '',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        },
    };
    const store = readStore();
    store[userId] = record;
    writeStore(store);
    return record;
}

export function clearLawyerVerificationRecord(userId: string): void {
    const store = readStore();
    if (!store[userId]) return;
    delete store[userId];
    writeStore(store);
}

export function listLawyerVerificationRecords(): LawyerVerificationRecord[] {
    return Object.values(readStore());
}
