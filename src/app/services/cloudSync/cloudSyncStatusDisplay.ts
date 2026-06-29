export type CloudSyncStatusMessageInput = {
    localOnlyMode: boolean;
    cloudSyncEnabled: boolean;
    anyBucketEnabled: boolean;
    cloudBuildEnabled: boolean;
    signedIn: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: number | null;
    lastError: string | null;
    now?: Date;
};

export type CloudSyncStatusMessage = {
    text: string;
    tone: 'muted' | 'active' | 'success' | 'warning' | 'error';
    canSyncNow: boolean;
};

export function formatRelativeTimeAr(fromMs: number, nowMs: number): string {
    const diffSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
    if (diffSec < 45) return 'الآن';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    const diffDay = Math.floor(diffHr / 24);
    return `منذ ${diffDay} يوم`;
}

export function resolveCloudSyncStatusMessage(input: CloudSyncStatusMessageInput): CloudSyncStatusMessage {
    const now = input.now ?? new Date();

    if (input.localOnlyMode) {
        return {
            text: 'متوقفة — وضع قطع الاتصال مفعّل',
            tone: 'warning',
            canSyncNow: false,
        };
    }

    if (!input.cloudSyncEnabled) {
        return {
            text: 'متوقفة — المزامنة السحابية معطّلة',
            tone: 'muted',
            canSyncNow: false,
        };
    }

    if (!input.cloudBuildEnabled) {
        return {
            text: 'غير متاحة في هذا الإصدار',
            tone: 'muted',
            canSyncNow: false,
        };
    }

    if (!input.signedIn) {
        return {
            text: 'متوقفة — غير مسجّل الدخول',
            tone: 'warning',
            canSyncNow: false,
        };
    }

    if (!input.isOnline) {
        return {
            text: 'متوقفة — لا اتصال بالإنترنت',
            tone: 'warning',
            canSyncNow: false,
        };
    }

    if (!input.anyBucketEnabled) {
        return {
            text: 'متوقفة — لا مجالات مزامنة مفعّلة',
            tone: 'muted',
            canSyncNow: false,
        };
    }

    if (input.isSyncing) {
        return {
            text: 'جاري المزامنة...',
            tone: 'active',
            canSyncNow: false,
        };
    }

    if (input.lastError) {
        const short = input.lastError.length > 48 ? `${input.lastError.slice(0, 45)}…` : input.lastError;
        return {
            text: `فشلت — ${short}`,
            tone: 'error',
            canSyncNow: true,
        };
    }

    if (input.lastSyncTime) {
        return {
            text: `آخر مزامنة: ${formatRelativeTimeAr(input.lastSyncTime, now.getTime())}`,
            tone: 'success',
            canSyncNow: true,
        };
    }

    return {
        text: 'لم تُنفَّذ مزامنة بعد — اضغط «مزامنة الآن»',
        tone: 'muted',
        canSyncNow: true,
    };
}

export function isCloudSyncBuildEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';
}
