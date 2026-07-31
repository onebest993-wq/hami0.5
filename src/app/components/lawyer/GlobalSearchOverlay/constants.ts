import {
    FileText,
    User,
    Scale,
    StickyNote,
    Paperclip,
    Hammer,
    Gavel,
    UserCircle,
    Mic,
    Calendar,
    AlertTriangle,
    ListTodo,
    Wallet,
    BookOpen,
    Bell,
    Users,
    type LucideIcon,
} from 'lucide-react';
import type { GlobalSearchCategory } from '@/app/services/globalSearchIndex';

/** معرّف قائمة النتائج (listbox) — يربط حقل الإدخال بالنتائج عبر aria-controls */
export const GLOBAL_SEARCH_LISTBOX_ID = 'global-search-listbox';

/** معرّف خيار نتيجة واحد بحسب ترتيبه المسطّح — لدلالات role="option" */
export function globalSearchOptionId(index: number): string {
    return `global-search-option-${index}`;
}

export const SEARCH_SECTION_ORDER: GlobalSearchCategory[] = [
    'lawsuit',
    'execution',
    'criminal',
    'transaction',
    'urgent',
    'case',
    'party',
    'task',
    'calendar',
    'note',
    'voice',
    'vault',
    'repository',
    'community',
    'threading',
    'finance',
    'notification',
    'profile',
];

export const CATEGORY_META: Record<(typeof SEARCH_SECTION_ORDER)[number], { icon: LucideIcon; color: string }> = {
    lawsuit: { icon: Scale, color: '#E6C673' },
    transaction: { icon: FileText, color: '#38BDF8' },
    execution: { icon: Hammer, color: '#EF4444' },
    criminal: { icon: Gavel, color: '#F97316' },
    note: { icon: StickyNote, color: '#34D399' },
    voice: { icon: Mic, color: '#F472B6' },
    vault: { icon: Paperclip, color: '#C084FC' },
    repository: { icon: BookOpen, color: '#A78BFA' },
    community: { icon: Users, color: '#22D3EE' },
    case: { icon: Scale, color: '#94A3B8' },
    party: { icon: User, color: '#60A5FA' },
    profile: { icon: UserCircle, color: '#FBBF24' },
    task: { icon: ListTodo, color: '#2DD4BF' },
    calendar: { icon: Calendar, color: '#38BDF8' },
    urgent: { icon: AlertTriangle, color: '#FB923C' },
    threading: { icon: FileText, color: '#818CF8' },
    finance: { icon: Wallet, color: '#4ADE80' },
    notification: { icon: Bell, color: '#F59E0B' },
};
