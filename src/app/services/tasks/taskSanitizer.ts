import type { LegalTask } from '@/app/types/TaskEngine';
import type { SanitizeTaskForPublicResult } from '@/app/types/taskHelpTypes';

const PUBLIC_TITLE_PREFIX = '[طلب مساعدة عامة]';
const REDACTION_TOKEN = '[محذوف]';

/** إزالة بريد / جوال عراقي / أرقام طويلة (هوية أو رقم قضية) */
export function redactPiiText(input: string): string {
    let out = String(input ?? '');

    out = out.replace(
        /([a-zA-Z0-9._%+-]{1,64})@([a-zA-Z0-9.-]{1,253})\.([a-zA-Z]{2,24})/g,
        REDACTION_TOKEN,
    );
    out = out.replace(/(?:\+?964|0)?\s*7\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, REDACTION_TOKEN);
    out = out.replace(/(?:\d[\s-]?){10,16}/g, (m) => {
        const digits = m.replace(/[^\d]/g, '');
        if (digits.length < 10 || digits.length > 16) return m;
        return REDACTION_TOKEN;
    });

    // أنماط شائعة: موكل / المدعي / المدعى عليه + اسم
    out = out.replace(
        /(?:الموكل|موكل|المدعي|المدعى\s*عليه|المدعية)\s*[:：-]?\s*[^\s،,]{2,40}/giu,
        REDACTION_TOKEN,
    );
    out = out.replace(
        /(?:رقم\s*القضية|رقم\s*الإضبارة|قضية\s*رقم)\s*[:：-]?\s*[\d\/\-]+/giu,
        REDACTION_TOKEN,
    );

    return out.replace(/\s{2,}/g, ' ').trim();
}

function buildPublicInstructions(task: LegalTask): string {
    const parts: string[] = [];
    for (const st of task.subTasks ?? []) {
        const t = redactPiiText(st.title);
        if (t) parts.push(`• ${t}`);
    }
    for (const d of task.documentRequirements ?? []) {
        const t = redactPiiText(d.text);
        if (t) parts.push(`• مستند: ${t}`);
    }
    return parts.join('\n');
}

/**
 * تصفية مهمة قبل النشر العام في المنتدى.
 * يحذف بيانات الموكل/القضية/الصوت/المصروفات؛ يحافظ على محكمة وعنوان وتعليمات عامة.
 */
export function sanitizeTaskForPublic(task: LegalTask): SanitizeTaskForPublicResult {
    const cleanedTitle = redactPiiText(task.title || task.rawText || 'مهمة');
    const title = cleanedTitle.startsWith(PUBLIC_TITLE_PREFIX)
        ? cleanedTitle
        : `${PUBLIC_TITLE_PREFIX} ${cleanedTitle}`.trim();
    const location = task.location ? redactPiiText(task.location) || null : null;
    const dueDate = task.parsedDate ? task.parsedDate.toISOString() : null;
    const instructions = buildPublicInstructions(task);
    const rawText = [title, location ? `الموقع: ${location}` : '', instructions]
        .filter(Boolean)
        .join('\n');

    return {
        title,
        rawText,
        location,
        dueDate,
        instructions,
        isSanitised: true,
    };
}
