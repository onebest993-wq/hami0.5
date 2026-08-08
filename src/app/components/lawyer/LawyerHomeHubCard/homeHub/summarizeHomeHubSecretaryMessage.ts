import type { SparkNudge } from '@/app/spark/types';

const HUB_SEC_MESSAGE_MAX = 72;

const MODULE_LABEL_BY_KEY: Record<string, string> = {
    execution: 'تنفيذ',
    lawsuit: 'دعوى',
    criminal: 'جزائي',
    field: 'مهمة',
    threading: 'معاملة',
    repository: 'مستودع',
    urgent: 'مستعجل',
};

/** تسميات مسار التاريخ العامة — تُحذف إن تكررت مع اسم الإضبارة */
const GENERIC_DATE_PATH_LABELS = new Set(['تاريخ', 'موعد', 'مهلة', 'جلسة']);

function truncate(text: string, max: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function extractDateLabel(nudge: SparkNudge, message: string): string | null {
    const fromMessage = message.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1];
    if (fromMessage) return fromMessage;
    const fromPresence = nudge.presence?.present
        ?.map((line) => line.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1])
        .find(Boolean);
    return fromPresence ?? null;
}

function resolveModuleLabelFromTarget(nudge: SparkNudge): string | null {
    const raw = nudge.targetFileId?.split(':')[0]?.trim();
    if (!raw) return null;
    return MODULE_LABEL_BY_KEY[raw] ?? raw;
}

function shouldOmitDatePathLabel(pathLabel: string, title: string): boolean {
    const path = pathLabel.trim();
    const caseTitle = title.trim();
    if (!path) return true;
    if (path === caseTitle) return true;
    if (GENERIC_DATE_PATH_LABELS.has(path)) return true;
    return false;
}

function summarizeCalendarUnscheduledMessage(nudge: SparkNudge, message: string): string {
    const compact = message.match(
        /موعد غير مجدول في\s+(.+?)\s+«(.+?)»\s+\((.+?):\s*(\d{2}\/\d{2}\/\d{4})\)/u,
    );
    if (compact) {
        const [, moduleLabel, title, pathLabel, date] = compact;
        const shortTitle = truncate(title, 22);
        if (shouldOmitDatePathLabel(pathLabel, title)) {
            return truncate(`${moduleLabel} «${shortTitle}» — ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
        }
        return truncate(
            `${moduleLabel} «${shortTitle}» — ${pathLabel}: ${date} · غير مجدول`,
            HUB_SEC_MESSAGE_MAX,
        );
    }

    const titled = message.match(/موعد غير مجدول في\s+(.+?)\s+«(.+?)»\s+—\s*(\d{2}\/\d{2}\/\d{4})/u);
    if (titled) {
        const [, moduleLabel, title, date] = titled;
        return truncate(`${moduleLabel} «${truncate(title, 22)}» — ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
    }

    const pathOnly = message.match(/موعد غير مجدول في\s+(.+?)\s+\((.+?):\s*(\d{2}\/\d{2}\/\d{4})\)/u);
    if (pathOnly) {
        const [, moduleLabel, pathLabel, date] = pathOnly;
        return truncate(`${moduleLabel} — ${pathLabel}: ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
    }

    const generic = message.match(/موعد غير مجدول في\s+(.+?)\s+—\s*(\d{2}\/\d{2}\/\d{4})/u);
    if (generic) {
        const [, moduleLabel, date] = generic;
        return truncate(`${moduleLabel} — ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
    }

    const legacy = message.match(
        /تاريخ في\s+(.+?)\s+«(.+?)»\s+\((.+?):\s*(\d{2}\/\d{2}\/\d{4})\)\s+غير مجدول/u,
    );
    if (legacy) {
        const [, moduleLabel, title, pathLabel, date] = legacy;
        const shortTitle = truncate(title, 22);
        if (shouldOmitDatePathLabel(pathLabel, title)) {
            return truncate(`${moduleLabel} «${shortTitle}» — ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
        }
        return truncate(
            `${moduleLabel} «${shortTitle}» — ${pathLabel}: ${date} · غير مجدول`,
            HUB_SEC_MESSAGE_MAX,
        );
    }

    const title = nudge.presence?.present?.[0]?.trim();
    const date = extractDateLabel(nudge, message);
    const moduleLabel = resolveModuleLabelFromTarget(nudge);
    if (title && date && moduleLabel) {
        return truncate(`${moduleLabel} «${truncate(title, 22)}» — ${date} · غير مجدول`, HUB_SEC_MESSAGE_MAX);
    }
    if (title && date) {
        return truncate(`«${truncate(title, 24)}» — ${date} · موعد غير مجدول`, HUB_SEC_MESSAGE_MAX);
    }

    const whenLabel = extractDateLabel(nudge, message);
    return whenLabel ? `موعد غير مجدول في التقويم — ${whenLabel}` : 'موعد غير مجدول في التقويم';
}

function summarizeProceduralAttentionMessage(message: string): string | null {
    const grouped = message.match(
        /يبدو أن\s+(.+?)\s+«(.+?)»\s+—\s+(\d+)\s+متابعات\s+\(([^)]+)\)/u,
    );
    if (grouped) {
        const [, sectionLabel, caseLabel, count, kindLabel] = grouped;
        return truncate(
            `${sectionLabel} «${caseLabel.trim()}» · ${count} · ${kindLabel.trim()}`,
            HUB_SEC_MESSAGE_MAX,
        );
    }

    const single = message.match(/يبدو أن\s+(.+?)\s+تحتاج\s+(.+?)\s+—/u);
    if (single) {
        return truncate(`${single[1].trim()} · ${single[2].trim()}`, HUB_SEC_MESSAGE_MAX);
    }

    return null;
}

/** نسخة مختصرة لبطاقة السكرتير — مختصرة لكن بسياق كافٍ (قسم، إضبارة، تاريخ) */
export function summarizeHomeHubSecretaryMessage(nudge: SparkNudge): string {
    const message = nudge.message.trim();

    if (nudge.kind === 'calendar.unscheduled_dossier_date') {
        return summarizeCalendarUnscheduledMessage(nudge, message);
    }

    if (nudge.kind === 'home.procedural_attention_summary') {
        const procedural = summarizeProceduralAttentionMessage(message);
        if (procedural) return procedural;
    }

    const withoutQuestion = message
        .replace(/\s*—\s*هل\s+[^?]+\?\s*$/u, '')
        .replace(/\s*هل\s+[^?]+\?\s*$/u, '');
    const firstSegment = withoutQuestion.split('—')[0]?.trim() || withoutQuestion;
    return truncate(firstSegment, HUB_SEC_MESSAGE_MAX);
}

/** تسمية مختصرة للزر الأساسي في التخطيط المضغوط */
export function compactHomeHubSecretaryActionLabel(label: string): string {
    const trimmed = label.trim();
    if (/^فتح(\s+الإضبارة)?$/u.test(trimmed)) return 'فتح';
    return truncate(trimmed, 8);
}
