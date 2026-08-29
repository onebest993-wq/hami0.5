/**
 * مكتشف التواريخ الشامل (Universal Date Sniffer):
 * يمشّط بنية إضبارة كاملة (دعوى/تنفيذ/جزائي/معاملة/Threading)
 * ويُخرج كل تاريخ موجود في **أي حاوية أو حاوية فرعية**
 * لم يُغطَّ صراحةً عبر القواعد المعروفة (CALENDAR_SYNC_RULES).
 *
 * الهدف: ضمان أن أي تاريخ يُدخله المحامي في أي مكان من التطبيق
 * يُربط بالتقويم تلقائياً مع مصدره — حتى لو كان في حقل جديد لم يُدرج في القواعد بعد.
 *
 * - معرّف الجسر الناتج يبدأ بـ `field_` حتى لا يتعارض مع المعرّفات الصناعية.
 * - تواريخ النظام (createdAt / updatedAt / trashedAt …) مستبعَدة.
 * - المسارات الكنسية (timeline[]، tasks[]، trials[]، steps[] …) مستبعَدة لأنها مزامنة صراحةً.
 */
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';
import type { CalendarSourceModule } from './calendarBridge.types';
import type { CalendarEventType } from '@/app/services/calendar/calendarTypes';

export type DiscoveredDate = {
    bridgeEventId: string;
    dateYmd: string;
    title: string;
    type: CalendarEventType;
    pathLabel: string;
    notes?: string;
};

/** مفاتيح ميتا أو حقول مولّدة آلياً — لا تُربط بالتقويم */
const META_KEYS = new Set<string>([
    'createdAt', 'updatedAt', 'modifiedAt', 'deletedAt', 'archivedAt',
    'trashedAt', 'completedAt', 'syncedAt', 'lastSeenAt', 'lastModified',
    'startedAt', 'endedAt', 'lockedAt', 'pinnedAt', 'tombstonedAt',
    'capturedAt', 'restoredAt', 'lastBackupAt', 'lastUpdatedAt',
    'birthDate', 'birthdate', 'dateOfBirth',
    'createdDate', 'createdOn', 'updatedOn',
    'dueAt', 'reminderAt', 'parsedDate',
    'apptDate',
    'isCompletedAt',
    'mergedAt',
    'reviewedAt',
    // — مفاتيح سجل تاريخي / audit history (تواريخ ماضية لتسجيل تغيير، ليست مواعيد قادمة) —
    'changedAtDate', 'changedAt', 'changedOn', 'changedDate',
    'appliedAtDate', 'appliedAt', 'appliedDate',
    'recordedAt', 'recordedDate', 'recordedAtDate',
    'loggedAt', 'loggedDate', 'loggedAtDate',
    'enteredAt', 'enteredDate',
    'savedAt', 'savedDate',
    'snapshotAt', 'snapshotDate',
    'auditAt', 'auditDate',
    'historyDate', 'historyAt',
    'observationAt', 'observationDate',
    'submittedAt', // (الكنسي submittedDate لو وُجد قد يبقى)
    'issuedAt', // (issuedDate قد يكون مقصوداً للتقويم في verdicts الكنسية)
]);

/** المسارات الكنسية المعروفة (مزامَنة صراحةً) — يتجنّبها المكتشف لتفادي التكرار */
const CANONICAL_PATH_PATTERNS: RegExp[] = [
    /^stages\.\d+\.timeline\.\d+\.date$/,
    /^stages\.\d+\.tasks\.\d+\.dueDate$/,
    /^tasks\.\d+\.dueDate$/,
    /^history\.\d+\.date$/,
    /^notes\.\d+\.apptDate$/,
    /^nextDate$/,
    /^firstHearingDate$/,
    /^stayReviewDate$/,
    /^timelineEvents\.\d+\.date$/,
    /^timelineEvents\.\d+\.nextDate$/,
    /^caseTasksPending\.\d+\.dueDate$/,
    /^trials\.\d+\.date$/,
    /^trials\.\d+\.nextSessionDate$/,
    /^location\.nextHearingDate$/,
    /^hearings\.\d+\.sessionDate$/,
    /^hearings\.\d+\.nextSessionDate$/,
    /^(sessionDate|deadlineDate|notificationDate|grievanceSessionDate|grievanceFirstHearingDate|phase2FirstHearingDate)$/,
    /^steps\.\d+\.appointmentDate$/,
];

/** مفاتيح يجب تجاهلها كلياً مهما كان مسارها (مثلاً حقول بيانات شخصية) */
const STRUCTURAL_SKIP_KEYS = new Set<string>([
    'id', 'userId', 'ownerId', 'lawyerId', 'caseId', 'fileId',
    'avatar', 'avatarUrl', 'photo', 'photoUrl', 'imageUrl',
    'phone', 'phoneNumber', 'mobile', 'email',
    'address', 'postalCode', 'iban', 'accountNumber',
]);

/** هل المفتاح يُشير إلى حقل تاريخ ذي صلة بالتقويم؟ */
function isCalendarRelevantKey(key: string): boolean {
    if (META_KEYS.has(key)) return false;
    if (STRUCTURAL_SKIP_KEYS.has(key)) return false;

    // 1) أي مفتاح ينتهي بـ Date / Deadline (CamelCase)
    if (/[a-z][A-Z]?Date$/.test(key)) return true;
    if (/Deadline$/.test(key)) return true;
    if (/[Dd]ueDate$/.test(key)) return true;

    // 2) مفتاح اسمه بالضبط 'date' داخل حاوية ذات سياق إضباري معقول
    if (key === 'date') return true;

    // 3) مفاتيح زمنية متخصّصة معروفة
    if (/^(when|on|at)$/.test(key)) return false; // مبهمة، نتجنّبها

    // 4) مفاتيح تنتهي بسلوكيات زمنية واضحة
    if (/(SessionDate|HearingDate|AppointmentDate|FilingDate|DecisionDate|VerdictDate|AppealDate|ReviewDate|NotificationDate|ServiceDate|AdjournmentDate|ExpiryDate|ReminderDate|StayDate|ObjectionDate|RequestDate|TransferDate|ConsolidationDate|ResignationDate|DepositDate|SignedDate|PaymentDate|ExecutionDate)$/.test(key)) {
        return true;
    }

    return false;
}

/** اشتقاق تسمية عربية مقروءة من اسم المفتاح */
const KEY_AR_LABELS: Record<string, string> = {
    date: 'تاريخ',
    nextDate: 'موعد قادم',
    firstHearingDate: 'أول مرافعة',
    dueDate: 'موعد الاستحقاق',
    apptDate: 'موعد',
    sessionDate: 'تاريخ الجلسة',
    hearingDate: 'تاريخ الجلسة',
    nextHearingDate: 'الجلسة القادمة',
    nextSessionDate: 'الجلسة القادمة',
    appointmentDate: 'تاريخ الموعد',
    decisionDate: 'تاريخ القرار',
    verdictDate: 'تاريخ الحكم',
    notificationDate: 'تاريخ التبليغ',
    serviceDate: 'تاريخ الإعلان',
    filingDate: 'تاريخ التقديم',
    appealDate: 'تاريخ الطعن',
    reviewDate: 'تاريخ المراجعة',
    stayReviewDate: 'مراجعة إيقاف الدعوى',
    stayEndDate: 'نهاية إيقاف التنفيذ',
    deadlineDate: 'موعد نهائي',
    expiryDate: 'تاريخ الانتهاء',
    reminderDate: 'موعد تذكير',
    signedDate: 'تاريخ التوقيع',
    depositDate: 'تاريخ الإيداع',
    transferDate: 'تاريخ الإحالة',
    consolidationDate: 'تاريخ التوحيد',
    resignationDate: 'تاريخ التنحّي',
    requestDate: 'تاريخ الطلب',
    objectionDate: 'تاريخ الاعتراض',
    paymentDate: 'تاريخ الدفع',
    executionDate: 'تاريخ التنفيذ',
    adjournmentDate: 'تاريخ التأجيل',
    grievanceSessionDate: 'جلسة التظلم',
    grievanceFirstHearingDate: 'أول جلسة تظلم',
    phase2FirstHearingDate: 'أول جلسة المرحلة الثانية',
    statementDate: 'تاريخ الإفادة',
    investigationDate: 'تاريخ التحقيق',
    arrestDate: 'تاريخ التوقيف',
    detentionDate: 'تاريخ الاحتجاز',
    releaseDate: 'تاريخ الإفراج',
};

function humanizeKey(key: string): string {
    if (KEY_AR_LABELS[key]) return KEY_AR_LABELS[key];
    return (
        key
            .replace(/Date$/, '')
            .replace(/Deadline$/, ' (موعد نهائي)')
            .replace(/([A-Z])/g, ' $1')
            .trim() || 'تاريخ'
    );
}

/** يستنتج نوع الحدث من اسم المفتاح */
function inferTypeFromKey(key: string): CalendarEventType {
    if (/[Hh]earing|[Ss]ession|[Tt]rial/.test(key)) return 'hearing';
    if (/[Dd]eadline|[Ee]xpir|[Dd]ue/.test(key)) return 'deadline';
    if (/[Aa]ppt|[Aa]ppointment|[Cc]onsultation/.test(key)) return 'consultation';
    if (/[Ee]xecution|[Ss]eizure/.test(key)) return 'execution';
    return 'custom';
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

/** يبحث عن أفضل عنوان وصفي قريب من حقل التاريخ */
function findContextTitle(parent: Record<string, unknown>, key: string): string {
    const candidates = [
        'title', 'label', 'subject', 'purpose',
        'name', 'description', 'type', 'kind', 'category',
        'note', 'reason', 'detail',
    ];
    for (const c of candidates) {
        const v = parent[c];
        if (typeof v === 'string' && v.trim()) {
            return v.trim().slice(0, 80);
        }
    }
    return humanizeKey(key);
}

function safePath(path: string): string {
    return path.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

/**
 * يمشّط بنية إضبارة كاملة ويُرجع كل تاريخ مكتشف في حقول غير كنسية.
 */
export function discoverImplicitDossierDates(
    file: unknown,
    _module: CalendarSourceModule,
): DiscoveredDate[] {
    if (!isRecord(file)) return [];
    const found: DiscoveredDate[] = [];
    const emitted = new Set<string>(); // لمنع التكرار بنفس bridgeEventId

    function emit(
        pathParts: string[],
        keyInParent: string,
        parent: Record<string, unknown>,
        rawValue: string,
    ): void {
        const path = pathParts.join('.');
        if (CANONICAL_PATH_PATTERNS.some((re) => re.test(path))) return;
        if (!isCalendarRelevantKey(keyInParent)) return;
        const ymd = normalizeDateToYmd(rawValue);
        if (!ymd) return;
        const bridgeEventId = `field_${safePath(path)}`;
        if (emitted.has(bridgeEventId)) return;
        emitted.add(bridgeEventId);
        const title = findContextTitle(parent, keyInParent);
        const pathLabel = humanizeKey(keyInParent);
        found.push({
            bridgeEventId,
            dateYmd: ymd,
            title,
            type: inferTypeFromKey(keyInParent),
            pathLabel,
        });
    }

    function walk(
        node: unknown,
        pathParts: string[],
        parent: Record<string, unknown> | undefined,
        keyInParent: string | undefined,
    ): void {
        if (node === null || node === undefined) return;
        if (node instanceof Date) {
            if (parent && keyInParent && !Number.isNaN(node.getTime())) {
                emit(pathParts, keyInParent, parent, node.toISOString());
            }
            return;
        }
        if (typeof node === 'string') {
            if (parent && keyInParent) emit(pathParts, keyInParent, parent, node);
            return;
        }
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                walk(node[i], [...pathParts, String(i)], undefined, undefined);
            }
            return;
        }
        if (isRecord(node)) {
            for (const [k, v] of Object.entries(node)) {
                if (STRUCTURAL_SKIP_KEYS.has(k)) continue;
                walk(v, [...pathParts, k], node, k);
            }
        }
    }

    walk(file, [], undefined, undefined);
    return found;
}

/** يميّز أحداث التقويم المكتشفة من المكتشف الشامل */
export function isSnifferDiscoveredEventId(sourceEventId: string): boolean {
    return String(sourceEventId ?? '').startsWith('field_');
}
