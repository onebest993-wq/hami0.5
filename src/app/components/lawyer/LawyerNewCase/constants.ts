import { Scale, FileText, Hammer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type JurisdictionId = 'civil' | 'criminal' | 'personal';

export interface MainGatewayItem {
    id: 'lawsuit' | 'transaction' | 'execution';
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
    bgGradient: string;
}

export const MAIN_GATEWAY: MainGatewayItem[] = [
    { id: 'lawsuit', title: 'الدعاوى القضائية', subtitle: 'مدني، جزائي، شرعي، إداري...', icon: Scale, color: '#E6C673', bgGradient: 'from-[#E6C673]/20 to-[#B45309]/5' },
    { id: 'transaction', title: 'المعاملات والعقود', subtitle: 'كاتب عدل، تسجيل شركات، عقارات', icon: FileText, color: '#3B82F6', bgGradient: 'from-[#3B82F6]/20 to-[#1D4ED8]/5' },
    { id: 'execution', title: 'الإضبارة التنفيذية', subtitle: 'مديريات التنفيذ (دائن/مدين)', icon: Hammer, color: '#EF4444', bgGradient: 'from-[#EF4444]/20 to-[#991B1B]/5' }
];

export interface JurisdictionItem {
    id: JurisdictionId;
    title: string;
}

export const JURISDICTIONS: JurisdictionItem[] = [
    { id: 'civil', title: 'القضاء المدني' },
    { id: 'criminal', title: 'القضاء الجزائي' },
    { id: 'personal', title: 'الأحوال الشخصية' },
];

// --- LOGIC CONSTANTS ---
export const FIXED_FEE_KEYWORDS = ['مرور', 'مسيل', 'مجرى', 'شرب', 'تعلي', 'سفل', 'شرفات', 'نوافذ', 'حدود', 'جدران', 'استملاك'];

/** كلمات ممنوعة في كل الاختصاصات (عدا الجزائي المنفصل). */
export const UNIVERSAL_BLOCKED_WORDS = ['جنح', 'جنايات', 'تحقيق', 'جزاء', 'جزائية', 'إداري', 'إدارية', 'موظفين', 'قضاء موظفين'];

/** كلمات تُرفض في القضاء المدني فقط — مسموحة في الأحوال الشخصية. */
export const CIVIL_ONLY_BLOCKED_WORDS = ['أحوال', 'شرعي', 'شرعية', 'شخصية'];

export const BLOCKED_WORDS = [...UNIVERSAL_BLOCKED_WORDS, ...CIVIL_ONLY_BLOCKED_WORDS];
