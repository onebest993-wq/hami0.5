import type { NotificationCategory, NotificationModel, NotificationType } from '@/app/infrastructure/NotificationRepository';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const DOSSIER_NOISE_LABELS = new Set([
    'تنفيذ',
    'جزائي',
    'جزائية',
    'مدني',
    'مدنية',
    'معاملة',
    'تنفيذي',
    'تنفيذية',
    '—',
    '-',
]);

const ENGLISH_TOKEN_MAP: Record<string, string> = {
    active: 'نشطة',
    paused: 'معلّقة',
    finished: 'منتهية',
    closed: 'مغلقة',
    open: 'مفتوحة',
    off: 'إيقاف',
    on: 'تشغيل',
    debtor: 'المدين',
    guarantor: 'الكفيل',
    publication: 'تبليغ بالنشر',
    mal: 'حجز مال',
    aqar: 'حجز عقار',
    manqul: 'حجز منقول',
    'ladaal-ghair': 'حجز لدى الغير',
    incoming: 'وارد',
    outgoing: 'صادر',
};

export function isUuidLike(value: unknown): boolean {
    return UUID_RE.test(String(value ?? '').trim());
}

function normalizeArabicToken(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

export function isTechnicalNotificationToken(value: unknown): boolean {
    const v = String(value ?? '').trim();
    if (!v) return true;
    if (isUuidLike(v)) return true;
    if (/^(case|crim|criminal|exe|execution|e|q|n|task|persist|body|note|doc)-[\w-]+$/i.test(v)) {
        return true;
    }
    if (/^#?\d{6,}$/.test(v)) return true;
    return false;
}

export function isNoiseDossierLabel(value: unknown, module?: string): boolean {
    const v = String(value ?? '').trim();
    if (!v) return true;
    if (isTechnicalNotificationToken(v)) return true;
    const norm = normalizeArabicToken(v);
    if (DOSSIER_NOISE_LABELS.has(norm)) return true;
    if (module) {
        const moduleNorm = normalizeArabicToken(
            (
                {
                    civil: 'مدنية',
                    personal: 'أحوال شخصية',
                    criminal: 'جزائية',
                    execution: 'تنفيذ',
                    threading: 'معاملة',
                } as Record<string, string>
            )[module] ?? '',
        );
        if (norm === moduleNorm) return true;
    }
    return false;
}

export function stripTechnicalTokensFromMessage(message: string): string {
    return String(message ?? '')
        .replace(UUID_IN_TEXT, '')
        .replace(/\b(case|crim|criminal|exe|execution|task|note|doc)-[\w-]+\b/gi, '')
        .replace(/\s*(?:[—•·|→]\s*){2,}/g, ' — ')
        .replace(/^\s*[—•·|→]\s*|\s*[—•·|→]\s*$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function translateKnownEnglishTokens(message: string): string {
    return message.replace(/\b([a-z][a-z0-9_-]*)\b/gi, (match) => {
        const mapped = ENGLISH_TOKEN_MAP[match.toLowerCase()];
        return mapped ?? match;
    });
}

export function formatAuditCaseReference(p: {
    caseNo?: string | null;
    clientName?: string | null;
    fileNumber?: string | null;
    module?: string;
    fallback?: string;
}): string {
    const parts: string[] = [];
    for (const raw of [p.caseNo, p.fileNumber, p.clientName]) {
        const v = String(raw ?? '').trim();
        if (!v || isNoiseDossierLabel(v, p.module)) continue;
        if (parts.some((existing) => normalizeArabicToken(existing) === normalizeArabicToken(v))) {
            continue;
        }
        parts.push(v);
    }
    if (parts.length > 0) return parts.join(' — ');
    return p.fallback ?? 'إضبارة مسجّلة';
}

export function buildAuditActivityMessage(p: {
    caseNo?: string | null;
    clientName?: string | null;
    fileNumber?: string | null;
    detail: string;
    module?: string;
}): string {
    const detail = String(p.detail ?? '').trim();
    const ref = formatAuditCaseReference({
        caseNo: p.caseNo,
        fileNumber: p.fileNumber,
        clientName: p.clientName,
        module: p.module,
        fallback: '',
    });
    if (ref && detail && !detail.includes(ref)) return `${ref} • ${detail}`;
    return detail || ref || 'إجراء في الإضبارة';
}

/** تنقّلات واجهة لا تُعرض في سجل النشاطات (فتح/إغلاق إضبارة، ...). */
export function isNavigationNoiseNotification(
    notification: Pick<NotificationModel, 'title' | 'message' | 'actionPayload'>,
): boolean {
    const title = String(notification.title ?? '').trim();
    if (/^فتح\s+إضبارة/i.test(title)) return true;
    const payload = notification.actionPayload;
    if (payload && typeof payload === 'object') {
        const module = String((payload as { module?: string }).module ?? '').trim();
        const entityId = (payload as { entityId?: unknown }).entityId;
        if (module && entityId != null && /^فتح/i.test(title)) return true;
    }
    const message = String(notification.message ?? '').trim();
    if (/^فتح\s+إضبارة/i.test(message)) return true;
    if (message === 'تم فتح الإضبارة' && /^فتح/i.test(title)) return true;
    return false;
}

export function formatNotificationForCard(
    notification: NotificationModel,
): { eventTitle: string; caseRef: string | null; detailLine: string } {
    if (isNavigationNoiseNotification(notification)) {
        return { eventTitle: '', caseRef: null, detailLine: '' };
    }

    const payload = notification.actionPayload ?? {};
    const payloadCaseNo = String(
        (payload as { caseNo?: string }).caseNo ??
            (payload as { caseNumber?: string }).caseNumber ??
            '',
    ).trim();
    const payloadClient = String((payload as { clientName?: string }).clientName ?? '').trim();
    const payloadDetail = String((payload as { detail?: string }).detail ?? '').trim();

    const message = sanitizeNotificationDisplayMessage(notification);
    const segments = message.split(/\s*•\s*/).map((s) => s.trim()).filter(Boolean);

    let caseRef: string | null = null;
    let detailLine = message;

    if (segments.length >= 2) {
        caseRef = segments[0] ?? null;
        detailLine = segments.slice(1).join(' • ');
    } else if (payloadCaseNo && !isTechnicalNotificationToken(payloadCaseNo)) {
        caseRef = formatAuditCaseReference({
            caseNo: payloadCaseNo,
            clientName: payloadClient || undefined,
            module:
                notification.category === 'criminal'
                    ? 'criminal'
                    : notification.category === 'execution'
                      ? 'execution'
                      : undefined,
        });
        detailLine = payloadDetail || segments[0] || message;
        if (caseRef && detailLine === caseRef) detailLine = payloadDetail || notification.title;
    } else {
        detailLine = payloadDetail || segments[0] || message;
    }

    if (caseRef && detailLine.startsWith(`${caseRef} •`)) {
        detailLine = detailLine.slice(caseRef.length + 2).trim();
    }

    return {
        eventTitle: String(notification.title ?? '').trim() || 'نشاط مسجّل',
        caseRef: caseRef && !isTechnicalNotificationToken(caseRef) ? caseRef : null,
        detailLine: detailLine || String(notification.title ?? '').trim(),
    };
}

function inferFallbackMessage(input: {
    title?: string;
    category?: NotificationCategory;
    type?: NotificationType;
}): string {
    const title = String(input.title ?? '').trim();
    if (title.includes('فتح إضبارة')) return '';
    if (title.includes('إنشاء')) return title;
    if (title.includes('تم ')) return title;
    switch (input.category) {
        case 'criminal':
            return 'نشاط جزائي';
        case 'execution':
            return 'نشاط تنفيذي';
        case 'civil':
            return 'نشاط مدني';
        case 'task':
            return 'نشاط في المعاملات';
        case 'forum':
            return 'نشاط في المنتدى';
        case 'document':
            return 'نشاط في المستندات';
        case 'system':
            return 'تنبيه نظام';
        default:
            return title || 'نشاط مسجّل';
    }
}

export function sanitizeNotificationDisplayMessage(
    notification: Pick<NotificationModel, 'message' | 'title' | 'category' | 'type'>,
): string {
    let message = stripTechnicalTokensFromMessage(String(notification.message ?? '').trim());
    message = translateKnownEnglishTokens(message);

    if (!message || isTechnicalNotificationToken(message) || message === 'قضية') {
        return inferFallbackMessage(notification);
    }

    if (/^قضية\s*[—•·|→]?\s*$/i.test(message)) {
        return inferFallbackMessage(notification);
    }

    return message;
}
