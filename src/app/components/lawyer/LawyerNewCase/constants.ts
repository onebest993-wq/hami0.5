import { Scale, Gavel, HeartHandshake, Eye, FileText, Hammer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
    id: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
}

export const JURISDICTIONS: JurisdictionItem[] = [
    { id: 'civil', title: 'القضاء المدني', subtitle: 'بداءة، استئناف، عمل، تجارة', icon: Scale, color: '#E6C673' },
    {
        id: 'criminal',
        title: 'القضاء الجزائي',
        subtitle: 'تحقيق، جنح، جنايات، تمييز — الأحداث عبر بطاقة القاصر',
        icon: Gavel,
        color: '#EF4444',
    },
    { id: 'personal', title: 'الأحوال الشخصية', subtitle: 'قانون 2025، قانون 1959', icon: HeartHandshake, color: '#EC4899' },
    { id: 'cassation', title: 'التمييز والتدقيق', subtitle: 'اتحادية، جنايات، استئناف', icon: Eye, color: '#8B5CF6' },
];

// --- LOGIC CONSTANTS ---
export const FIXED_FEE_KEYWORDS = ['مرور', 'مسيل', 'مجرى', 'شرب', 'تعلي', 'سفل', 'شرفات', 'نوافذ', 'حدود', 'جدران', 'استملاك'];
export const LAST_DEGREE_EXCEPTIONS = ['شيوع', 'تخليي'];
export const BLOCKED_WORDS = ['جنح', 'جنايات', 'تحقيق', 'أحوال', 'شرعي', 'شرعية', 'شخصية', 'جزاء', 'جزائية', 'إداري', 'إدارية', 'قضاء موظفين'];
