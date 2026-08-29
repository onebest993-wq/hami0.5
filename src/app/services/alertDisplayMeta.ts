import type {
    SecretaryAlert,
    SecretaryAlertTarget,
} from '@/app/services/SecretaryOrchestrator';
import { isInjectedFieldTaskAlert } from '@/app/services/fieldTaskAlerts';
import { isLikelyCaseReference } from '@/app/workspace/pinDisplayUtils';

const FIELD_DAY_SECTION_LABEL = 'مهام اليوم الميدانية';

const FALLBACK_HEADLINE: Partial<Record<SecretaryAlertTarget, string>> = {
    criminal: 'إضبارة جزائية غير معنونة',
    lawsuit: 'إضبارة مدنية غير معنونة',
    execution: 'إضبارة تنفيذ غير معنونة',
    urgent: 'طلب مستعجل غير معنون',
    transactions: 'معاملة ملف غير معنونة',
    threading: 'معاملة إدارية غير معنونة',
    notepad: 'ملاحظة بدون عنوان',
    schedule: 'موعد في التقويم',
};

function isBrokenDisplayValue(value?: string | null): boolean {
    if (value == null) return true;
    const t = String(value).trim();
    if (!t) return true;
    const lower = t.toLowerCase();
    return (
        lower === 'undefined' ||
        lower === 'null' ||
        lower === 'nan' ||
        t === '—' ||
        t === 'موكل غير محدد' ||
        t === 'مدين غير محدد'
    );
}

function sanitizeDisplayText(value?: string | null): string | undefined {
    if (isBrokenDisplayValue(value)) return undefined;
    return String(value).trim();
}

/** وقت نهاية اليوم البرمجي أو 23:59 — لا يُعرض في الشارة */
export function isEndOfDayPlaceholderTime(iso: string): boolean {
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return false;
    const d = new Date(ts);
    return d.getHours() === 23 && d.getMinutes() >= 58;
}

export function isPlaceholderDisplayTime(iso: string): boolean {
    if (isEndOfDayPlaceholderTime(iso)) return true;
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return false;
    const d = new Date(ts);
    return d.getHours() === 23 && d.getMinutes() === 59;
}

const SECTION_KIND_SHORT: Partial<Record<SecretaryAlertTarget, string>> = {
    criminal: 'جزائي',
    lawsuit: 'مدني',
    execution: 'تنفيذ',
    urgent: 'مستعجل',
    transactions: 'معاملات',
    threading: 'إداري',
    notepad: 'مفكرة',
    schedule: 'تقويم',
};

function normalizeArabicForCompare(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

/** محكمة الجنح/الجنايات لا تبقى في «مرحلة التحقيق» */
export function normalizeProceduralPhase(phase: string, courtName?: string): string {
    let p = phase.trim();
    if (!p) return p;
    const court = courtName?.trim() || '';
    const isFelonyCourt = /جنح|جنايات/i.test(court);
    if (isFelonyCourt && /تحقيق/i.test(p)) {
        return 'مرحلة المحاكمة';
    }
    if (isFelonyCourt && /^تحقيق/i.test(p)) {
        return 'مرحلة المحاكمة';
    }
    return p;
}

function dedupePhaseFromCourt(phase: string, courtName?: string): string {
    let p = phase.trim();
    const court = courtName?.trim();
    if (!court || !p) return p;

    const pNorm = normalizeArabicForCompare(p);
    const cNorm = normalizeArabicForCompare(court);
    if (cNorm && pNorm.includes(cNorm)) {
        p = p
            .replace(new RegExp(court.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
            .replace(/^[—–\-\s]+/, '')
            .replace(/\s*[—–-]\s*/g, ' ')
            .trim();
    }

    const dash = p.indexOf('—');
    if (dash > 0) {
        const left = p.slice(0, dash).trim();
        const right = p.slice(dash + 1).trim();
        if (normalizeArabicForCompare(left) === cNorm) return right;
        if (normalizeArabicForCompare(right) === cNorm) return left;
    }

    return p;
}

function rawPhaseFromAlert(alert: SecretaryAlert): string {
    const explicit = sanitizeDisplayText(alert.actionType);
    if (explicit) return explicit;

    const summary = alert.summary?.trim() || '';
    const dash = summary.indexOf('—');
    if (dash >= 0) {
        const action = summary.slice(dash + 1).trim();
        if (action && !isBrokenDisplayValue(action)) return action;
    }
    return sanitizeDisplayText(summary) ?? '';
}

const TARGET_SECTION: Record<SecretaryAlertTarget, { label: string; icon: string }> = {
    schedule: { label: 'التقويم', icon: '📅' },
    lawsuit: { label: 'الدعاوى المدنية', icon: '⚖️' },
    execution: { label: 'التنفيذ', icon: '🔨' },
    criminal: { label: 'الجزائي', icon: '🏛️' },
    urgent: { label: 'المستعجلات', icon: '⚡' },
    transactions: { label: 'معاملات الملف', icon: '📁' },
    threading: { label: 'المعاملات الإدارية', icon: '📋' },
    notepad: { label: 'المستودع الذكي', icon: '📝' },
    community: { label: 'المنتدى القانوني', icon: '💬' },
};

export function sectionMetaForTarget(target: SecretaryAlertTarget): { label: string; icon: string } {
    return TARGET_SECTION[target] ?? { label: 'مساحة العمل', icon: '📌' };
}

export function extractValidCaseRef(alert: SecretaryAlert): string | undefined {
    const direct = alert.caseNumber?.trim();
    if (direct && direct !== '—' && isLikelyCaseReference(direct)) return direct;
    if (direct && direct !== '—') return direct;
    const dash = alert.title.lastIndexOf('—');
    if (dash >= 0) {
        const ref = alert.title.slice(dash + 1).trim();
        if (ref && ref !== '—') return ref;
    }
    return undefined;
}

export function formatAlertDueAt(iso?: string): string | undefined {
    if (!iso) return undefined;
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return undefined;
    const d = new Date(ts);
    const dateOnly = isPlaceholderDisplayTime(iso);

    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            ...(dateOnly
                ? {}
                : { hour: '2-digit' as const, minute: '2-digit' as const }),
        }).format(d);
    } catch {
        return d.toLocaleDateString('ar-IQ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    }
}

/** سطر ثانٍ: [القسم] — [المرحلة] مع منع التكرار والتناقض */
export function buildSectionPhaseLine(alert: SecretaryAlert): string {
    if (isInjectedFieldTaskAlert(alert)) {
        const loc = sanitizeDisplayText(alert.actionType);
        if (loc && loc !== 'مهمة ميدانية' && !loc.includes(FIELD_DAY_SECTION_LABEL)) {
            return `${FIELD_DAY_SECTION_LABEL} — ${loc}`;
        }
        return FIELD_DAY_SECTION_LABEL;
    }

    const section =
        (alert.calendarSource?.module === 'task'
            ? 'مهمة ميدان'
            : SECTION_KIND_SHORT[alert.target]) ??
        sectionMetaForTarget(alert.target).label;

    const court = buildCourtSubtitle(alert);
    let phase = rawPhaseFromAlert(alert);
    phase = dedupePhaseFromCourt(phase, court);
    phase = normalizeProceduralPhase(phase, court);

    if (!phase || isBrokenDisplayValue(phase)) return section;
    const phaseNorm = normalizeArabicForCompare(phase);
    const sectionNorm = normalizeArabicForCompare(section);
    if (phaseNorm === sectionNorm || phaseNorm.startsWith(sectionNorm)) return phase;
    return `${section} — ${phase}`;
}

export function buildFutureTimeLabel(dueIso?: string): string | undefined {
    if (!dueIso) return undefined;
    const dueMs = Date.parse(dueIso);
    if (Number.isNaN(dueMs)) return undefined;
    const hoursLeft = (dueMs - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 0) return undefined;
    if (hoursLeft < 1) return `خلال ${Math.max(1, Math.round(hoursLeft * 60))} دقيقة`;
    if (hoursLeft < 24) return `خلال ${Math.round(hoursLeft)} ساعة`;
    if (hoursLeft < 48) return 'قريباً';
    return `باقي ${Math.round(hoursLeft / 24)} يوم`;
}

/** عنوان رئيسي مع fallbacks حسب القسم */
export function buildAlertHeadline(alert: SecretaryAlert): string {
    const client = sanitizeDisplayText(alert.clientName);
    const caseRef =
        sanitizeDisplayText(alert.caseNumber) ||
        (extractValidCaseRef(alert) ? sanitizeDisplayText(extractValidCaseRef(alert)) : undefined);

    if (client && caseRef) return `${client} — ${caseRef}`;
    if (client) return client;
    if (caseRef) return caseRef;

    const fromTitle = sanitizeDisplayText(alert.title);
    if (
        fromTitle &&
        !isBrokenDisplayValue(fromTitle) &&
        !/\bundefined\b/i.test(fromTitle) &&
        !/\bnull\b/i.test(fromTitle)
    ) {
        return fromTitle;
    }

    return FALLBACK_HEADLINE[alert.target] ?? 'إضبارة غير معنونة';
}

/** اسم المحكمة — سطر فرعي مباشرة تحت العنوان */
export function buildCourtSubtitle(alert: SecretaryAlert): string | undefined {
    const court = sanitizeDisplayText(alert.courtName);
    if (court) return court;
    const summary = alert.summary?.trim() || '';
    const dash = summary.indexOf('—');
    if (dash > 0) {
        const maybeCourt = summary.slice(0, dash).trim();
        if (maybeCourt && maybeCourt !== '—' && !isBrokenDisplayValue(maybeCourt)) {
            return maybeCourt;
        }
    }
    return undefined;
}

export type AlertDisplayMeta = {
    sectionLabel: string;
    sectionIcon: string;
    headline: string;
    /** @deprecated استخدم courtSubtitle — بقي للتوافق */
    subtitle: string;
    courtSubtitle?: string;
    sectionPhaseLine?: string;
    alertReason?: string;
    caseRef?: string;
    dueFormatted?: string;
    clientName?: string;
    courtName?: string;
};

export function buildAlertDisplayMeta(alert: SecretaryAlert): AlertDisplayMeta {
    const caseRef = extractValidCaseRef(alert);
    const clientName = sanitizeDisplayText(alert.clientName);
    const sectionPhaseLine = buildSectionPhaseLine(alert);
    const headline = buildAlertHeadline(alert);

    if (isInjectedFieldTaskAlert(alert)) {
        return {
            sectionLabel: FIELD_DAY_SECTION_LABEL,
            sectionIcon: '📋',
            headline,
            subtitle: FIELD_DAY_SECTION_LABEL,
            courtSubtitle: FIELD_DAY_SECTION_LABEL,
            sectionPhaseLine,
            alertReason: undefined,
            caseRef,
            dueFormatted: formatAlertDueAt(alert.dueAt),
            clientName: clientName && clientName !== caseRef ? clientName : undefined,
            courtName: undefined,
        };
    }

    const section = sectionMetaForTarget(alert.target);
    const courtSubtitle = buildCourtSubtitle(alert);

    return {
        sectionLabel: section.label,
        sectionIcon: section.icon,
        headline,
        subtitle: sectionPhaseLine,
        courtSubtitle,
        sectionPhaseLine,
        alertReason: undefined,
        caseRef,
        dueFormatted: formatAlertDueAt(alert.dueAt),
        clientName: clientName && clientName !== caseRef ? clientName : undefined,
        courtName: courtSubtitle,
    };
}
