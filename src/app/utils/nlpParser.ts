/**
 * Phase 29–31 — محرك NLP للمهام القانونية: قواعد تطابق عربية صريحة (بدون بيانات وهمية).
 */
import { addDays, startOfLocalDay } from '@/app/utils/localDay';

export { addDays, startOfLocalDay };

export const IRAQI_LEGAL_LOCATIONS = [
    'محكمة الكرخ',
    'محكمة الرصافة',
    'محكمة البداءة',
    'مديرية التنفيذ',
    'محكمة الاحوال',
    'الاستئناف',
] as const;

export type ParsedTaskInput = {
    title: string;
    location: string | null;
    parsedDate: Date | null;
    isFatalDeadline: boolean;
    linkedCaseId: string | null;
};

export function isSameLocalDay(a: Date, b: Date): boolean {
    return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

const LOCATION_RE = /(محكمة|بداءة|تنفيذ|استئناف|تحقيق|جنايات|شرطة)\s([أ-ي]+)/i;
const FATAL_RE = /(حتمي|سقوط حق|اخر يوم|آخر يوم|تمييز|طعن)/i;
const CASE_RE = /(اضبارة|ملف|دعوى)\s([0-9/أ-ي]+)/i;

/**
 * يحلّل نص المهمة وفق أنماط Phase 31؛ الباقي بعد الإزالة يصبح العنوان.
 */
export function parseTaskInput(text: string): ParsedTaskInput {
    const raw = String(text ?? '').normalize('NFC').trim();
    if (!raw) {
        return {
            title: '',
            location: null,
            parsedDate: null,
            isFatalDeadline: false,
            linkedCaseId: null,
        };
    }

    const isFatalDeadline = FATAL_RE.test(raw);

    let parsedDate: Date | null = null;
    if (/(اليوم)/i.test(raw)) {
        parsedDate = startOfLocalDay(new Date());
    } else if (/(باجر|غدا|غداً)/i.test(raw)) {
        parsedDate = addDays(startOfLocalDay(new Date()), 1);
    }

    let work = raw;
    let linkedCaseId: string | null = null;
    const caseMatch = work.match(CASE_RE);
    if (caseMatch) {
        linkedCaseId = `${caseMatch[1]} ${caseMatch[2]}`.trim();
        work = work.replace(caseMatch[0], ' ');
    }

    let location: string | null = null;
    const locMatch = work.match(LOCATION_RE);
    if (locMatch) {
        location = `${locMatch[1]} ${locMatch[2]}`.trim();
        work = work.replace(locMatch[0], ' ');
    }

    work = work
        .replace(/(حتمي|سقوط حق|اخر يوم|آخر يوم|تمييز|طعن)/gi, ' ')
        .replace(/(اليوم|باجر|غدا|غداً)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const title = work || raw;

    return {
        title,
        location,
        parsedDate,
        isFatalDeadline,
        linkedCaseId,
    };
}
