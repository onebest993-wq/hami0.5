import { warmNotepadAndProfile } from '@/app/utils/lazyComponents';
import { warmRepositoryHubOnHover } from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';

/** prefetch chunks فقط */
export function warmNotepadOnHover(_userId?: string | null): void {
    warmRepositoryHubOnHover();
}

/** عند فتح تبويب المفكرة — بيانات الملاحظات/الملف */
export function warmNotepadOnOpen(userId?: string | null): void {
    warmRepositoryHubOnHover();
    warmNotepadAndProfile(userId);
}
