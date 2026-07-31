import {
    HomeScaleIcon,
    HomeFileTextIcon,
    HomeHammerIcon,
    type HomeStemIcon,
} from '@/app/components/lawyer/dashboard/homeStemIcons';

export type {
    JurisdictionId,
    JurisdictionItem,
} from './wordLists';
export {
    JURISDICTIONS,
    FIXED_FEE_KEYWORDS,
    UNIVERSAL_BLOCKED_WORDS,
    CIVIL_ONLY_BLOCKED_WORDS,
    BLOCKED_WORDS,
} from './wordLists';

export interface MainGatewayItem {
    id: 'lawsuit' | 'transaction' | 'execution';
    title: string;
    subtitle: string;
    icon: HomeStemIcon;
    color: string;
    bgGradient: string;
}

export const MAIN_GATEWAY: MainGatewayItem[] = [
    {
        id: 'lawsuit',
        title: 'الدعاوى القضائية',
        subtitle: 'مدني، جزائي، شرعي، إداري...',
        icon: HomeScaleIcon,
        color: '#E6C673',
        bgGradient: 'from-[#E6C673]/20 to-[#B45309]/5',
    },
    {
        id: 'transaction',
        title: 'المعاملات والعقود',
        subtitle: 'كاتب عدل، تسجيل شركات، عقارات',
        icon: HomeFileTextIcon,
        color: '#3B82F6',
        bgGradient: 'from-[#3B82F6]/20 to-[#1D4ED8]/5',
    },
    {
        id: 'execution',
        title: 'الإضبارة التنفيذية',
        subtitle: 'مديريات التنفيذ (دائن/مدين)',
        icon: HomeHammerIcon,
        color: '#EF4444',
        bgGradient: 'from-[#EF4444]/20 to-[#991B1B]/5',
    },
];
